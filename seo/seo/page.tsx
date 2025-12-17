import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { supabaseServer } from '@/lib/supabase/server';
import { callOpenAI, DEFAULT_CONFIG, getOpenAIApiKey } from '@/config/openai';
import { ArticleSeoManagementForm } from './seo-form';

const initialScanState = { status: 'idle' as const, message: '' };
const initialUpdateState = { status: 'idle' as const, message: '' };

export type ArticleSeoScanState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    page: number;
    perPage: number;
    totalPosts: number | null;
    totalPages: number | null;
    posts: Array<{
      id: string;
      slug: string;
      title: string | null;
      content: string | null;
      seoTitle: string | null;
      seoDescription: string | null;
      seoKeywords: string | null;
      canonicalUrl: string | null;
      publishedAt: string | null;
    }>;
  };
};

export type ArticleSeoGenerateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    postId: string;
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
  };
};

export type ArticleSeoUpdateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    updated: number;
    errors: string[];
  };
};

export type ArticleSeoBulkGenerateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    total: number;
    generated: number;
    skipped: number;
    errors: Array<{ postId: string; error: string }>;
  };
};

export type ArticleCanonicalUrlBulkGenerateState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    total: number;
    generated: number;
    skipped: number;
    errors: Array<{ postId: string; error: string }>;
  };
};

export async function scanArticleSeoAction(
  _prevState: ArticleSeoScanState,
  formData: FormData,
): Promise<ArticleSeoScanState> {
  'use server';

  try {
    const page = Math.max(1, Number.parseInt(String(formData.get('page') ?? '1'), 10) || 1);
    const perPageRaw = Number.parseInt(String(formData.get('perPage') ?? '20'), 10) || 20;
    const perPage = Math.min(50, Math.max(1, perPageRaw));

    const from = (page - 1) * perPage;
    const to = from + perPage - 1;

    // 전체 글 수 조회
    const { count: totalPosts } = await supabaseServer
      .from('allstay_blogs')
      .select('id', { count: 'exact', head: true });

    // 페이지네이션으로 글 목록 조회
    // seo_keywords 컬럼이 있을 수 있으므로 포함 시도
    // 컬럼이 없으면 에러가 발생할 수 있으므로, 에러 발생 시 다시 시도
    let rows: unknown[] | null = null;
    let error: { message: string } | null = null;

    // 먼저 seo_keywords, canonical_url 포함하여 조회 시도 (content도 포함하여 AI 분석에 사용)
    const resultWithAll = await supabaseServer
      .from('allstay_blogs')
      .select('id, slug, title, content, seo_title, seo_description, seo_keywords, canonical_url, published_at')
      .order('published_at', { ascending: false, nullsFirst: false })
      .range(from, to);

    if (resultWithAll.error) {
      // seo_keywords 또는 canonical_url 컬럼이 없을 수 있으므로, 다시 시도
      const resultWithoutOptional = await supabaseServer
        .from('allstay_blogs')
        .select('id, slug, title, content, seo_title, seo_description, canonical_url, published_at')
        .order('published_at', { ascending: false, nullsFirst: false })
        .range(from, to);

      if (resultWithoutOptional.error) {
        // canonical_url도 없을 수 있으므로, 최소 필드만 조회
        const resultMinimal = await supabaseServer
          .from('allstay_blogs')
          .select('id, slug, title, content, seo_title, seo_description, published_at')
          .order('published_at', { ascending: false, nullsFirst: false })
          .range(from, to);

        rows = resultMinimal.data;
        error = resultMinimal.error;
      } else {
        rows = resultWithoutOptional.data;
        error = resultWithoutOptional.error;
      }
    } else {
      rows = resultWithAll.data;
      error = resultWithAll.error;
    }

    if (error) {
      return { status: 'error', message: `글 조회 실패: ${error.message}` };
    }

    const posts =
      rows?.map((row) => {
        const rowData = row as {
          id: string;
          slug: string | null;
          title: string | null;
          content: string | null;
          seo_title: string | null;
          seo_description: string | null;
          published_at: string | null;
          seo_keywords?: string | null; // 선택적 컬럼
          canonical_url?: string | null; // 선택적 컬럼
        };
        return {
          id: String(rowData.id),
          slug: String(rowData.slug ?? '').trim(),
          title: rowData.title ?? null,
          content: rowData.content ?? null,
          seoTitle: rowData.seo_title ?? null,
          seoDescription: rowData.seo_description ?? null,
          seoKeywords: rowData.seo_keywords ?? null,
          canonicalUrl: rowData.canonical_url ?? null,
          publishedAt: rowData.published_at
            ? new Date(rowData.published_at).toISOString().split('T')[0]
            : null,
        };
      }) ?? [];

    const totalPages = typeof totalPosts === 'number' ? Math.ceil(totalPosts / perPage) : null;

    return {
      status: 'success',
      message: `스캔 완료: 전체 ${typeof totalPosts === 'number' ? totalPosts.toLocaleString() : '알 수 없음'}개 • 현재 페이지 ${page}${typeof totalPages === 'number' ? ` / ${totalPages.toLocaleString()}` : ''}`,
      details: {
        page,
        perPage,
        totalPosts: typeof totalPosts === 'number' ? totalPosts : null,
        totalPages,
        posts: posts.filter((p) => Boolean(p.slug)),
      },
    };
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : '스캔 중 알 수 없는 오류가 발생했습니다.' };
  }
}

