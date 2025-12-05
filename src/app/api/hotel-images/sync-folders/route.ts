import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/media-naming";

const MEDIA_BUCKET = "hotel-media";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sabreId } = body;

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
      .select("sabre_id, property_name_ko, property_name_en, slug")
      .eq("sabre_id", sabreId)
      .single();

    if (hotelError || !hotel || !hotel.slug) {
      console.error("[sync-folders] 호텔 조회 오류:", hotelError);
      return NextResponse.json(
        { success: false, error: "호텔 정보를 찾을 수 없거나 slug가 없습니다." },
        { status: 404 }
      );
    }

    const normalizedSlug = normalizeSlug(hotel.slug);
    const publicPath = `public/${normalizedSlug}`;
    const originalsPath = `originals/${normalizedSlug}`;

    console.log(`[sync-folders] Sabre ID: ${sabreId}, Slug: ${normalizedSlug}`);

    // 1. Public 폴더의 이미지 목록 가져오기
    const { data: publicFiles, error: publicError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(publicPath, { limit: 1000 });

    if (publicError) {
      console.error("[sync-folders] Public 폴더 조회 오류:", publicError);
    }

    // 2. Originals 폴더의 이미지 목록 가져오기
    const { data: originalsFiles, error: originalsError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list(originalsPath, { limit: 1000 });

    if (originalsError) {
      console.error("[sync-folders] Originals 폴더 조회 오류:", originalsError);
    }

    let copiedToPublic = 0;
    let copiedToOriginals = 0;
    const errors: string[] = [];

    // 3. Originals → Public 복사 (Public에 없는 파일만)
    if (originalsFiles && originalsFiles.length > 0) {
      const publicFileNames = new Set(
        (publicFiles || [])
          .filter(f => f.name && !f.name.includes('.emptyFolderPlaceholder'))
          .map(f => f.name)
      );

      for (const file of originalsFiles) {
        if (!file.name || file.name.includes('.emptyFolderPlaceholder')) continue;
        
        // Public 폴더에 이미 존재하면 건너뛰기
        if (publicFileNames.has(file.name)) {
          console.log(`[sync-folders] 건너뛰기 (이미 존재): ${file.name}`);
          continue;
        }

        try {
          // 파일 다운로드
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(MEDIA_BUCKET)
            .download(`${originalsPath}/${file.name}`);

          if (downloadError || !fileData) {
            errors.push(`다운로드 실패: ${file.name}`);
            continue;
          }

          // Public 폴더에 업로드
          const { error: uploadError } = await supabase.storage
            .from(MEDIA_BUCKET)
            .upload(`${publicPath}/${file.name}`, fileData, {
              contentType: fileData.type,
              upsert: false
            });

          if (uploadError) {
            errors.push(`업로드 실패: ${file.name} - ${uploadError.message}`);
          } else {
            copiedToPublic++;
            console.log(`[sync-folders] ✓ Originals → Public: ${file.name}`);
          }
        } catch (err) {
          errors.push(`복사 오류: ${file.name}`);
          console.error(`[sync-folders] 복사 오류:`, err);
        }
      }
    }

    // 4. Public → Originals 복사 (Originals에 없는 파일만)
    if (publicFiles && publicFiles.length > 0) {
      const originalsFileNames = new Set(
        (originalsFiles || [])
          .filter(f => f.name && !f.name.includes('.emptyFolderPlaceholder'))
          .map(f => f.name)
      );

      for (const file of publicFiles) {
        if (!file.name || file.name.includes('.emptyFolderPlaceholder')) continue;
        
        // Originals 폴더에 이미 존재하면 건너뛰기
        if (originalsFileNames.has(file.name)) {
          console.log(`[sync-folders] 건너뛰기 (이미 존재): ${file.name}`);
          continue;
        }

        try {
          // 파일 다운로드
          const { data: fileData, error: downloadError } = await supabase.storage
            .from(MEDIA_BUCKET)
            .download(`${publicPath}/${file.name}`);

          if (downloadError || !fileData) {
            errors.push(`다운로드 실패: ${file.name}`);
            continue;
          }

          // Originals 폴더에 업로드
          const { error: uploadError } = await supabase.storage
            .from(MEDIA_BUCKET)
            .upload(`${originalsPath}/${file.name}`, fileData, {
              contentType: fileData.type,
              upsert: false
            });

          if (uploadError) {
            errors.push(`업로드 실패: ${file.name} - ${uploadError.message}`);
          } else {
            copiedToOriginals++;
            console.log(`[sync-folders] ✓ Public → Originals: ${file.name}`);
          }
        } catch (err) {
          errors.push(`복사 오류: ${file.name}`);
          console.error(`[sync-folders] 복사 오류:`, err);
        }
      }
    }

    const message = `동기화 완료: Public으로 ${copiedToPublic}개, Originals로 ${copiedToOriginals}개 복사됨`;
    
    console.log(`[sync-folders] ${message}`);
    if (errors.length > 0) {
      console.log(`[sync-folders] 오류 ${errors.length}개:`, errors);
    }

    return NextResponse.json({
      success: true,
      data: {
        message,
        copiedToPublic,
        copiedToOriginals,
        errors: errors.length > 0 ? errors : undefined
      }
    });

  } catch (error) {
    console.error("[sync-folders] 서버 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "폴더 동기화 중 오류가 발생했습니다.",
      },
      { status: 500 }
    );
  }
}

