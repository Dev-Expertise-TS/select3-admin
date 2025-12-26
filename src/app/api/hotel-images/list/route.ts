import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/media-naming";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sabreId = searchParams.get("sabreId");

    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: "Sabre ID는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // 호텔 정보 조회
    const { data: hotel, error } = await supabase
      .from("select_hotels")
      .select(
        "sabre_id, property_name_ko, property_name_en, slug",
      )
      .eq("sabre_id", sabreId)
      .single();

    if (error) {
      console.error("호텔 조회 오류:", error);
      return NextResponse.json(
        { success: false, error: "호텔 정보를 찾을 수 없습니다." },
        { status: 404 },
      );
    }

    if (!hotel) {
      return NextResponse.json(
        { success: false, error: "호텔이 존재하지 않습니다." },
        { status: 404 },
      );
    }

    // slug 정규화
    const normalizedSlug = hotel.slug ? normalizeSlug(hotel.slug) : null;
    
    // Supabase Storage에서 실제 파일 목록 가져오기 (public과 originals 둘 다)
    const images: Array<{
      name: string;
      url: string;
      seq: number;
      role?: string;
      size?: number;
      createdAt?: string;
      path: string;
      folder?: string;
    }> = [];

    if (normalizedSlug) {
      // 1. Public 폴더 확인
      const publicPath = `public/${normalizedSlug}`;
      const { data: publicFiles, error: publicError } = await supabase.storage
        .from("hotel-media")
        .list(publicPath, {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });

      if (publicError) {
        console.error("Public 폴더 조회 오류:", publicError);
      } else if (publicFiles && publicFiles.length > 0) {
        publicFiles.forEach((file, index) => {
          if (file.name && !file.name.includes('.emptyFolderPlaceholder') && !file.name.startsWith('.')) {
            const fullPath = `${publicPath}/${file.name}`;
            const { data: publicUrlData } = supabase.storage
              .from("hotel-media")
              .getPublicUrl(fullPath);

            // 파일명에서 정확한 seq 추출
            let seq = 0;
            const seqMatch = file.name.match(/_(\d+)_\d+w\./);
            if (seqMatch) {
              seq = parseInt(seqMatch[1], 10);
            } else {
              const seqMatch2 = file.name.match(/_(\d+)\./);
              if (seqMatch2) {
                seq = parseInt(seqMatch2[1], 10);
              } else {
                seq = index + 1;
              }
            }
            
            const role = file.name.toLowerCase().includes('main') || file.name.toLowerCase().includes('primary') ? 'main' : undefined;

            images.push({
              name: file.name,
              url: publicUrlData.publicUrl,
              seq: seq,
              role: role,
              size: (file as { metadata?: { size?: number } }).metadata?.size,
              createdAt: (file as { created_at?: string }).created_at,
              path: fullPath,
              folder: 'public',
            });
          }
        });
      }

      // 2. Originals 폴더 확인
      const originalsPath = `originals/${normalizedSlug}`;
      const { data: originalsFiles, error: originalsError } = await supabase.storage
        .from("hotel-media")
        .list(originalsPath, {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });

      if (originalsError) {
        console.error("Originals 폴더 조회 오류:", originalsError);
      } else if (originalsFiles && originalsFiles.length > 0) {
        originalsFiles.forEach((file, index) => {
          if (file.name && !file.name.includes('.emptyFolderPlaceholder') && !file.name.startsWith('.')) {
            const fullPath = `${originalsPath}/${file.name}`;
            const { data: publicUrlData } = supabase.storage
              .from("hotel-media")
              .getPublicUrl(fullPath);

            // 파일명에서 정확한 seq 추출
            let seq = 0;
            const seqMatch = file.name.match(/_(\d+)_\d+w\./);
            if (seqMatch) {
              seq = parseInt(seqMatch[1], 10);
            } else {
              const seqMatch2 = file.name.match(/_(\d+)\./);
              if (seqMatch2) {
                seq = parseInt(seqMatch2[1], 10);
              } else {
                seq = images.length + index + 1;
              }
            }
            
            const role = file.name.toLowerCase().includes('main') || file.name.toLowerCase().includes('primary') ? 'main' : undefined;

            images.push({
              name: file.name,
              url: publicUrlData.publicUrl,
              seq: seq,
              role: role,
              size: (file as { metadata?: { size?: number } }).metadata?.size,
              createdAt: (file as { created_at?: string }).created_at,
              path: fullPath,
              folder: 'originals',
            });
          }
        });
      }
      
      // seq 숫자 순서로 정렬
      images.sort((a, b) => a.seq - b.seq);
    }

    console.log(`호텔 ${sabreId} Storage 이미지 조회 결과:`, {
      slug: hotel.slug,
      normalizedSlug,
      totalImages: images.length,
      publicImages: images.filter(img => img.folder === 'public').length,
      originalsImages: images.filter(img => img.folder === 'originals').length,
      imageNames: images.map(img => `${img.folder}/${img.name}`)
    });

    return NextResponse.json({
      success: true,
      data: {
        hotel: {
          sabreId: hotel.sabre_id,
          nameKr: hotel.property_name_ko,
          nameEn: hotel.property_name_en,
          slug: hotel.slug,
          normalizedSlug: normalizedSlug,
        },
        images,
        totalImages: images.length,
        publicImages: images.filter(img => img.folder === 'public').length,
        originalsImages: images.filter(img => img.folder === 'originals').length,
      },
    });
  } catch (error) {
    console.error("호텔 이미지 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "호텔 이미지 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}