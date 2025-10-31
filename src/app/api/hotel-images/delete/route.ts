import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { DIR_ORIGINALS, normalizeSlug } from "@/lib/media-naming";

/**
 * public 파일명에서 originals 파일명 후보 추출
 * public: {slug}_{sabreId}_{seq}_{width}w.{ext}
 * originals: {slug}_{sabreId}_{seq}.{ext}
 * 
 * originals 파일명은 확장자가 다를 수 있으므로, 여러 후보를 반환
 */
function extractOriginalFilenameCandidates(publicFileName: string): string[] {
  const candidates: string[] = [];
  
  // 원본 public 파일명도 후보에 포함 (파일명이 정확히 동일한 경우)
  candidates.push(publicFileName);
  
  // _{width}w 패턴 제거 (예: _1600w.avif -> .avif)
  const withoutWidth = publicFileName.replace(/_\d+w(?=\.)/, '');
  
  // _{width}w가 제거된 경우에만 추가 후보 생성
  if (withoutWidth !== publicFileName) {
    // 확장자 추출
    const extMatch = withoutWidth.match(/\.([^.]+)$/);
    if (extMatch) {
      const baseName = withoutWidth.replace(/\.[^.]+$/, '');
      const publicExt = extMatch[1];
      
      // 후보 1: _{width}w 제거한 파일명 (확장자 그대로)
      candidates.push(withoutWidth);
      
      // 후보 2: jpg 확장자로 변경 (일반적인 originals 확장자)
      if (publicExt !== 'jpg') {
        candidates.push(`${baseName}.jpg`);
      }
    }
  }
  
  // 중복 제거 후 반환
  return [...new Set(candidates)];
}

/**
 * public 경로에서 originals 경로 후보 목록 구성
 */
