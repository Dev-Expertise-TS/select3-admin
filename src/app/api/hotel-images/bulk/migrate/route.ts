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

        // 각 호텔의 이미지 마이그레이션 (3단계 프로세스)
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
            
            // 1단계: 경로 마이그레이션 (image_1 ~ image_5)

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

            // 2단계: 본문 이미지 추출 및 마이그레이션
            try {
              // 호텔의 property_details와 property_location에서 이미지 URL 추출
              const { data: hotelContent, error: contentError } = await supabase
                .from("select_hotels")
                .select("property_details, property_location")
                .eq("sabre_id", hotel.sabre_id)
                .single();

              if (!contentError && hotelContent) {
                const extractImageUrls = (content: string | null) => {
                  if (!content) return [];
                  const urls: string[] = [];
                  
                  // HTML img 태그에서 src 추출
                  const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
                  let match;
                  while ((match = imgRegex.exec(content)) !== null) {
                    const url = match[1].trim();
                    if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
                      urls.push(url);
                    }
                  }
                  
                  // 일반 URL 패턴 추출
                  const urlRegex = /https?:\/\/[^\s<>"']+\.(jpg|jpeg|png|gif|webp|avif)(?:\?[^\s<>"']*)?/gi;
                  while ((match = urlRegex.exec(content)) !== null) {
                    const url = match[0].trim();
                    if (!urls.includes(url)) {
                      urls.push(url);
                    }
                  }
                  
                  return urls;
                };

                const detailsUrls = extractImageUrls(hotelContent.property_details);
                const locationUrls = extractImageUrls(hotelContent.property_location);
                const allContentUrls = [...new Set([...detailsUrls, ...locationUrls])];

                if (allContentUrls.length > 0) {
                  console.log(
                    `호텔 ${hotel.sabre_id} 본문 이미지 ${allContentUrls.length}개 발견`
                  );

                  // 본문 이미지 마이그레이션 (올바른 파일명 생성)
                  let updatedDetails = hotelContent.property_details;
                  let updatedLocation = hotelContent.property_location;
                  let migratedCount = 0;

                  // 기존 이미지 수 확인 (다음 순번 결정용)
                  const existingImages = [
                    hotel.image_1,
                    hotel.image_2,
                    hotel.image_3,
                    hotel.image_4,
                    hotel.image_5,
                  ].filter((url): url is string => Boolean(url && url.trim()));

                  let nextSeq = existingImages.length + 1;

                  for (const oldUrl of allContentUrls) {
                    try {
                      // Storage에 이미지 업로드 및 새 URL 생성
                      const imageResponse = await fetch(oldUrl);
                      if (imageResponse.ok) {
                        const imageBuffer = await imageResponse.arrayBuffer();
                        const imageBlob = new Blob([imageBuffer], {
                          type: imageResponse.headers.get("content-type") || "image/jpeg",
                        });

                        // URL에서 파일 확장자 추출
                        const urlPath = new URL(oldUrl).pathname;
                        const ext = (urlPath.split(".").pop()?.toLowerCase() as ImageFormat) || "jpg";

                        // 원본 파일명 생성
                        const originalFilename = buildOriginalFilename({
                          hotelSlug,
                          sabreId: hotel.sabre_id || "na",
                          seq: nextSeq,
                          ext,
                        });

                        // 공개 파일명 생성
                        const publicFilename = buildPublicFilename({
                          hotelSlug,
                          sabreId: hotel.sabre_id || "na",
                          seq: nextSeq,
                          width: 1600,
                          format: "avif",
                        });

                        // 원본 파일 경로
                        const originalPath = buildOriginalPath(hotelSlug, originalFilename);
                        const publicPath = buildPublicPath(hotelSlug, publicFilename);

                        // 원본 파일 업로드
                        const { error: uploadError } = await supabase.storage
                          .from(MEDIA_BUCKET)
                          .upload(originalPath, imageBlob, {
                            contentType: imageBlob.type,
                            upsert: true,
                          });

                        if (!uploadError) {
                          // 공개 버전 생성
                          await supabase.storage
                            .from(MEDIA_BUCKET)
                            .upload(publicPath, imageBlob, {
                              contentType: "image/avif",
                              upsert: true,
                            });

                          // Supabase Storage 공개 URL 생성
                          const { data: publicUrlData } = supabase.storage
                            .from(MEDIA_BUCKET)
                            .getPublicUrl(publicPath);

                          const newUrl = publicUrlData.publicUrl;
                          
                          // URL 교체
                          if (updatedDetails) {
                            updatedDetails = updatedDetails.replace(
                              new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                              newUrl
                            );
                          }
                          if (updatedLocation) {
                            updatedLocation = updatedLocation.replace(
                              new RegExp(oldUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                              newUrl
                            );
                          }
                          migratedCount++;
                          nextSeq++;

                          console.log(
                            `호텔 ${hotel.sabre_id} 본문 이미지 마이그레이션: ${oldUrl} → ${newUrl}`
                          );
                        }
                      }
                    } catch (imgError) {
                      console.warn(
                        `호텔 ${hotel.sabre_id} 본문 이미지 업로드 실패: ${oldUrl}`,
                        imgError instanceof Error ? imgError.message : "알 수 없는 오류"
                      );
                    }
                  }

                  // DB 업데이트
                  if (migratedCount > 0) {
                    const { error: updateContentError } = await supabase
                      .from("select_hotels")
                      .update({
                        property_details: updatedDetails,
                        property_location: updatedLocation,
                      })
                      .eq("sabre_id", hotel.sabre_id);

                    if (!updateContentError) {
                      console.log(
                        `호텔 ${hotel.sabre_id} 본문 이미지 마이그레이션 완료: ${migratedCount}개`
                      );
                    } else {
                      console.warn(
                        `호텔 ${hotel.sabre_id} 본문 이미지 DB 업데이트 실패:`,
                        updateContentError.message
                      );
                    }
                  }
                }
              }
            } catch (contentError) {
              console.warn(
                `호텔 ${hotel.sabre_id} 본문 이미지 마이그레이션 실패:`,
                contentError instanceof Error ? contentError.message : "알 수 없는 오류"
              );
              // 본문 이미지 실패는 전체 실패로 간주하지 않음
            }

            // 3단계: 경로 마이그레이션 (DB 업데이트)
            try {
              const newUrls: string[] = [];
              for (let i = 0; i < 5; i++) {
                const seq = i + 1;
                const publicFilename = buildPublicFilename({
                  hotelSlug,
                  sabreId: hotel.sabre_id || "na",
                  seq,
                  width: 1600,
                  format: "avif",
                });
                const publicPath = buildPublicPath(hotelSlug, publicFilename);
                const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${MEDIA_BUCKET}/${publicPath}`;
                newUrls.push(publicUrl);
              }

              // DB 업데이트
              const { error: updateError } = await supabase
                .from("select_hotels")
                .update({
                  image_1: newUrls[0] || null,
                  image_2: newUrls[1] || null,
                  image_3: newUrls[2] || null,
                  image_4: newUrls[3] || null,
                  image_5: newUrls[4] || null,
                })
                .eq("sabre_id", hotel.sabre_id);

              if (updateError) {
                console.warn(
                  `호텔 ${hotel.sabre_id} DB 업데이트 실패:`,
                  updateError.message
                );
              }
            } catch (pathError) {
              console.warn(
                `호텔 ${hotel.sabre_id} 경로 마이그레이션 실패:`,
                pathError instanceof Error ? pathError.message : "알 수 없는 오류"
              );
            }

            if (hotelSuccess && migratedImages.length > 0) {
              statistics.successfulMigrations++;
              console.log(
                `호텔 ${hotel.sabre_id} 전체 마이그레이션 성공: ${migratedImages.length}개 이미지`,
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
      message: `전체 마이그레이션 완료!\n경로 마이그레이션: 성공 ${statistics.successfulMigrations}개\n본문 이미지 마이그레이션: 각 호텔별 처리 완료\n실패 ${statistics.failedMigrations}개, 스킵 ${statistics.skippedHotels}개`,
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
