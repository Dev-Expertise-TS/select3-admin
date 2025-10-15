import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";

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

    // filePath에서 sabre_id와 파일명 추출
    // 예: "hotel-images/123456/public/image-001.jpg" 또는 "hotel-images/123456/originals/image-001.jpg"
    const pathParts = filePath.split('/');
    let sabreId: string | null = null;
    let fileName: string | null = null;

    // hotel-images/{sabre_id}/{folder}/{filename} 형식 파싱
    if (pathParts.length >= 4 && pathParts[0] === 'hotel-images') {
      sabreId = pathParts[1];
      fileName = pathParts[pathParts.length - 1];
    }

    console.log(`[이미지 삭제] 경로: ${filePath}, Sabre ID: ${sabreId}, 파일명: ${fileName}`);

    const deleteResults: string[] = [];
    const errors: string[] = [];

    // 1. originals 폴더의 이미지 삭제
    if (sabreId && fileName) {
      const originalsPath = `hotel-images/${sabreId}/originals/${fileName}`;
      const { error: originalsError } = await supabase.storage
        .from("hotel-media")
        .remove([originalsPath]);

      if (originalsError) {
        console.error(`Originals 삭제 오류 (${originalsPath}):`, originalsError);
        errors.push(`Originals: ${originalsError.message}`);
      } else {
        console.log(`✓ Originals 삭제 완료: ${originalsPath}`);
        deleteResults.push(`Originals: ${originalsPath}`);
      }
    }

    // 2. public 폴더의 이미지 삭제
    if (sabreId && fileName) {
      const publicPath = `hotel-images/${sabreId}/public/${fileName}`;
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
    }

    // 3. 원래 요청된 경로가 originals나 public이 아닌 경우 해당 경로도 삭제
    if (!filePath.includes('/originals/') && !filePath.includes('/public/')) {
      const { error: originalPathError } = await supabase.storage
        .from("hotel-media")
        .remove([filePath]);

      if (originalPathError) {
        console.error(`원본 경로 삭제 오류 (${filePath}):`, originalPathError);
        errors.push(`원본 경로: ${originalPathError.message}`);
      } else {
        console.log(`✓ 원본 경로 삭제 완료: ${filePath}`);
        deleteResults.push(`원본 경로: ${filePath}`);
      }
    }

    // 4. select_hotel_media 테이블에서 레코드 삭제
    if (sabreId && fileName) {
      // 파일명으로 레코드 찾기 (originals와 public 경로 모두 확인)
      const originalsPath = `hotel-images/${sabreId}/originals/${fileName}`;
      const publicPath = `hotel-images/${sabreId}/public/${fileName}`;

      const { error: dbError } = await supabase
        .from('select_hotel_media')
        .delete()
        .or(`media_url.eq.${originalsPath},media_url.eq.${publicPath},media_url.eq.${filePath}`)
        .eq('sabre_id', sabreId);

      if (dbError) {
        console.error('DB 레코드 삭제 오류:', dbError);
        errors.push(`DB: ${dbError.message}`);
      } else {
        console.log(`✓ DB 레코드 삭제 완료 (Sabre ID: ${sabreId}, 파일명: ${fileName})`);
        deleteResults.push(`DB: 레코드 삭제`);
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

