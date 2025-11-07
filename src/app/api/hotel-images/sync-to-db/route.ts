import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizeSlug, DIR_PUBLIC, DIR_ORIGINALS, MEDIA_BUCKET } from "@/lib/media-naming";

/**
 * Storage의 이미지들을 select_hotel_media 테이블에 일괄 동기화
 * 기존 레코드는 삭제하고 새로 생성
 */
export async function POST(request: NextRequest) {
  try {
    const { sabreId } = await request.json();

    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: "Sabre ID는 필수입니다." },
        { status: 400 }
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
        { status: 404 }
      );
    }

    if (!hotel.slug) {
      return NextResponse.json(
        { success: false, error: "호텔에 slug가 설정되어 있지 않습니다." },
        { status: 400 }
      );
    }

    const normalizedSlug = normalizeSlug(hotel.slug);
    console.log(`[sync-to-db] 동기화 시작: Sabre ID ${sabreId}, Slug: ${normalizedSlug}`);

    // 경로 정의
    const originalsPaths = [
      `${DIR_ORIGINALS}/${normalizedSlug}`,
      `hotel-images/${sabreId}/originals`
    ];
    const publicPaths = [
      `${DIR_PUBLIC}/${normalizedSlug}`,
      `hotel-images/${sabreId}/public`
    ];

    // 1. 기존 레코드 삭제
    const { error: deleteError } = await supabase
      .from("select_hotel_media")
      .delete()
      .eq("sabre_id", sabreId);

    if (deleteError) {
      console.error("[sync-to-db] 기존 레코드 삭제 오류:", deleteError);
      return NextResponse.json(
        { success: false, error: `기존 레코드 삭제 실패: ${deleteError.message}` },
        { status: 500 }
      );
    }

    console.log(`[sync-to-db] ✓ 기존 레코드 삭제 완료`);

    // 2. Storage에서 이미지 목록 가져오기 (public과 originals 모두 확인)
    const allImages: Array<{
      name: string;
      path: string;
      url: string;
      size?: number;
      contentType?: string;
      folder: 'public' | 'originals';
    }> = [];

    // Public 폴더 이미지 추가
    let foundPublicPath: string | null = null;
    let publicFiles: any[] = [];

    for (const publicPath of publicPaths) {
      const { data: files, error: publicError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .list(publicPath, { limit: 1000 });

      if (!publicError && files && files.length > 0) {
        foundPublicPath = publicPath;
        publicFiles = files;
        console.log(`[sync-to-db] Public 폴더 발견: ${publicPath}, ${files.length}개 파일`);
        break;
      }
    }

    if (foundPublicPath && publicFiles.length > 0) {
        publicFiles.forEach((file) => {
          if (file.name && !file.name.includes('.emptyFolderPlaceholder') && !file.name.startsWith('.')) {
          const fullPath = `${foundPublicPath}/${file.name}`;
            const { data: urlData } = supabase.storage
              .from(MEDIA_BUCKET)
              .getPublicUrl(fullPath);

            allImages.push({
              name: file.name,
              path: fullPath,
              url: urlData.publicUrl,
              size: (file as { metadata?: { size?: number } }).metadata?.size,
              contentType: (file as { metadata?: { mimetype?: string } }).metadata?.mimetype,
              folder: 'public'
            });
          }
        });
    }

    // Originals 폴더 확인 (두 가지 경로)
    for (const originalsPath of originalsPaths) {
      const { data: originalsFiles, error: originalsError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .list(originalsPath, { limit: 1000 });

      if (!originalsError && originalsFiles && originalsFiles.length > 0) {
        console.log(`[sync-to-db] Originals 폴더 발견: ${originalsPath}, ${originalsFiles.length}개 파일`);
        
        originalsFiles.forEach((file) => {
          if (file.name && !file.name.includes('.emptyFolderPlaceholder') && !file.name.startsWith('.')) {
            const fullPath = `${originalsPath}/${file.name}`;
            const { data: urlData } = supabase.storage
              .from(MEDIA_BUCKET)
              .getPublicUrl(fullPath);

            // Public에 없는 파일만 추가 (중복 방지)
            const existsInPublic = allImages.some(img => img.name === file.name);
            if (!existsInPublic) {
              allImages.push({
                name: file.name,
                path: fullPath,
                url: urlData.publicUrl,
                size: (file as { metadata?: { size?: number } }).metadata?.size,
                contentType: (file as { metadata?: { mimetype?: string } }).metadata?.mimetype,
                folder: 'originals'
              });
            }
          }
        });
        break; // 첫 번째로 발견된 경로 사용
      }
    }

    console.log(`[sync-to-db] 총 ${allImages.length}개 이미지 발견`);

    if (allImages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Storage에 이미지가 없습니다." },
        { status: 404 }
      );
    }

    // 3. DB에 레코드 일괄 생성 (파일명에서 seq 추출)
    const records = allImages.map((image) => {
      // 파일명에서 seq 추출
      // 형식: [prefix]_[sabreId]_[seq][_widthw].ext
      // 예: the-upper-house-hong-kong_111923_02_1600w.avif
      let imageSeq: number | null = null
      
      const fileName = image.name
      const seqMatch = fileName.match(/^[a-z0-9-]+_\d+_([0-9]+)(?:_\d+w)?\./)
      
      if (seqMatch && seqMatch[1]) {
        const parsedSeq = parseInt(seqMatch[1], 10)
        if (!isNaN(parsedSeq)) {
          imageSeq = parsedSeq
          console.log(`[sync-to-db] 파일명에서 seq 추출: ${fileName} → seq: ${imageSeq}`)
        }
      }
      
      if (imageSeq === null) {
        console.warn(`[sync-to-db] seq 추출 실패: ${fileName}`)
      }
      
      return {
        sabre_id: sabreId,
        file_name: image.name,
        file_path: image.path,
        storage_path: image.path,
        public_url: image.url,
        file_type: image.contentType || 'image/jpeg',
        file_size: image.size || 0,
        slug: normalizedSlug,
        image_seq: imageSeq,
      }
    });

    const { data: insertedRecords, error: insertError } = await supabase
      .from("select_hotel_media")
      .insert(records)
      .select();

    if (insertError) {
      console.error("[sync-to-db] 레코드 생성 오류:", insertError);
      return NextResponse.json(
        { success: false, error: `레코드 생성 실패: ${insertError.message}` },
        { status: 500 }
      );
    }

    console.log(`[sync-to-db] ✓ ${insertedRecords?.length || 0}개 레코드 생성 완료`);

    // seq가 추출된 이미지 개수 확인
    const seqExtractedCount = records.filter(r => r.image_seq !== null).length
    const seqFailedCount = records.length - seqExtractedCount

    return NextResponse.json({
      success: true,
      data: {
        deleted: "기존 레코드 삭제됨",
        created: insertedRecords?.length || 0,
        seqExtracted: seqExtractedCount,
        seqFailed: seqFailedCount,
        images: allImages.map(img => ({ name: img.name, folder: img.folder }))
      },
      message: `${insertedRecords?.length || 0}개의 이미지 레코드가 동기화되었습니다. (image_seq: ${seqExtractedCount}/${records.length})`
    });
  } catch (error) {
    console.error("[sync-to-db] 동기화 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "이미지 동기화 중 오류가 발생했습니다."
      },
      { status: 500 }
    );
  }
}