export async function updateArticleSeoAction(
  _prevState: ArticleSeoUpdateState,
  formData: FormData,
): Promise<ArticleSeoUpdateState> {
  'use server';

  try {
    const postId = String(formData.get('postId') ?? '').trim();
    if (!postId) {
      return { status: 'error', message: '업데이트할 글을 선택해주세요.' };
    }

    const seoTitle = formData.get(`seoTitle_${postId}`)?.toString().trim() || null;
    const seoDescription = formData.get(`seoDescription_${postId}`)?.toString().trim() || null;
    const seoKeywords = formData.get(`seoKeywords_${postId}`)?.toString().trim() || null;
    const canonicalUrl = formData.get(`canonicalUrl_${postId}`)?.toString().trim() || null;

    let updated = 0;
    const errors: string[] = [];

    try {
      const updateData: Record<string, unknown> = {
        seo_title: seoTitle,
        seo_description: seoDescription,
        updated_at: new Date().toISOString(),
      };

      // canonical_url 컬럼이 있는 경우 추가
      if (canonicalUrl !== null) {
        updateData.canonical_url = canonicalUrl;
      }

      // seo_keywords 컬럼이 있는 경우에만 추가
      // 컬럼이 없으면 에러가 발생할 수 있으므로, 별도로 처리
      if (seoKeywords !== null && seoKeywords !== '') {
        updateData.seo_keywords = seoKeywords;
      }

      const { error: updateError } = await supabaseServer
        .from('allstay_blogs')
        .update(updateData)
        .eq('id', postId);

      if (updateError) {
        // seo_keywords 또는 canonical_url 컬럼이 없어서 발생한 에러일 수 있으므로, 다시 시도
        if (
          updateError.message.includes('seo_keywords') ||
          updateError.message.includes('canonical_url') ||
          updateError.message.includes('column')
        ) {
          const updateDataMinimal: Record<string, unknown> = {
            seo_title: seoTitle,
            seo_description: seoDescription,
            updated_at: new Date().toISOString(),
          };
          // canonical_url이 있고 컬럼이 존재하는 경우에만 추가
          if (canonicalUrl !== null) {
            try {
              // canonical_url 컬럼 존재 여부 확인을 위해 별도 업데이트 시도
              updateDataMinimal.canonical_url = canonicalUrl;
            } catch {
              // 컬럼이 없으면 제외
            }
          }
          const { error: retryError } = await supabaseServer
            .from('allstay_blogs')
            .update(updateDataMinimal)
            .eq('id', postId);

          if (retryError) {
            errors.push(`업데이트 실패: ${retryError.message}`);
          } else {
            updated += 1;
          }
        } else {
          errors.push(`업데이트 실패: ${updateError.message}`);
        }
      } else {
        updated += 1;
      }
    } catch (e) {
      errors.push(`처리 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
    }

    const summary = `완료: ${updated}개 업데이트 • 오류 ${errors.length}개`;
    return {
      status: errors.length > 0 ? 'error' : 'success',
      message: summary,
      details: { updated, errors },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'SEO 데이터 업데이트 중 오류가 발생했습니다.',
      details: { updated: 0, errors: [String(error)] },
    };
  }
}

export async function generateArticleSeoAction(
  _prevState: ArticleSeoGenerateState,
  formData: FormData,
): Promise<ArticleSeoGenerateState> {
  'use server';

  try {
    const postId = String(formData.get('postId') ?? '').trim();
    if (!postId) return { status: 'error', message: 'postId가 필요합니다.' };

    // 글 조회 (content 포함)
    const { data: post, error } = await supabaseServer
      .from('allstay_blogs')
      .select('id, slug, title, content, excerpt')
      .eq('id', postId)
      .single();

    if (error || !post) {
      return { status: 'error', message: `글 조회 실패: ${error?.message ?? 'not found'}` };
    }

    const title = String((post as { title: string | null }).title ?? '').trim();
    const content = String((post as { content: string | null }).content ?? '').trim();
    const excerpt = String((post as { excerpt: string | null }).excerpt ?? '').trim();

    if (!content && !title) {
      return { status: 'error', message: '본문이나 제목이 없어 SEO를 생성할 수 없습니다.' };
    }

    // HTML 태그 제거 (간단한 제거)
    const stripHtml = (html: string): string => {
      return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000); // 너무 길면 자름
    };

    const cleanContent = stripHtml(content);
    const articleText = `${title ? `제목: ${title}\n\n` : ''}${excerpt ? `요약: ${excerpt}\n\n` : ''}본문: ${cleanContent}`;

    // AI 프롬프트 생성
    const systemMessage = `당신은 SEO 전문가입니다. 블로그 아티클을 분석하여 검색 사용자의 의도(intent)를 가장 잘 반영한 SEO 메타데이터를 생성해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "seoTitle": "검색 결과에 표시될 제목 (최대 60자, 핵심 키워드 포함)",
  "seoDescription": "검색 결과에 표시될 설명 (400~500자, 아티클의 핵심 내용을 상세하게 설명하고 사용자에게 매력적인 내용을 포함. 아티클의 주요 특징, 장점, 추천 포인트 등을 구체적으로 서술)",
  "seoKeywords": "쉼표로 구분된 키워드 (5-10개, 검색 의도와 관련된 핵심 키워드)"
}

중요: seoDescription은 반드시 400~500자 정도로 충분히 길고 상세하게 작성해주세요. 아티클의 주요 내용, 특징, 장점, 추천 포인트 등을 구체적으로 포함하여 사용자가 클릭하고 싶게 만들어야 합니다.`;

    const userMessage = `다음 블로그 아티클을 분석하여 SEO 메타데이터를 생성해주세요:

${articleText}

위 아티클을 읽고, 이 아티클을 검색하는 사용자의 의도(intent)를 파악하여 가장 효과적인 SEO 제목, 설명, 키워드를 생성해주세요. 특히 seoDescription은 400~500자 정도로 충분히 길고 상세하게 작성하여 아티클의 핵심 내용과 매력을 잘 전달해주세요.`;

    try {
      const apiKey = getOpenAIApiKey();
      const result = await callOpenAI({
        config: {
          ...DEFAULT_CONFIG,
          responseFormat: { type: 'json_object' },
          maxTokens: 1000, // 더 긴 설명을 위해 토큰 수 증가
        },
        systemMessage,
        userMessage,
        apiKey,
        enableWebSearch: false,
      });

      const parsed = JSON.parse(result.content) as {
        seoTitle?: string;
        seoDescription?: string;
        seoKeywords?: string;
      };

      return {
        status: 'success',
        message: 'SEO 메타데이터가 생성되었습니다.',
        details: {
          postId,
          seoTitle: parsed.seoTitle?.trim() ?? null,
          seoDescription: parsed.seoDescription?.trim() ?? null,
          seoKeywords: parsed.seoKeywords?.trim() ?? null,
        },
      };
    } catch (aiError) {
      return {
        status: 'error',
        message: `AI SEO 생성 실패: ${aiError instanceof Error ? aiError.message : '알 수 없는 오류'}`,
      };
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'SEO 생성 중 오류가 발생했습니다.',
    };
  }
}

export async function generateBulkArticleSeoAction(
  _prevState: ArticleSeoBulkGenerateState,
  formData: FormData,
): Promise<ArticleSeoBulkGenerateState> {
  'use server';

  try {
    const postIdsRaw = formData
      .getAll('postIds')
      .map((v) => String(v).trim())
      .filter(Boolean);
    const postIds = Array.from(new Set(postIdsRaw));

    if (postIds.length === 0) {
      return { status: 'error', message: '선택된 글이 없습니다.' };
    }

    // HTML 태그 제거 헬퍼
    const stripHtml = (html: string): string => {
      return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 3000);
    };

    // AI 프롬프트 생성
    const systemMessage = `당신은 SEO 전문가입니다. 블로그 아티클을 분석하여 검색 사용자의 의도(intent)를 가장 잘 반영한 SEO 메타데이터를 생성해주세요.

다음 JSON 형식으로 응답해주세요:
{
  "seoTitle": "검색 결과에 표시될 제목 (최대 60자, 핵심 키워드 포함)",
  "seoDescription": "검색 결과에 표시될 설명 (400~500자, 아티클의 핵심 내용을 상세하게 설명하고 사용자에게 매력적인 내용을 포함. 아티클의 주요 특징, 장점, 추천 포인트 등을 구체적으로 서술)",
  "seoKeywords": "쉼표로 구분된 키워드 (5-10개, 검색 의도와 관련된 핵심 키워드)"
}

중요: seoDescription은 반드시 400~500자 정도로 충분히 길고 상세하게 작성해주세요. 아티클의 주요 내용, 특징, 장점, 추천 포인트 등을 구체적으로 포함하여 사용자가 클릭하고 싶게 만들어야 합니다.`;

    let generated = 0;
    let skipped = 0;
    const errors: Array<{ postId: string; error: string }> = [];

    // 선택된 글들을 조회
    const { data: posts, error: fetchError } = await supabaseServer
      .from('allstay_blogs')
      .select('id, slug, title, content, excerpt')
      .in('id', postIds);

    if (fetchError) {
      return { status: 'error', message: `글 조회 실패: ${fetchError.message}` };
    }

    if (!posts || posts.length === 0) {
      return { status: 'error', message: '선택된 글을 찾을 수 없습니다.' };
    }

    const apiKey = getOpenAIApiKey();

    // 각 글에 대해 순차적으로 AI SEO 생성 및 저장
    for (const post of posts) {
      const postId = String(post.id);
      const title = String((post as { title: string | null }).title ?? '').trim();
      const content = String((post as { content: string | null }).content ?? '').trim();
      const excerpt = String((post as { excerpt: string | null }).excerpt ?? '').trim();

      if (!content && !title) {
        skipped += 1;
        errors.push({ postId, error: '본문이나 제목이 없어 SEO를 생성할 수 없습니다.' });
        continue;
      }

      try {
        const cleanContent = stripHtml(content);
        const articleText = `${title ? `제목: ${title}\n\n` : ''}${excerpt ? `요약: ${excerpt}\n\n` : ''}본문: ${cleanContent}`;

        const userMessage = `다음 블로그 아티클을 분석하여 SEO 메타데이터를 생성해주세요:

${articleText}

위 아티클을 읽고, 이 아티클을 검색하는 사용자의 의도(intent)를 파악하여 가장 효과적인 SEO 제목, 설명, 키워드를 생성해주세요. 특히 seoDescription은 400~500자 정도로 충분히 길고 상세하게 작성하여 아티클의 핵심 내용과 매력을 잘 전달해주세요.`;

        const result = await callOpenAI({
          config: {
            ...DEFAULT_CONFIG,
            responseFormat: { type: 'json_object' },
            maxTokens: 1000,
          },
          systemMessage,
          userMessage,
          apiKey,
          enableWebSearch: false,
        });

        const parsed = JSON.parse(result.content) as {
          seoTitle?: string;
          seoDescription?: string;
          seoKeywords?: string;
        };

        const seoTitle = parsed.seoTitle?.trim() || null;
        const seoDescription = parsed.seoDescription?.trim() || null;
        const seoKeywords = parsed.seoKeywords?.trim() || null;

        // DB에 저장
        const updateData: Record<string, unknown> = {
          seo_title: seoTitle,
          seo_description: seoDescription,
          updated_at: new Date().toISOString(),
        };

        // seo_keywords 컬럼이 있는 경우에만 추가
        if (seoKeywords !== null && seoKeywords !== '') {
          updateData.seo_keywords = seoKeywords;
        }

        const { error: updateError } = await supabaseServer
          .from('allstay_blogs')
          .update(updateData)
          .eq('id', postId);

        if (updateError) {
          // seo_keywords 컬럼이 없어서 발생한 에러일 수 있으므로, 다시 시도 (seo_keywords 제외)
          if (updateError.message.includes('seo_keywords') || updateError.message.includes('column')) {
            const updateDataWithoutKeywords: Record<string, unknown> = {
              seo_title: seoTitle,
              seo_description: seoDescription,
              updated_at: new Date().toISOString(),
            };
            const { error: retryError } = await supabaseServer
              .from('allstay_blogs')
              .update(updateDataWithoutKeywords)
              .eq('id', postId);

            if (retryError) {
              errors.push({ postId, error: `저장 실패: ${retryError.message}` });
              skipped += 1;
            } else {
              generated += 1;
            }
          } else {
            errors.push({ postId, error: `저장 실패: ${updateError.message}` });
            skipped += 1;
          }
        } else {
          generated += 1;
        }
      } catch (aiError) {
        errors.push({
          postId,
          error: `AI SEO 생성 실패: ${aiError instanceof Error ? aiError.message : '알 수 없는 오류'}`,
        });
        skipped += 1;
      }
    }

    const summary = `완료: 총 ${postIds.length}개 중 ${generated}개 생성 • ${skipped}개 스킵 • 오류 ${errors.length}개`;
    return {
      status: errors.length > 0 && generated === 0 ? 'error' : 'success',
      message: summary,
      details: {
        total: postIds.length,
        generated,
        skipped,
        errors: errors.slice(0, 50), // 최대 50개만 표시
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '일괄 SEO 생성 중 오류가 발생했습니다.',
      details: {
        total: 0,
        generated: 0,
        skipped: 0,
        errors: [{ postId: '', error: String(error) }],
      },
    };
  }
}

export async function generateBulkCanonicalUrlAction(
  _prevState: ArticleCanonicalUrlBulkGenerateState,
  formData: FormData,
): Promise<ArticleCanonicalUrlBulkGenerateState> {
  'use server';

  try {
    const postIdsRaw = formData
      .getAll('postIds')
      .map((v) => String(v).trim())
      .filter(Boolean);
    const postIds = Array.from(new Set(postIdsRaw));

    if (postIds.length === 0) {
      return { status: 'error', message: '선택된 글이 없습니다.' };
    }

    // Slug 디코딩 헬퍼 함수
    const decodeSlug = (slug: string): string => {
      try {
        let decoded = slug;
        let prevDecoded = '';
        while (decoded !== prevDecoded) {
          prevDecoded = decoded;
          try {
            decoded = decodeURIComponent(decoded);
          } catch {
            break;
          }
        }
        return decoded;
      } catch {
        return slug;
      }
    };

    let generated = 0;
    let skipped = 0;
    const errors: Array<{ postId: string; error: string }> = [];

    // 선택된 글들을 조회
    const { data: posts, error: fetchError } = await supabaseServer
      .from('allstay_blogs')
      .select('id, slug')
      .in('id', postIds);

    if (fetchError) {
      return { status: 'error', message: `글 조회 실패: ${fetchError.message}` };
    }

    if (!posts || posts.length === 0) {
      return { status: 'error', message: '선택된 글을 찾을 수 없습니다.' };
    }

    const baseUrl = 'https://allstay.com';

    // 각 글에 대해 Canonical URL 생성 및 저장
    for (const post of posts) {
      const postId = String(post.id);
      const slug = String(post.slug ?? '').trim();

      if (!slug) {
        skipped += 1;
        errors.push({ postId, error: 'slug가 없어 Canonical URL을 생성할 수 없습니다.' });
        continue;
      }

      try {
        const decodedSlug = decodeSlug(slug);
        const canonicalUrl = `${baseUrl}/alltrip/post/${decodedSlug}`;

        // DB에 저장
        const updateData: Record<string, unknown> = {
          canonical_url: canonicalUrl,
          updated_at: new Date().toISOString(),
        };

        const { error: updateError } = await supabaseServer
          .from('allstay_blogs')
          .update(updateData)
          .eq('id', postId);

        if (updateError) {
          // canonical_url 컬럼이 없어서 발생한 에러일 수 있음
          if (updateError.message.includes('canonical_url') || updateError.message.includes('column')) {
            errors.push({
              postId,
              error: `canonical_url 컬럼이 없습니다. 데이터베이스에 컬럼을 추가해주세요.`,
            });
            skipped += 1;
          } else {
            errors.push({ postId, error: `저장 실패: ${updateError.message}` });
            skipped += 1;
          }
        } else {
          generated += 1;
        }
      } catch (e) {
        errors.push({
          postId,
          error: `처리 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`,
        });
        skipped += 1;
      }
    }

    const summary = `완료: 총 ${postIds.length}개 중 ${generated}개 생성 • ${skipped}개 스킵 • 오류 ${errors.length}개`;
    return {
      status: errors.length > 0 && generated === 0 ? 'error' : 'success',
      message: summary,
      details: {
        total: postIds.length,
        generated,
        skipped,
        errors: errors.slice(0, 50), // 최대 50개만 표시
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '일괄 Canonical URL 생성 중 오류가 발생했습니다.',
      details: {
        total: 0,
        generated: 0,
        skipped: 0,
        errors: [{ postId: '', error: String(error) }],
      },
    };
  }
}

export type ArticleSeoSlugConvertState = {
  status: 'idle' | 'success' | 'error';
  message: string;
  details?: {
    total: number;
    converted: number;
    skipped: number;
    errors: string[];
    duplicates?: Array<{ slug: string; ids: string[] }>;
  };
};

export async function convertSlugsToKoreanAction(
  _prevState: ArticleSeoSlugConvertState,
  formData: FormData,
): Promise<ArticleSeoSlugConvertState> {
  'use server';

  try {
    const selectedIdsRaw = formData
      .getAll('postIds')
      .map((v) => String(v).trim())
      .filter(Boolean);
    const selectedIds = Array.from(new Set(selectedIdsRaw));
    const selectedIdSet = selectedIds.length > 0 ? new Set(selectedIds) : null;

    // 백업 테이블 생성 (이미 존재하면 스킵)
    // Supabase에서는 CREATE TABLE IF NOT EXISTS를 직접 지원하지 않으므로,
    // 먼저 백업 테이블이 존재하는지 확인 후 생성
    try {
      // 백업 테이블 존재 여부 확인
      const { error: checkError } = await supabaseServer
        .from('allstay_blogs_duplicate_slug_test')
        .select('id')
        .limit(1);

      // 테이블이 없으면 생성 시도 (에러가 발생하면 테이블이 없는 것)
      if (checkError && checkError.code === '42P01') {
        // 테이블이 없으므로 백업 생성
        // Supabase에서는 직접 CREATE TABLE을 실행할 수 없으므로,
        // 모든 데이터를 조회하여 백업 테이블에 삽입하는 방식으로 처리
        // 실제로는 Supabase SQL Editor에서 수동으로 백업 테이블을 생성하는 것을 권장
        console.log('백업 테이블이 없습니다. Supabase SQL Editor에서 다음 SQL을 실행하세요:');
        console.log('CREATE TABLE allstay_blogs_duplicate_slug_test AS SELECT * FROM allstay_blogs;');
      }
    } catch (backupError) {
      // 백업 테이블 확인 실패는 무시하고 계속 진행
      console.warn('백업 테이블 확인 실패:', backupError);
    }

    // 모든 글 조회
    const { data: posts, error } = await supabaseServer
      .from('allstay_blogs')
      .select('id, slug');

    if (error) {
      return { status: 'error', message: `조회 실패: ${error.message}` };
    }

    if (!posts || posts.length === 0) {
      return { status: 'success', message: '변환할 글이 없습니다.' };
    }

    if (selectedIdSet) {
      const foundCount = posts.filter((p) => selectedIdSet.has(String(p.id))).length;
      if (foundCount === 0) {
        return { status: 'error', message: '선택된 글을 찾을 수 없습니다. (목록을 다시 조회해주세요.)' };
      }
    }

    // 디코딩 헬퍼 함수
    const decodeSlug = (slug: string): string => {
      try {
        let decoded = slug;
        let prevDecoded = '';
        // 반복 디코딩 (여러 번 인코딩된 경우 처리)
        while (decoded !== prevDecoded) {
          prevDecoded = decoded;
          try {
            decoded = decodeURIComponent(decoded);
          } catch {
            break;
          }
        }
        return decoded;
      } catch {
        return slug;
      }
    };

    const updates: Array<{ id: string; originalSlug: string; decodedSlug: string }> = [];
    const errors: string[] = [];

    // 1단계: 모든 slug 디코딩 및 변환 대상 수집
    for (const post of posts) {
      if (selectedIdSet && !selectedIdSet.has(String(post.id))) {
        continue;
      }

      const originalSlug = String(post.slug ?? '').trim();
      if (!originalSlug) continue;

      try {
        const decodedSlug = decodeSlug(originalSlug);

        // 디코딩된 값이 원본과 다르면 업데이트 대상
        if (decodedSlug !== originalSlug) {
          updates.push({
            id: String(post.id),
            originalSlug,
            decodedSlug,
          });
        }
      } catch (e) {
        errors.push(`[${post.id}] 변환 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
      }
    }

    if (updates.length === 0) {
      return {
        status: 'success',
        message: selectedIdSet
          ? '선택한 글 중 변환할 slug가 없습니다. (이미 한글이거나 변환 불필요)'
          : '변환할 slug가 없습니다. (이미 한글로 되어 있거나 변환 불필요)',
      };
    }

    // 2단계: 중복 체크
    const slugMap = new Map<string, Array<{ id: string; originalSlug: string }>>();
    updates.forEach(({ id, decodedSlug, originalSlug }) => {
      if (!slugMap.has(decodedSlug)) {
        slugMap.set(decodedSlug, []);
      }
      slugMap.get(decodedSlug)!.push({ id, originalSlug });
    });

    const duplicates = Array.from(slugMap.entries())
      .filter(([_, items]) => items.length > 1)
      .map(([slug, items]) => ({
        slug,
        ids: items.map((item) => item.id),
      }));

    if (duplicates.length > 0) {
      return {
        status: 'error',
        message: `중복 slug 발견: ${duplicates.length}개. 변환을 중단합니다.`,
        details: {
          total: posts.length,
          converted: 0,
          skipped: updates.length,
          errors: [
            ...errors,
            ...duplicates.map((d) => `slug "${d.slug}": ${d.ids.length}개 중복 (IDs: ${d.ids.join(', ')})`),
          ],
          duplicates,
        },
      };
    }

    // 3단계: 기존 slug와의 중복 체크 (디코딩된 slug가 이미 다른 글의 slug로 존재하는지)
    const decodedSlugs = new Set(updates.map((u) => u.decodedSlug));
    const existingSlugs = new Set(
      posts
        .filter((p) => {
          const slug = String(p.slug ?? '').trim();
          return slug && !updates.some((u) => u.id === String(p.id));
        })
        .map((p) => String(p.slug ?? '').trim()),
    );

    const conflicts: string[] = [];
    decodedSlugs.forEach((decodedSlug) => {
      if (existingSlugs.has(decodedSlug)) {
        const conflicting = updates.find((u) => u.decodedSlug === decodedSlug);
        if (conflicting) {
          conflicts.push(`[${conflicting.id}] 변환된 slug "${decodedSlug}"가 이미 다른 글의 slug로 존재합니다.`);
        }
      }
    });

    if (conflicts.length > 0) {
      return {
        status: 'error',
        message: `기존 slug와 충돌: ${conflicts.length}개. 변환을 중단합니다.`,
        details: {
          total: posts.length,
          converted: 0,
          skipped: updates.length,
          errors: [...errors, ...conflicts],
        },
      };
    }

    // 4단계: 일괄 업데이트
    let converted = 0;
    let skipped = 0;

    for (const { id, decodedSlug, originalSlug } of updates) {
      try {
        const { error: updateError } = await supabaseServer
          .from('allstay_blogs')
          .update({ slug: decodedSlug, updated_at: new Date().toISOString() })
          .eq('id', id);

        if (updateError) {
          errors.push(`[${id}] 업데이트 실패 (${originalSlug}): ${updateError.message}`);
          skipped += 1;
        } else {
          converted += 1;
        }
      } catch (e) {
        errors.push(`[${id}] 처리 실패: ${e instanceof Error ? e.message : '알 수 없는 오류'}`);
        skipped += 1;
      }
    }

    const targetTotal = selectedIdSet ? selectedIds.length : posts.length;
    const summary = selectedIdSet
      ? `완료(선택 변환): 선택 ${targetTotal}개 중 ${converted}개 변환 • ${skipped}개 스킵 • 오류 ${errors.length}개`
      : `완료: 총 ${targetTotal}개 중 ${converted}개 변환 • ${skipped}개 스킵 • 오류 ${errors.length}개`;
    return {
      status: errors.length > 0 ? 'error' : 'success',
      message: summary,
      details: {
        total: targetTotal,
        converted,
        skipped,
        errors: errors.slice(0, 50), // 최대 50개만 표시
      },
    };
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '변환 중 오류가 발생했습니다.',
      details: {
        total: 0,
        converted: 0,
        skipped: 0,
        errors: [String(error)],
      },
    };
  }
}

