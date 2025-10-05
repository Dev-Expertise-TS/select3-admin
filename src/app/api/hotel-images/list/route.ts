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

    // Supabase Storage에서 호텔 이미지 조회
    const normalizedSlug = normalizeSlug(hotel.slug || `hotel-${hotel.sabre_id}`);
    const storagePath = `public/${normalizedSlug}/`;
    
    console.log("호텔 정보:", {
      sabreId: hotel.sabre_id,
      slug: hotel.slug,
      normalizedSlug,
      storagePath,
      nameKr: hotel.property_name_ko,
      nameEn: hotel.property_name_en,
    });

    // Supabase Storage에서 파일 목록 조회 (모든 파일 가져오기)
    const { data: files, error: storageError } = await supabase.storage
      .from('hotel-media')
      .list(storagePath, {
        limit: 1000, // 더 많은 파일을 가져올 수 있도록 증가
        offset: 0,
        sortBy: { column: 'name', order: 'asc' }
      });

    if (storageError) {
      console.error("Storage 조회 오류:", storageError);
      return NextResponse.json(
        { success: false, error: "이미지 저장소 조회 중 오류가 발생했습니다." },
        { status: 500 },
      );
    }

    // 이미지 파일만 필터링 (jpg, jpeg, png, webp, avif)
    const imageFiles = (files || []).filter(file => 
      file.name && /\.(jpg|jpeg|png|webp|avif)$/i.test(file.name)
    );

    // 파일 정보를 상세 조회하여 메타데이터 가져오기
    const imageDetails = await Promise.all(
      imageFiles.map(async (file) => {
        try {
          // 파일 메타데이터 조회
          const { data: metadata } = await supabase.storage
            .from('hotel-media')
            .getPublicUrl(`${storagePath}${file.name}`);
          
          return {
            name: file.name,
            url: metadata.publicUrl,
            size: file.metadata?.size || 0,
            lastModified: file.updated_at || file.created_at,
            contentType: file.metadata?.mimetype || 'image/jpeg',
            seq: extractSequenceFromFilename(file.name),
            role: extractRoleFromFilename(file.name),
            isPublic: true,
          };
        } catch (error) {
          console.error(`파일 ${file.name} 메타데이터 조회 오류:`, error);
          return null;
        }
      })
    );

    // null 값 제거 및 정렬
    const validImages = imageDetails
      .filter((img): img is NonNullable<typeof img> => img !== null)
      .sort((a, b) => a.seq - b.seq);

    return NextResponse.json({
      success: true,
      data: {
        hotel: {
          sabreId: hotel.sabre_id,
          nameKr: hotel.property_name_ko,
          nameEn: hotel.property_name_en,
          slug: hotel.slug,
          normalizedSlug,
        },
        images: validImages.map((img, index) => ({
          column: `hotel-media/public/${normalizedSlug}/${img.name}`,
          url: img.url,
          name: img.name,
          size: img.size,
          lastModified: img.lastModified,
          contentType: img.contentType,
          role: img.role,
          seq: img.seq,
          isPublic: img.isPublic,
          storagePath: `hotel-media/public/${normalizedSlug}/`,
        })),
        totalImages: validImages.length,
        storagePath,
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

// 파일명에서 순번 추출 (예: hotel_123_01.jpg -> 1)
function extractSequenceFromFilename(filename: string): number {
  const match = filename.match(/_(\d{2})\./);
  return match ? parseInt(match[1], 10) : 1;
}

// 파일명에서 역할 추출 (예: hotel_123_01_1600w.avif -> 'general')
function extractRoleFromFilename(filename: string): string {
  // 파일명 패턴 분석하여 역할 추정
  const lowerFilename = filename.toLowerCase();
  
  if (lowerFilename.includes('hero')) return 'hero';
  if (lowerFilename.includes('room')) return 'room';
  if (lowerFilename.includes('dining')) return 'dining';
  if (lowerFilename.includes('facility')) return 'facility';
  if (lowerFilename.includes('pool')) return 'pool';
  if (lowerFilename.includes('spa')) return 'spa';
  if (lowerFilename.includes('lobby')) return 'lobby';
  if (lowerFilename.includes('bar')) return 'bar';
  if (lowerFilename.includes('exterior')) return 'exterior';
  
  // 기본값
  return 'general';
}
