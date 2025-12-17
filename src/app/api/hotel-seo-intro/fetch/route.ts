import { NextRequest, NextResponse } from 'next/server';
import { createServiceRoleClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sabreId = searchParams.get('sabreId');

    if (!sabreId) {
      return NextResponse.json(
        { success: false, error: 'sabreId가 필요합니다.' },
        { status: 400 }
      );
    }

    const supabase = createServiceRoleClient();
    const { data: hotel, error } = await supabase
      .from('select_hotels')
      .select('sabre_id, seo_title, seo_description, seo_keywords, canonical_url')
      .eq('sabre_id', sabreId)
      .single();

    if (error) {
      return NextResponse.json(
        { success: false, error: `호텔 조회 실패: ${error.message}` },
        { status: 500 }
      );
    }

    if (!hotel) {
      return NextResponse.json(
        { success: false, error: '호텔을 찾을 수 없습니다.' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        seoTitle: hotel.seo_title ?? null,
        seoDescription: hotel.seo_description ?? null,
        seoKeywords: hotel.seo_keywords ?? null,
        canonicalUrl: hotel.canonical_url ?? null,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
      },
      { status: 500 }
    );
  }
}

