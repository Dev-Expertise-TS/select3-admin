import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { 
  normalizeSlug, 
  DIR_PUBLIC, 
  DIR_ORIGINALS, 
  MEDIA_BUCKET,
  buildOriginalFilename,
  type ImageFormat
} from "@/lib/media-naming";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const sabreId = formData.get("sabreId") as string;
    const file = formData.get("file") as File;

    if (!sabreId || !file) {
      return NextResponse.json(
        { success: false, error: "Sabre ID와 파일은 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 호텔 정보 조회
    const { data: hotel, error: hotelError } = await supabase
      .from("select_hotels")
      .select("sabre_id, slug")
      .eq("sabre_id", sabreId)
      .single();

    if (hotelError || !hotel) {
      return NextResponse.json(
        { success: false, error: "호텔 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!hotel.slug) {
      return NextResponse.json(
        { success: false, error: "호텔에 slug가 설정되어 있지 않습니다." },
        { status: 400 },
      );
    }

    // slug 정규화
    const normalizedSlug = normalizeSlug(hotel.slug);
    
    // 기존 이미지 개수 확인하여 seq 번호 결정
    const originalsCheckPath = `${DIR_ORIGINALS}/${normalizedSlug}`;
    const { data: existingFiles } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(originalsCheckPath, { limit: 1000 });
    
    const existingCount = existingFiles?.length || 0;
    const seq = existingCount + 1;
    
    // 파일 확장자 추출 및 정규화
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
    const normalizedExt = (fileExtension === 'jpeg' ? 'jpg' : fileExtension) as ImageFormat;
    
    // 원본 파일명 생성 (규칙: {hotel_slug}_{sabreId}_{seq}.{ext})
    const fileName = buildOriginalFilename({
      hotelSlug: normalizedSlug,
      sabreId: sabreId,
      seq: seq,
      ext: normalizedExt
    });
    
    console.log(`[upload] 생성된 파일명: ${fileName} (seq: ${seq}, 기존 파일: ${existingCount}개)`);

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    const uploadResults: { folder: string; path: string; success: boolean; error?: string }[] = [];

    // 1. Public 폴더에 업로드
    const publicPath = `${DIR_PUBLIC}/${normalizedSlug}/${fileName}`;
    console.log(`[upload] Public 폴더에 업로드 시도: ${publicPath}`);
    
    const { data: publicUploadData, error: publicUploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(publicPath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (publicUploadError) {
      console.error("Public 폴더 업로드 오류:", publicUploadError);
      uploadResults.push({ folder: 'public', path: publicPath, success: false, error: publicUploadError.message });
    } else {
      console.log(`✓ Public 폴더 업로드 완료: ${publicPath}`);
      uploadResults.push({ folder: 'public', path: publicPath, success: true });
    }

    // 2. Originals 폴더에 업로드
    const originalsPath = `${DIR_ORIGINALS}/${normalizedSlug}/${fileName}`;
    console.log(`[upload] Originals 폴더에 업로드 시도: ${originalsPath}`);
    
    const { data: originalsUploadData, error: originalsUploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(originalsPath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (originalsUploadError) {
      console.error("Originals 폴더 업로드 오류:", originalsUploadError);
      uploadResults.push({ folder: 'originals', path: originalsPath, success: false, error: originalsUploadError.message });
    } else {
      console.log(`✓ Originals 폴더 업로드 완료: ${originalsPath}`);
      uploadResults.push({ folder: 'originals', path: originalsPath, success: true });
    }

    // 업로드 결과 확인
    const successfulUploads = uploadResults.filter(r => r.success);
    if (successfulUploads.length === 0) {
      return NextResponse.json(
        { success: false, error: `모든 업로드 실패`, uploadResults },
        { status: 500 },
      );
    }

    // Public URL 생성 (public 폴더 기준)
    const { data: publicUrlData } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(publicPath);

    console.log(`이미지 업로드 완료: ${successfulUploads.length}/${uploadResults.length} 성공`);

    // select_hotel_media 테이블에 레코드 Upsert (public 경로로)
    const mediaRecord = {
      sabre_id: sabreId,
      file_name: fileName,
      file_path: publicPath,
      storage_path: publicUploadData?.path || publicPath,
      public_url: publicUrlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
      slug: normalizedSlug,
    }

    console.log('[hotel-images/upload] Attempting to upsert media record:', mediaRecord)

    // 기존 레코드 확인 (sabre_id + file_path 조합)
    const { data: existing } = await supabase
      .from("select_hotel_media")
      .select("id")
      .eq("sabre_id", sabreId)
      .eq("file_path", publicPath)
      .maybeSingle()

    let upsertData
    let upsertError

    if (existing) {
      // 기존 레코드가 있으면 업데이트
      console.log('[hotel-images/upload] 기존 레코드 발견, 업데이트 진행:', existing.id)
      const { data, error } = await supabase
        .from("select_hotel_media")
        .update({
          file_name: mediaRecord.file_name,
          storage_path: mediaRecord.storage_path,
          public_url: mediaRecord.public_url,
          file_type: mediaRecord.file_type,
          file_size: mediaRecord.file_size,
          slug: mediaRecord.slug,
        })
        .eq("id", existing.id)
        .select()

      upsertData = data
      upsertError = error
    } else {
      // 새 레코드 삽입
      console.log('[hotel-images/upload] 새 레코드 삽입')
      const { data, error } = await supabase
        .from("select_hotel_media")
        .insert(mediaRecord)
        .select()

      upsertData = data
      upsertError = error
    }

    if (upsertError) {
      console.error("[hotel-images/upload] select_hotel_media 레코드 upsert 오류:", upsertError)
      console.error("[hotel-images/upload] Error code:", upsertError.code)
      console.error("[hotel-images/upload] Error details:", upsertError.details)
      console.error("[hotel-images/upload] Error hint:", upsertError.hint)
      // 업로드는 성공했지만 DB 레코드 upsert 실패 - 경고 반환
      return NextResponse.json({
        success: true,
        warning: `이미지는 업로드되었지만 DB 레코드 upsert 실패: ${upsertError.message}`,
        data: {
          fileName: fileName,
          filePath: publicPath,
          url: publicUrlData.publicUrl,
          storagePath: publicUploadData?.path || publicPath,
          uploadResults,
        },
      });
    }

    console.log(`[hotel-images/upload] select_hotel_media 레코드 upsert 완료:`, upsertData)

    return NextResponse.json({
      success: true,
      data: {
        fileName: fileName,
        filePath: publicPath,
        url: publicUrlData.publicUrl,
        storagePath: publicUploadData?.path || publicPath,
        uploadResults,
      },
      message: `이미지가 성공적으로 업로드되었습니다 (${successfulUploads.length}/${uploadResults.length} 성공).`,
    });
  } catch (error) {
    console.error("이미지 업로드 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "이미지 업로드 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

