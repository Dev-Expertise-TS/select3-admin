import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  MEDIA_BUCKET,
  buildOriginalFilename,
  buildPublicFilename,
  buildOriginalPath,
  buildPublicPath,
  type ImageFormat,
} from "@/lib/media-naming";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sabreId, images } = body;

    if (!sabreId || !images || !Array.isArray(images)) {
      return NextResponse.json(
        { success: false, error: "Sabre ID와 이미지 목록은 필수입니다." },
        { status: 400 },
      );
    }

    console.log("본문 이미지 마이그레이션 요청:", {
      sabreId,
      imageCount: images.length,
    });

    const supabase = createServiceRoleClient();

    // 호텔 정보 조회 (slug 확인)
    const { data: hotel, error: hotelError } = await supabase
      .from("select_hotels")
      .select("sabre_id, slug, image_1, image_2, image_3, image_4, image_5")
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

    // 기존 이미지 수 확인 (다음 순번 결정용)
    const existingImages = [
      hotel.image_1,
      hotel.image_2,
      hotel.image_3,
      hotel.image_4,
      hotel.image_5,
    ].filter((url): url is string => Boolean(url && url.trim()));

    let nextSeq = existingImages.length + 1;

    // 버킷 존재 확인
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(
      (bucket) => bucket.name === MEDIA_BUCKET,
    );

    if (!bucketExists) {
      const { error: createBucketError } = await supabase.storage.createBucket(
        MEDIA_BUCKET,
        {
          public: true,
        },
      );

      if (createBucketError) {
        console.error("버킷 생성 오류:", createBucketError);
        return NextResponse.json(
          {
            success: false,
            error: `버킷 생성 실패: ${createBucketError.message}`,
          },
          { status: 500 },
        );
      }
    }

    const statistics = {
      totalImages: images.length,
      successfulMigrations: 0,
      failedMigrations: 0,
      skippedImages: 0,
    };

    const migratedImages = [];
    const errors = [];

    // 각 이미지 마이그레이션
    for (const imageData of images) {
      try {
        const { url, source } = imageData;

        // URL에서 파일 확장자 추출
        const urlPath = new URL(url).pathname;
        const ext =
          (urlPath.split(".").pop()?.toLowerCase() as ImageFormat) || "jpg";

        // 원본 파일명 생성
        const originalFilename = buildOriginalFilename({
          hotelSlug: hotel.slug,
          sabreId: hotel.sabre_id || "na",
          seq: nextSeq,
          ext,
        });

        // 공개 파일명 생성
        const publicFilename = buildPublicFilename({
          hotelSlug: hotel.slug,
          sabreId: hotel.sabre_id || "na",
          seq: nextSeq,
          width: 1600,
          format: "avif",
        });

        // 원본 파일 경로
        const originalPath = buildOriginalPath(hotel.slug, originalFilename);

        // 기존 파일 존재 여부 확인
        const { data: existingOriginal } = await supabase.storage
          .from(MEDIA_BUCKET)
          .download(originalPath);

        let shouldUpload = true;
        if (existingOriginal) {
          // URL에서 이미지 다운로드하여 크기 비교
          const imageResponse = await fetch(url);
          if (imageResponse.ok) {
            const imageBuffer = await imageResponse.arrayBuffer();
            const newSize = imageBuffer.byteLength;

            if (existingOriginal.size === newSize) {
              shouldUpload = false;
              statistics.skippedImages++;
              console.log(
                `호텔 ${sabreId} 본문 이미지 ${nextSeq} 스킵: 동일한 크기`,
              );
            }
          }
        }

        if (shouldUpload) {
          // URL에서 이미지 다운로드
          const imageResponse = await fetch(url);
          if (!imageResponse.ok) {
            throw new Error(`이미지 다운로드 실패: ${imageResponse.status}`);
          }

          const imageBuffer = await imageResponse.arrayBuffer();
          const imageBlob = new Blob([imageBuffer], {
            type: imageResponse.headers.get("content-type") || "image/jpeg",
          });

          // 원본 파일 업로드
          const { error: uploadError } = await supabase.storage
            .from(MEDIA_BUCKET)
            .upload(originalPath, imageBlob, {
              contentType: imageBlob.type,
              upsert: true,
            });

          if (uploadError) {
            throw new Error(`원본 파일 업로드 실패: ${uploadError.message}`);
          }

          // 공개 버전 생성
          const publicPath = buildPublicPath(hotel.slug, publicFilename);
          const { error: publicUploadError } = await supabase.storage
            .from(MEDIA_BUCKET)
            .upload(publicPath, imageBlob, {
              contentType: "image/avif",
              upsert: true,
            });

          if (publicUploadError) {
            console.warn(
              `호텔 ${sabreId} 본문 이미지 ${nextSeq} 공개 파일 생성 실패: ${publicUploadError.message}`,
            );
          }
        }

        // Supabase Storage 공개 URL 생성
        const publicPath = buildPublicPath(hotel.slug, publicFilename);
        const { data: publicUrlData } = supabase.storage
          .from(MEDIA_BUCKET)
          .getPublicUrl(publicPath);

        migratedImages.push({
          originalUrl: url,
          newUrl: publicUrlData.publicUrl,
          seq: nextSeq,
          source,
          uploaded: shouldUpload,
        });

        if (shouldUpload) {
          statistics.successfulMigrations++;
        }

        nextSeq++;
      } catch (imageError) {
        statistics.failedMigrations++;
        errors.push(
          `이미지 처리 실패 (${imageData.url}): ${imageError instanceof Error ? imageError.message : "알 수 없는 오류"}`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        migratedImages,
        statistics,
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `본문 이미지 마이그레이션 완료: 성공 ${statistics.successfulMigrations}개, 실패 ${statistics.failedMigrations}개, 스킵 ${statistics.skippedImages}개`,
    });
  } catch (error) {
    console.error("본문 이미지 마이그레이션 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "본문 이미지 마이그레이션 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 },
    );
  }
}
