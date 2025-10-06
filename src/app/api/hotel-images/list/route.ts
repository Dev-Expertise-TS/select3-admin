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
        "sabre_id, property_name_ko, property_name_en, slug, image_1, image_2, image_3, image_4, image_5",
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
    const storagePath = normalizedSlug ? `public/${normalizedSlug}` : null;

    // Supabase Storage에서 실제 파일 목록 가져오기
    const images: Array<{
      name: string;
      url: string;
      seq: number;
      role?: string;
      size?: number;
      createdAt?: string;
      path: string;
    }> = [];

    if (storagePath) {
      const { data: files, error: storageError } = await supabase.storage
        .from("hotel-media")
        .list(storagePath, {
          limit: 1000,
          sortBy: { column: "name", order: "asc" },
        });

      if (storageError) {
        console.error("Storage 조회 오류:", storageError);
      } else if (files && files.length > 0) {
        files.forEach((file, index) => {
          if (file.name && !file.name.includes('.emptyFolderPlaceholder')) {
            const { data: publicUrlData } = supabase.storage
              .from("hotel-media")
              .getPublicUrl(`${storagePath}/${file.name}`);

            const seq = parseInt(file.name.match(/(\d+)/)?.[1] || String(index + 1));
            const role = file.name.toLowerCase().includes('main') || file.name.toLowerCase().includes('primary') ? 'main' : undefined;

            images.push({
              name: file.name,
              url: publicUrlData.publicUrl,
              seq: seq,
              role: role,
              size: (file as any).metadata?.size,
              createdAt: (file as any).created_at,
              path: `${storagePath}/${file.name}`,
            });
          }
        });
      }
    }

    console.log(`호텔 ${sabreId} Storage 이미지 조회 결과:`, {
      slug: hotel.slug,
      normalizedSlug,
      storagePath,
      totalImages: images.length,
      imageNames: images.map(img => img.name)
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
        storagePath: storagePath,
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