export default function ArticleSeoPage() {
  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>아티클 SEO 관리</CardTitle>
            <CardDescription>
              `allstay_blogs` 테이블의 글에 대한 SEO 메타데이터(제목, 설명, 키워드, Canonical URL)를 관리합니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>
              - <span className="font-medium text-foreground">블로그 제목 (title)</span>: 블로그 글의 실제 제목
            </p>
            <p>
              - <span className="font-medium text-foreground">SEO 제목 (seo_title)</span>: 검색 결과에 표시될 제목 (title과 별도)
            </p>
            <p>
              - <span className="font-medium text-foreground">SEO 설명 (seo_description)</span>: 검색 결과에 표시될 설명
            </p>
            <p>
              - <span className="font-medium text-foreground">SEO 키워드 (seo_keywords)</span>: 검색 엔진 최적화를 위한 키워드
            </p>
            <p>
              - <span className="font-medium text-foreground">Canonical URL (canonical_url)</span>: 검색 엔진에 표시할 정규화된 URL (비워두면 기본 URL 사용)
            </p>
          </CardContent>
        </Card>

        <ArticleSeoManagementForm
          scanAction={scanArticleSeoAction}
          initialScanState={initialScanState}
          updateAction={updateArticleSeoAction}
          initialUpdateState={initialUpdateState}
          generateAction={generateArticleSeoAction}
          initialGenerateState={{ status: 'idle', message: '' }}
          bulkGenerateAction={generateBulkArticleSeoAction}
          initialBulkGenerateState={{ status: 'idle', message: '' }}
          bulkGenerateCanonicalUrlAction={generateBulkCanonicalUrlAction}
          initialBulkGenerateCanonicalUrlState={{ status: 'idle', message: '' }}
          convertSlugAction={convertSlugsToKoreanAction}
          initialConvertSlugState={{ status: 'idle', message: '' }}
        />
      </div>
    </div>
  );
}

