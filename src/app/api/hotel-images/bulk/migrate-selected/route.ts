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
    const { sabreIds } = body;

    if (!Array.isArray(sabreIds) || sabreIds.length === 0) {
      return NextResponse.json(
        { success: false, error: "Sabre ID 목록이 필요합니다." },
        { status: 400 }
      );
    }

    console.log(`선택된 ${sabreIds.length}개 호텔 마이그레이션 시작:`, sabreIds);

    const supabase = createServiceRoleClient();

    // 버킷 존재 확인
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some((bucket) => bucket.name === MEDIA_BUCKET);

    if (!bucketExists) {
      const { error: createBucketError } = await supabase.storage.createBucket(
        MEDIA_BUCKET,
        { public: true }
      );

      if (createBucketError) {
        console.error("버킷 생성 오류:", createBucketError);
        return NextResponse.json(
          {
            success: false,
            error: `버킷 생성 실패: ${createBucketError.message}`,
          },
          { status: 500 }
        );
      }
    }

    const statistics = {
      totalHotels: sabreIds.length,
      processedHotels: 0,
      successfulMigrations: 0,
      failedMigrations: 0,
      skippedHotels: 0,
    };

    const errors: string[] = [];
    const failedHotels: Array<{
      sabre_id: string;
      name_ko: string;
      name_en: string;
      error: string;
    }> = [];

    // 선택된 호텔들 조회
    const { data: hotels, error: fetchError } = await supabase
      .from("select_hotels")
      .select(
        "id_old, sabre_id, slug, property_name_ko, property_name_en, image_1, image_2, image_3, image_4, image_5"
      )
      .in("sabre_id", sabreIds);

    if (fetchError) {
      console.error("호텔 조회 오류:", fetchError);
      return NextResponse.json(
        {
          success: false,
          error: `호텔 조회 실패: ${fetchError.message}`,
        },
        { status: 500 }
      );
    }

    if (!hotels || hotels.length === 0) {
      return NextResponse.json(
        { success: false, error: "처리할 호텔이 없습니다." },
        { status: 404 }
      );
    }

    // 각 호텔의 전체 이미지 마이그레이션 (3단계 프로세스)
    for (const hotel of hotels) {
      try {
        statistics.processedHotels++;

        if (!hotel.slug) {
          statistics.skippedHotels++;
          const errorMsg = "slug가 없습니다.";
          errors.push(`호텔 ${hotel.sabre_id} 스킵: ${errorMsg}`);
          failedHotels.push({
            sabre_id: hotel.sabre_id,
            name_ko: hotel.property_name_ko || "",
            name_en: hotel.property_name_en || "",
            error: errorMsg,
          });
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

        // 1단계: Storage 업로드 (image_1 ~ image_5)
        for (let i = 0; i < hotelImages.length; i++) {
          try {
            const url = hotelImages[i] as string;
            const seq = i + 1;

            // URL에서 파일 확장자 추출
            const urlPath = new URL(url).pathname;
            const ext =
              (urlPath.split(".").pop()?.toLowerCase() as ImageFormat) || "jpg";

            const originalFilename = buildOriginalFilename({
              hotelSlug,
              sabreId: hotel.sabre_id || "na",
              seq,
              ext,
            });

            const publicFilename = buildPublicFilename({
              hotelSlug,
              sabreId: hotel.sabre_id || "na",
              seq,
              width: 1600,
              format: "avif",
            });

            const originalPath = buildOriginalPath(hotelSlug, originalFilename);

            // 기존 파일 확인
            const { data: existingOriginal } = await supabase.storage
              .from(MEDIA_BUCKET)
              .download(originalPath);

            let shouldUpload = true;
            if (existingOriginal) {
              const imageResponse = await fetch(url);
              if (imageResponse.ok) {
                const imageBuffer = await imageResponse.arrayBuffer();
                const newSize = imageBuffer.byteLength;

                if (existingOriginal.size === newSize) {
                  shouldUpload = false;
                }
              }
            }

            if (shouldUpload) {
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
              const publicPath = buildPublicPath(hotelSlug, publicFilename);
              const { error: publicUploadError } = await supabase.storage
                .from(MEDIA_BUCKET)
                .upload(publicPath, imageBlob, {
                  contentType: "image/avif",
                  upsert: true,
                });

              if (publicUploadError) {
                console.warn(
                  `호텔 ${hotel.sabre_id} 공개 파일 생성 실패: ${publicUploadError.message}`
                );
              }
            }
          } catch (imageError) {
            hotelSuccess = false;
            errors.push(
              `호텔 ${hotel.sabre_id} 이미지 ${i + 1} 처리 실패: ${imageError instanceof Error ? imageError.message : "알 수 없는 오류"}`
            );
          }
        }

        // 2단계: 본문 이미지 추출 및 마이그레이션
        try {
          const { data: hotelContent, error: contentError } = await supabase
            .from("select_hotels")
            .select("property_details, property_location")
            .eq("sabre_id", hotel.sabre_id)
            .single();

          if (!contentError && hotelContent) {
            const extractImageUrls = (content: string | null) => {
              if (!content) return [];
              const urls: string[] = [];

              const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
              let match;
              while ((match = imgRegex.exec(content)) !== null) {
                const url = match[1].trim();
                if (url && (url.startsWith("http://") || url.startsWith("https://"))) {
                  urls.push(url);
                }
              }

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
                    imgError instanceof Error ? imgError.message : ""
                  );
                }
              }

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
            `호텔 ${hotel.sabre_id} 본문 이미지 마이그레이션 실패`
          );
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

          await supabase
            .from("select_hotels")
            .update({
              image_1: newUrls[0] || null,
              image_2: newUrls[1] || null,
              image_3: newUrls[2] || null,
              image_4: newUrls[3] || null,
              image_5: newUrls[4] || null,
            })
            .eq("sabre_id", hotel.sabre_id);
        } catch (pathError) {
          console.warn(
            `호텔 ${hotel.sabre_id} 경로 마이그레이션 실패`
          );
        }

        if (hotelSuccess) {
          statistics.successfulMigrations++;
          console.log(`호텔 ${hotel.sabre_id} 전체 마이그레이션 성공`);
        } else {
          statistics.failedMigrations++;
        }
      } catch (hotelError) {
        statistics.failedMigrations++;
        const errorMsg = hotelError instanceof Error ? hotelError.message : "알 수 없는 오류";
        errors.push(`호텔 ${hotel.sabre_id} 처리 실패: ${errorMsg}`);
        failedHotels.push({
          sabre_id: hotel.sabre_id,
          name_ko: hotel.property_name_ko || "",
          name_en: hotel.property_name_en || "",
          error: errorMsg,
        });
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        statistics,
        errors: errors.slice(0, 100),
        failedHotels: failedHotels,
      },
      message: `선택된 호텔 마이그레이션 완료!\n성공 ${statistics.successfulMigrations}개, 실패 ${statistics.failedMigrations}개, 스킵 ${statistics.skippedHotels}개`,
    });
  } catch (error) {
    console.error("선택된 호텔 마이그레이션 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "마이그레이션 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 }
    );
  }
}

