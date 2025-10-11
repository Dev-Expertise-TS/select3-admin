import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/server";
import { normalizeSlug } from "@/lib/media-naming";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const cityKo = formData.get("cityKo") as string;
    const cityEn = formData.get("cityEn") as string;
    const cityCode = formData.get("cityCode") as string;
    const citySlug = formData.get("citySlug") as string;
    const file = formData.get("file") as File;

    // city_code는 필수!
    if (!cityCode) {
      return NextResponse.json(
        { success: false, error: "도시 코드(city_code)는 필수입니다. 먼저 도시 레코드에 도시 코드를 설정해주세요." },
        { status: 400 },
      );
    }

    if (!file) {
      return NextResponse.json(
        { success: false, error: "파일은 필수입니다." },
        { status: 400 },
      );
    }

    const supabase = createServiceRoleClient();

    // Storage 폴더명: 반드시 city_code 사용 (대문자 그대로)
    const storagePath = `cities/${cityCode}`;

    // 파일명 생성: city_code-timestamp.ext
    const timestamp = Date.now();
    const fileExtension = file.name.split('.').pop();
    const fileName = `${cityCode}-${timestamp}.${fileExtension}`;
    const filePath = `${storagePath}/${fileName}`;

    console.log('[city-images/upload] Storage path:', storagePath);
    console.log('[city-images/upload] File name:', fileName);
    console.log('[city-images/upload] Full path:', filePath);

    // 파일을 ArrayBuffer로 변환
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Supabase Storage에 업로드
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("hotel-media") // hotel-media 버킷 재사용
      .upload(filePath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error("Storage 업로드 오류:", uploadError);
      return NextResponse.json(
        { success: false, error: `업로드 실패: ${uploadError.message}` },
        { status: 500 },
      );
    }

    // Public URL 생성
    const { data: publicUrlData } = supabase.storage
      .from("hotel-media")
      .getPublicUrl(filePath);

    console.log(`도시 이미지 업로드 완료: ${filePath}`);

    // 먼저 테이블의 실제 컬럼 확인
    const { data: schemaTest } = await supabase
      .from("select_city_media")
      .select("*")
      .limit(1);

    const availableColumns = schemaTest && schemaTest.length > 0 ? Object.keys(schemaTest[0]) : [];
    console.log('[city-images/upload] Available columns:', availableColumns);

    // select_city_media 테이블에 레코드 Upsert (사용 가능한 컬럼만)
    const mediaRecord: Record<string, unknown> = {
      file_name: fileName,
      file_path: filePath,
      storage_path: uploadData.path,
      public_url: publicUrlData.publicUrl,
      file_type: file.type,
      file_size: file.size,
    };

    // 선택적 컬럼 추가 (테이블에 있는 경우에만)
    if (availableColumns.includes('city_code')) mediaRecord.city_code = cityCode || null;
    if (availableColumns.includes('city_ko')) mediaRecord.city_ko = cityKo || null;
    if (availableColumns.includes('city_en')) mediaRecord.city_en = cityEn || null;

    console.log('[city-images/upload] Attempting to upsert media record:', mediaRecord);

    // 기존 레코드 확인 (file_path로만 확인)
    const { data: existing } = await supabase
      .from("select_city_media")
      .select("id")
      .eq("file_path", filePath)
      .maybeSingle();

    let upsertData;
    let upsertError;

    if (existing) {
      // 기존 레코드가 있으면 업데이트
      console.log('[city-images/upload] Updating existing record:', existing.id);
      const { data, error } = await supabase
        .from("select_city_media")
        .update({ ...mediaRecord, updated_at: new Date().toISOString() })
        .eq("id", existing.id)
        .select("*")
        .single();
      
      upsertData = data;
      upsertError = error;
    } else {
      // 새 레코드 삽입
      console.log('[city-images/upload] Inserting new record');
      const { data, error } = await supabase
        .from("select_city_media")
        .insert(mediaRecord)
        .select("*")
        .single();
      
      upsertData = data;
      upsertError = error;
    }

    if (upsertError) {
      console.error("DB 레코드 Upsert 오류:", upsertError);
      
      // Storage에서 업로드된 파일 삭제 (롤백)
      await supabase.storage.from("hotel-media").remove([filePath]);
      
      return NextResponse.json(
        { success: false, error: `DB 저장 실패: ${upsertError.message}` },
        { status: 500 },
      );
    }

    console.log('[city-images/upload] Success:', upsertData);

    return NextResponse.json({
      success: true,
      data: upsertData,
      message: "이미지가 성공적으로 업로드되었습니다.",
    });
  } catch (error) {
    console.error("City 이미지 업로드 오류:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "알 수 없는 오류가 발생했습니다.",
      },
      { status: 500 },
    );
  }
}

