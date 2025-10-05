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
    const { startId, batchSize = 50, maxId } = body;

    if (typeof startId !== "number" || typeof batchSize !== "number") {
      return NextResponse.json(
        { success: false, error: "startId와 batchSize는 숫자여야 합니다." },
        { status: 400 },
      );
    }

    console.log("전체 마이그레이션 시작:", { startId, batchSize, maxId });

    const supabase = createServiceRoleClient();

    // 버킷 존재 확인 및 생성
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
      totalHotels: 0,
      processedHotels: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      skippedHotels: 0,
    };

    const errors: string[] = [];
    let currentBatch = 1;
    const totalBatches = Math.ceil((maxId - startId + 1) / batchSize);

    // 배치별로 호텔 처리
    for (
      let batchStartId = startId;
      batchStartId <= maxId;
      batchStartId += batchSize
    ) {
      const batchEndId = Math.min(batchStartId + batchSize - 1, maxId);

      console.log(
        `배치 ${currentBatch}/${totalBatches} 처리 중: ID ${batchStartId} ~ ${batchEndId}`,
      );

      try {
        // 현재 배치의 호텔들 조회 (이미지가 있는 호텔만)
        const { data: hotels, error: fetchError } = await supabase
          .from("select_hotels")
          .select(
            "id_old, sabre_id, slug, property_name_ko, property_name_en, image_1, image_2, image_3, image_4, image_5",
          )
          .gte("id_old", batchStartId)
          .lte("id_old", batchEndId)
          .not("id_old", "is", null)
          .or(
            "image_1.not.is.null,image_2.not.is.null,image_3.not.is.null,image_4.not.is.null,image_5.not.is.null",
          );

        if (fetchError) {
          errors.push(
            `배치 ${currentBatch} 호텔 조회 실패: ${fetchError.message}`,
          );
          continue;
        }

        if (!hotels || hotels.length === 0) {
          console.log(`배치 ${currentBatch}: 처리할 호텔이 없습니다.`);
          currentBatch++;
          continue;
        }

        statistics.totalHotels += hotels.length;

        // 각 호텔의 이미지 마이그레이션
        for (const hotel of hotels) {
          try {
            statistics.processedHotels++;

            if (!hotel.slug) {
              statistics.skippedHotels++;
              errors.push(`호텔 ${hotel.sabre_id} 스킵: slug가 없습니다.`);
              continue;
            }

            const hotelSlug = hotel.slug;
            const hotelImages = [
              hotel.image_1,
              hotel.image_2,
              hotel.image_3,
              hotel.image_4,
              hotel.image_5,
            ].filter((url): url is string => Boolean(url && url.trim()));

            if (hotelImages.length === 0) {
              statistics.skippedHotels++;
              continue;
            }

            let hotelSuccess = true;
            const migratedImages: Array<{
              column: string;
              originalUrl: string;
              seq: number;
              uploaded: boolean;
            }> = [];

        // 각 이미지 처리
        for (let i = 0; i < hotelImages.length; i++) {
          try {
            const url = hotelImages[i] as string;
                const seq = i + 1;
                const column = `image_${seq}`;

                // URL에서 파일 확장자 추출
                const urlPath = new URL(url).pathname;
                const ext =
                  (urlPath.split(".").pop()?.toLowerCase() as ImageFormat) ||
                  "jpg";

                // 원본 파일명 생성
                const originalFilename = buildOriginalFilename({
                  hotelSlug,
                  sabreId: hotel.sabre_id || "na",
                  seq,
                  ext,
                });

                // 공개 파일명 생성
                const publicFilename = buildPublicFilename({
                  hotelSlug,
                  sabreId: hotel.sabre_id || "na",
                  seq,
                  width: 1600,
                  format: "avif",
                });

                // 원본 파일 경로
                const originalPath = buildOriginalPath(
                  hotelSlug,
                  originalFilename,
                );

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
                      console.log(
                        `호텔 ${hotel.sabre_id} ${column} 스킵: 동일한 크기`,
                      );
                    }
                  }
                }

                if (shouldUpload) {
                  // URL에서 이미지 다운로드
                  const imageResponse = await fetch(url);
                  if (!imageResponse.ok) {
                    throw new Error(
                      `이미지 다운로드 실패: ${imageResponse.status}`,
                    );
                  }

                  const imageBuffer = await imageResponse.arrayBuffer();
                  const imageBlob = new Blob([imageBuffer], {
                    type:
                      imageResponse.headers.get("content-type") || "image/jpeg",
                  });

                  // 원본 파일 업로드
                  const { error: uploadError } = await supabase.storage
                    .from(MEDIA_BUCKET)
                    .upload(originalPath, imageBlob, {
                      contentType: imageBlob.type,
                      upsert: true,
                    });

                  if (uploadError) {
                    throw new Error(
                      `원본 파일 업로드 실패: ${uploadError.message}`,
                    );
                  }

                  // 공개 버전 생성
                  const publicPath = buildPublicPath(hotelSlug, publicFilename);
                  const { error: publicUploadError } = await supabase.storage
                    .from(MEDIA_BUCKET)
                    .upload(publicPath, imageBlob, {
                      contentType: "image/avif",
                      upsert: true,
                    });

                  if (publicUploadError) {
                    console.warn(
                      `호텔 ${hotel.sabre_id} ${column} 공개 파일 생성 실패: ${publicUploadError.message}`,
                    );
                  }
                }

                migratedImages.push({
                  column,
                  originalUrl: url,
                  seq,
                  uploaded: shouldUpload,
                });
              } catch (imageError) {
                hotelSuccess = false;
                errors.push(
                  `호텔 ${hotel.sabre_id} 이미지 ${i + 1} 처리 실패: ${imageError instanceof Error ? imageError.message : "알 수 없는 오류"}`,
                );
              }
            }

            if (hotelSuccess && migratedImages.length > 0) {
              statistics.successfulMigrations++;
              console.log(
                `호텔 ${hotel.sabre_id} 마이그레이션 성공: ${migratedImages.length}개 이미지`,
              );
            } else {
              statistics.failedMigrations++;
            }
          } catch (hotelError) {
            statistics.failedMigrations++;
            errors.push(
              `호텔 ${hotel.sabre_id} 처리 실패: ${hotelError instanceof Error ? hotelError.message : "알 수 없는 오류"}`,
            );
          }
        }
      } catch (batchError) {
        errors.push(
          `배치 ${currentBatch} 처리 실패: ${batchError instanceof Error ? batchError.message : "알 수 없는 오류"}`,
        );
      }

      currentBatch++;

      // 진행률 업데이트를 위한 응답 (실제로는 클라이언트에서 폴링해야 함)
      if (currentBatch % 5 === 0 || currentBatch === totalBatches) {
        console.log(
          `진행률: ${currentBatch}/${totalBatches} (${((currentBatch / totalBatches) * 100).toFixed(1)}%)`,
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        statistics,
        totalBatches,
        processedBatches: currentBatch - 1,
        errors: errors.slice(0, 100), // 최대 100개 에러만 반환
      },
      message: `전체 마이그레이션 완료: 성공 ${statistics.successfulMigrations}개, 실패 ${statistics.failedMigrations}개, 스킵 ${statistics.skippedHotels}개`,
    });
  } catch (error) {
    console.error("전체 마이그레이션 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "전체 마이그레이션 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 },
    );
  }
}