function buildOriginalsPaths(
  publicPath: string, 
  sabreId: string | null, 
  supabase: ReturnType<typeof createServiceRoleClient>
): Promise<string[]> {
  return new Promise(async (resolve) => {
    const pathParts = publicPath.split('/');
    const paths: string[] = [];
    
    // 경로 형식: public/{slug}/{filename} 또는 hotel-images/{sabre_id}/public/{filename}
    if (pathParts[0] === 'public' && pathParts.length >= 3) {
      const slug = pathParts[1];
      const fileName = pathParts[2];
      const candidates = extractOriginalFilenameCandidates(fileName);
      
      // originals/{slug}/{filename} 형식
      for (const candidate of candidates) {
        paths.push(`${DIR_ORIGINALS}/${slug}/${candidate}`);
      }
      
      // sabreId가 있으면 hotel-images/{sabre_id}/originals/{filename} 형식도 추가
      if (sabreId) {
        for (const candidate of candidates) {
          paths.push(`hotel-images/${sabreId}/${DIR_ORIGINALS}/${candidate}`);
        }
      }
    } else if (pathParts[0] === 'hotel-images' && pathParts.length >= 4 && pathParts[2] === 'public') {
      const sabreId2 = pathParts[1];
      const fileName = pathParts[3];
      const candidates = extractOriginalFilenameCandidates(fileName);
      
      // hotel-images/{sabre_id}/originals/{filename} 형식
      for (const candidate of candidates) {
        paths.push(`hotel-images/${sabreId2}/${DIR_ORIGINALS}/${candidate}`);
      }
      
      // 호텔 정보에서 slug 가져와서 originals/{slug}/{filename} 형식도 추가
      if (sabreId2) {
        const { data: hotel } = await supabase
          .from("select_hotels")
          .select("slug")
          .eq("sabre_id", sabreId2)
          .single();
        
        if (hotel?.slug) {
          const normalizedSlug = normalizeSlug(hotel.slug);
          for (const candidate of candidates) {
            paths.push(`${DIR_ORIGINALS}/${normalizedSlug}/${candidate}`);
          }
        }
      }
    }
    
    // 중복 제거
    resolve([...new Set(paths)]);
  });
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get("filePath");

    if (!filePath) {
      return NextResponse.json(
        { success: false, error: "파일 경로는 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // filePath에서 파일명과 sabreId 추출
    // 지원 형식:
    // 1) hotel-images/{sabre_id}/public/{filename}
    // 2) public/{slug}/{filename}
    const pathParts = filePath.split('/');
    let fileName: string | null = null;
    let sabreId: string | null = null;

    // 파일명은 항상 마지막 부분
    fileName = pathParts[pathParts.length - 1];

    // sabreId 추출 시도
    if (pathParts.length >= 4 && pathParts[0] === 'hotel-images') {
      sabreId = pathParts[1];
    } else if (pathParts.length >= 3 && pathParts[0] === 'public') {
      // public/{slug}/{filename} 형식: 파일명에서 sabreId 추출
      // 파일명 형식: {slug}_{sabreId}_{seq}.ext
      const nameMatch = fileName.match(/_(\d+)_\d{2}\./);
      if (nameMatch) sabreId = nameMatch[1];
    }

    console.log(`[이미지 삭제] 경로: ${filePath}, 파일명: ${fileName}, Sabre ID: ${sabreId || '(추출 실패)'}`);

    const deleteResults: string[] = [];
    const errors: string[] = [];

    // public 폴더의 이미지 삭제: filePath가 public/로 시작하면 그대로 사용, 아니면 재구성
    let publicPath: string | null = null;
    if (filePath.startsWith('public/')) {
      // 클라이언트에서 전달한 경로가 이미 public/{slug}/{filename} 형식
      publicPath = filePath;
    } else if (sabreId && fileName) {
      // hotel-images/{sabre_id}/public/{filename} 형식으로 재구성
      publicPath = `hotel-images/${sabreId}/public/${fileName}`;
    }

    if (publicPath) {
      const { error: publicError } = await supabase.storage
        .from("hotel-media")
        .remove([publicPath]);

      if (publicError) {
        console.error(`Public 삭제 오류 (${publicPath}):`, publicError);
        errors.push(`Public: ${publicError.message}`);
      } else {
        console.log(`✓ Public 삭제 완료: ${publicPath}`);
        deleteResults.push(`Public: ${publicPath}`);
      }
    } else {
      console.warn(`[이미지 삭제] Public 경로를 구성할 수 없음: ${filePath}`);
      errors.push(`Public 경로 구성 실패: ${filePath}`);
    }

    // originals 폴더의 동일 이름 파일 삭제
    if (publicPath) {
      const originalsPathsToTry = await buildOriginalsPaths(publicPath, sabreId, supabase);
      
      if (originalsPathsToTry.length > 0) {
        // 각 경로 시도 (첫 번째 성공한 것만 삭제)
        let originalsDeleted = false;
        for (const pathToTry of originalsPathsToTry) {
          const { error: originalsError } = await supabase.storage
            .from("hotel-media")
            .remove([pathToTry]);

          if (!originalsError) {
            console.log(`✓ Originals 삭제 완료: ${pathToTry}`);
            deleteResults.push(`Originals: ${pathToTry}`);
            originalsDeleted = true;
            break;
          } else {
            // 404 에러는 파일이 없음을 의미하므로 무시
            if (originalsError.statusCode !== '404' && originalsError.status !== 404) {
              console.warn(`Originals 삭제 시도 실패 (${pathToTry}):`, originalsError.message);
            }
          }
        }
        
        if (!originalsDeleted) {
          console.log(`[이미지 삭제] Originals 파일을 찾을 수 없음: ${originalsPathsToTry.join(', ')}`);
        }
      }
    }

    // 4. select_hotel_media 테이블에서 레코드 삭제 (public + originals 경로 모두 대상)
    if (sabreId && fileName && publicPath) {
      // 삭제할 경로 목록 구성
      const pathsToDelete: string[] = [];
      
      // filePath가 public/로 시작하면 그대로 사용, 아니면 재구성된 publicPath 사용
      const deletePath = filePath.startsWith('public/') ? filePath : publicPath;
      pathsToDelete.push(deletePath);
      pathsToDelete.push(filePath);
      
      // originals 경로 후보들도 추가
      if (publicPath) {
        const originalsPathsToTry = await buildOriginalsPaths(publicPath, sabreId, supabase);
        pathsToDelete.push(...originalsPathsToTry);
      }
      
      // 중복 제거
      const uniquePaths = [...new Set(pathsToDelete)];
      
      // 파일명 후보 추출 (public과 originals 파일명 모두)
      const fileNameCandidates = extractOriginalFilenameCandidates(fileName);
      fileNameCandidates.push(fileName); // 원본 파일명도 포함
      const uniqueFileNames = [...new Set(fileNameCandidates)];
      
      // sabre_id와 file_name으로 먼저 필터링 후, 경로 조건 추가
      // 이렇게 하면 더 정확하고 효율적
      const deleteQueries = uniqueFileNames.map(fileNameCandidate => {
        // 각 경로에 대해 쿼리 생성 (최대 5개 경로씩 처리)
        return uniquePaths.slice(0, 5).map(path => {
          return supabase
            .from('select_hotel_media')
            .delete()
            .eq('sabre_id', sabreId)
            .eq('file_name', fileNameCandidate)
            .or(`file_path.eq.${path},storage_path.eq.${path}`);
        });
      }).flat();
      
      // 남은 경로들도 처리 (5개 초과 시)
      if (uniquePaths.length > 5) {
        const remainingPaths = uniquePaths.slice(5);
        remainingPaths.forEach(path => {
          uniqueFileNames.forEach(fileNameCandidate => {
            deleteQueries.push(
              supabase
                .from('select_hotel_media')
                .delete()
                .eq('sabre_id', sabreId)
                .eq('file_name', fileNameCandidate)
                .or(`file_path.eq.${path},storage_path.eq.${path}`)
            );
          });
        });
      }
      
      // 모든 삭제 쿼리 실행
      const deleteResults2 = await Promise.allSettled(deleteQueries);
      
      let dbDeletedCount = 0;
      let dbErrors: string[] = [];
      
      deleteResults2.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          const { error } = result.value;
          if (error) {
            // 404나 없는 레코드는 에러로 처리하지 않음
            if (error.code !== 'PGRST116' && !error.message.includes('No rows')) {
              console.error(`DB 레코드 삭제 오류 (쿼리 ${index + 1}):`, error);
              dbErrors.push(`쿼리 ${index + 1}: ${error.message}`);
            }
          } else {
            dbDeletedCount++;
          }
        } else {
          console.error(`DB 레코드 삭제 실패 (쿼리 ${index + 1}):`, result.reason);
          dbErrors.push(`쿼리 ${index + 1}: ${result.reason}`);
        }
      });
      
      if (dbErrors.length > 0 && dbDeletedCount === 0) {
        // 모든 삭제가 실패한 경우만 에러로 처리
        errors.push(`DB: ${dbErrors.join(', ')}`);
      } else {
        if (dbDeletedCount > 0) {
          console.log(`✓ DB 레코드 삭제 완료 (${dbDeletedCount}개 쿼리 실행, Sabre ID: ${sabreId}, 파일명: ${fileName})`);
          deleteResults.push(`DB: 레코드 삭제`);
        }
        if (dbErrors.length > 0) {
          console.warn(`[이미지 삭제] 일부 DB 레코드 삭제 실패: ${dbErrors.join(', ')}`);
        }
      }
    }

    // 결과 반환
    if (errors.length > 0 && deleteResults.length === 0) {
      // 모든 삭제 작업이 실패한 경우
      return NextResponse.json(
        { 
          success: false, 
          error: `삭제 실패: ${errors.join(', ')}`,
          details: { errors, deleteResults }
        },
        { status: 500 },
      );
    }

    // 일부 성공한 경우
    return NextResponse.json({
      success: true,
      message: "이미지가 삭제되었습니다.",
      details: {
        deleted: deleteResults,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  } catch (error) {
    console.error("이미지 삭제 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: "이미지 삭제 중 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

