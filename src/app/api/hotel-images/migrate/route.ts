import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  buildOriginalFilename,
  buildPublicFilename,
  buildOriginalPath,
  buildPublicPath,
  MEDIA_BUCKET,
  type ImageRole,
  type ImageFormat,
  type AspectRatioToken,
} from "@/lib/media-naming";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 기본 정보 추출
    const { hotelSlug, sabreId, shotDate, sourceId, images } = body;

    console.log("마이그레이션 요청:", {
      hotelSlug,
      sabreId,
      imageCount: images?.length,
    });

    if (!hotelSlug) {
      return NextResponse.json(
        { success: false, error: "호텔 슬러그는 필수입니다." },
        { status: 400 },
      );
    }

    if (!images || images.length === 0) {
      return NextResponse.json(
        { success: false, error: "마이그레이션할 이미지가 없습니다." },
        { status: 400 },
      );
    }

    // Supabase 클라이언트 생성
    const supabase = createServiceRoleClient();

    // 버킷 존재 확인 및 생성
    const { data: buckets } = await supabase.storage.listBuckets();
    const bucketExists = buckets?.some(
      (bucket) => bucket.name === MEDIA_BUCKET,
    );

    if (!bucketExists) {
      const { error: createError } = await supabase.storage.createBucket(
        MEDIA_BUCKET,
        {
          public: false, // 전체 버킷을 비공개로 설정
          fileSizeLimit: 50 * 1024 * 1024, // 50MB
          allowedMimeTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/avif",
          ],
        },
      );

      if (createError) {
        console.error("버킷 생성 오류:", createError);
        return NextResponse.json(
          { success: false, error: "스토리지 버킷 생성에 실패했습니다." },
          { status: 500 },
        );
      }
    }

    const migratedFiles = [];
    const errors = [];

    // 각 이미지 URL 처리
    for (let i = 0; i < images.length; i++) {
      try {
        const imageData = images[i];
        const { column, url, seq } = imageData;

        // URL에서 파일 확장자 추출
        const urlPath = new URL(url).pathname;
        const ext =
          (urlPath.split(".").pop()?.toLowerCase() as ImageFormat) || "jpg";

        // 원본 파일명 생성
        const originalFilename = buildOriginalFilename({
          hotelSlug,
          sabreId: sabreId || "na",
          seq,
          ext,
        });

        // 공개 파일명 생성 (1600px 기준)
        const publicFilename = buildPublicFilename({
          hotelSlug,
          sabreId: sabreId || "na",
          seq,
          width: 1600,
          format: "avif",
        });

        // 원본 파일 경로
        const originalPath = buildOriginalPath(hotelSlug, originalFilename);

        // 기존 파일 존재 여부 및 크기 확인
        const { data: existingOriginal } = await supabase.storage
          .from(MEDIA_BUCKET)
          .download(originalPath);

        let shouldUpload = true;
        let skipReason = "";

        if (existingOriginal) {
          const existingSize = existingOriginal.size;
          console.log(
            `기존 파일 발견: ${originalPath}, 크기: ${existingSize} bytes`,
          );
        }

        // URL에서 이미지 다운로드
        const imageResponse = await fetch(url);
        if (!imageResponse.ok) {
          errors.push(
            `이미지 다운로드 실패 (${column}): ${imageResponse.status} ${imageResponse.statusText}`,
          );
          continue;
        }

        const imageBuffer = await imageResponse.arrayBuffer();
        const imageBlob = new Blob([imageBuffer], {
          type: imageResponse.headers.get("content-type") || "image/jpeg",
        });
        const newSize = imageBlob.size;

        // 기존 파일과 크기 비교
        if (existingOriginal) {
          const existingSize = existingOriginal.size;
          if (existingSize === newSize) {
            shouldUpload = false;
            skipReason = "동일한 크기의 파일이 이미 존재함";
            console.log(`파일 스킵: ${originalPath} - ${skipReason}`);
          } else {
            skipReason = `크기 차이로 덮어쓰기 (기존: ${existingSize}, 신규: ${newSize})`;
            console.log(`파일 덮어쓰기: ${originalPath} - ${skipReason}`);
          }
        }

        let uploadResult = null;
        if (shouldUpload) {
          // 원본 파일 업로드
          const { data: uploadData, error: uploadError } =
            await supabase.storage
              .from(MEDIA_BUCKET)
              .upload(originalPath, imageBlob, {
                contentType: imageBlob.type,
                upsert: true,
              });

          if (uploadError) {
            errors.push(
              `원본 파일 업로드 실패 (${column}): ${uploadError.message}`,
            );
            continue;
          }
          uploadResult = uploadData;
        }

        // 공개 버전 처리
        const publicPath = buildPublicPath(hotelSlug, publicFilename);
        const { data: existingPublic } = await supabase.storage
          .from(MEDIA_BUCKET)
          .download(publicPath);

        let shouldUploadPublic = true;
        let skipReasonPublic = "";

        if (existingPublic && !shouldUpload) {
          shouldUploadPublic = false;
          skipReasonPublic = "원본과 동일한 크기로 스킵";
        }

        let publicUploadResult = null;
        if (shouldUploadPublic) {
          const { data: publicUploadData, error: publicUploadError } =
            await supabase.storage
              .from(MEDIA_BUCKET)
              .upload(publicPath, imageBlob, {
                contentType: "image/avif",
                upsert: true,
              });

          if (publicUploadError) {
            errors.push(
              `공개 파일 생성 실패 (${column}): ${publicUploadError.message}`,
            );
          } else {
            publicUploadResult = publicUploadData;
          }
        }

        migratedFiles.push({
          column,
          originalUrl: url,
          originalPath,
          publicPath,
          seq,
          filename: originalFilename,
          fileSize: newSize,
          uploaded: shouldUpload,
          skipReason: skipReason || null,
          publicUploaded: shouldUploadPublic,
          publicSkipReason: skipReasonPublic || null,
        });
      } catch (error) {
        errors.push(
          `이미지 처리 중 오류 (${images[i]?.column || "알 수 없음"}): ${error instanceof Error ? error.message : "알 수 없는 오류"}`,
        );
      }
    }

    // 결과 반환
    if (migratedFiles.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: "마이그레이션된 파일이 없습니다.",
          details: errors,
        },
        { status: 500 },
      );
    }

    // 통계 계산
    const uploadedCount = migratedFiles.filter((f) => f.uploaded).length;
    const skippedCount = migratedFiles.filter((f) => !f.uploaded).length;
    const publicUploadedCount = migratedFiles.filter(
      (f) => f.publicUploaded,
    ).length;
    const publicSkippedCount = migratedFiles.filter(
      (f) => !f.publicUploaded,
    ).length;

    return NextResponse.json({
      success: true,
      data: {
        migratedFiles,
        totalImages: images.length,
        successCount: migratedFiles.length,
        errorCount: errors.length,
        statistics: {
          uploadedCount,
          skippedCount,
          publicUploadedCount,
          publicSkippedCount,
        },
        errors: errors.length > 0 ? errors : undefined,
      },
      message: `마이그레이션 완료: 업로드 ${uploadedCount}개, 스킵 ${skippedCount}개 (원본), 업로드 ${publicUploadedCount}개, 스킵 ${publicSkippedCount}개 (공개)`,
    });
  } catch (error) {
    console.error("마이그레이션 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "마이그레이션 처리 중 오류가 발생했습니다.",
        details: error instanceof Error ? error.message : "알 수 없는 오류",
      },
      { status: 500 },
    );
  }
}

// GET 요청으로 마이그레이션 상태 확인
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient();

    // 버킷 정보 조회
    const { data: buckets, error: bucketError } =
      await supabase.storage.listBuckets();

    if (bucketError) {
      return NextResponse.json(
        { success: false, error: "스토리지 정보 조회 실패" },
        { status: 500 },
      );
    }

    const hotelMediaBucket = buckets?.find(
      (bucket) => bucket.name === MEDIA_BUCKET,
    );

    if (!hotelMediaBucket) {
      return NextResponse.json({
        success: true,
        data: {
          bucketExists: false,
          bucketName: MEDIA_BUCKET,
          message: "호텔 미디어 버킷이 생성되지 않았습니다.",
        },
      });
    }

    // 폴더 구조 조회
    const { data: folders, error: folderError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list("", { limit: 100 });

    if (folderError) {
      return NextResponse.json(
        { success: false, error: "폴더 구조 조회 실패" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        bucketExists: true,
        bucketName: MEDIA_BUCKET,
        bucketInfo: hotelMediaBucket,
        folders: folders || [],
        message: "호텔 미디어 버킷이 정상적으로 설정되어 있습니다.",
      },
    });
  } catch (error) {
    console.error("상태 조회 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "상태 조회 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}
