import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/media-naming";

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

    // slug 정규화 및 경로 생성
    const normalizedSlug = normalizeSlug(hotel.slug);
    const storagePath = `public/${normalizedSlug}`;

    // 파일명 생성 (타임스탬프 추가로 중복 방지)
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${sabreId}-${timestamp}.${fileExtension}`;
    const filePath = `${storagePath}/${fileName}`;

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("hotel-media")
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (uploadError) {
      console.error("Storage 업로드 오류:", uploadError);
      return NextResponse.json(
        { success: false, error: `업로드 실패: ${uploadError.message}` },
        { status: 500 },
      );
    }

    // Public URL 생성
    const { data: publicUrlData } = supabase.storage
      .from("hotel-media")
      .getPublicUrl(filePath);

    console.log(`이미지 업로드 완료: ${filePath}`);

    // select_hotel_media 테이블에 레코드 Upsert
    const mediaRecord = {
      sabre_id: sabreId,
      file_name: fileName,
      file_path: filePath,
      storage_path: uploadData.path,
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
      .eq("file_path", filePath)
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
          filePath: filePath,
          url: publicUrlData.publicUrl,
          storagePath: uploadData.path,
        },
      });
    }

    console.log(`[hotel-images/upload] select_hotel_media 레코드 upsert 완료:`, upsertData)

    return NextResponse.json({
      success: true,
      data: {
        fileName: fileName,
        filePath: filePath,
        url: publicUrlData.publicUrl,
        storagePath: uploadData.path,
      },
      message: "이미지가 성공적으로 업로드되었습니다.",
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

