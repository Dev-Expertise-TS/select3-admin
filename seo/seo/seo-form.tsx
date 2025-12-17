'use client';

import { useActionState, useEffect, useRef, useState, startTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  ArticleCanonicalUrlBulkGenerateState,
  ArticleSeoBulkGenerateState,
  ArticleSeoGenerateState,
  ArticleSeoScanState,
  ArticleSeoSlugConvertState,
  ArticleSeoUpdateState,
} from './page';

interface ArticleSeoManagementFormProps {
  scanAction: (prevState: ArticleSeoScanState, formData: FormData) => Promise<ArticleSeoScanState>;
  initialScanState: ArticleSeoScanState;
  updateAction: (prevState: ArticleSeoUpdateState, formData: FormData) => Promise<ArticleSeoUpdateState>;
  initialUpdateState: ArticleSeoUpdateState;
  generateAction: (prevState: ArticleSeoGenerateState, formData: FormData) => Promise<ArticleSeoGenerateState>;
  initialGenerateState: ArticleSeoGenerateState;
  bulkGenerateAction: (
    prevState: ArticleSeoBulkGenerateState,
    formData: FormData,
  ) => Promise<ArticleSeoBulkGenerateState>;
  initialBulkGenerateState: ArticleSeoBulkGenerateState;
  bulkGenerateCanonicalUrlAction: (
    prevState: ArticleCanonicalUrlBulkGenerateState,
    formData: FormData,
  ) => Promise<ArticleCanonicalUrlBulkGenerateState>;
  initialBulkGenerateCanonicalUrlState: ArticleCanonicalUrlBulkGenerateState;
  convertSlugAction: (
    prevState: ArticleSeoSlugConvertState,
    formData: FormData,
  ) => Promise<ArticleSeoSlugConvertState>;
  initialConvertSlugState: ArticleSeoSlugConvertState;
}

export function ArticleSeoManagementForm({
  scanAction,
  initialScanState,
  updateAction,
  initialUpdateState,
  generateAction,
  initialGenerateState,
  bulkGenerateAction,
  initialBulkGenerateState,
  bulkGenerateCanonicalUrlAction,
  initialBulkGenerateCanonicalUrlState,
  convertSlugAction,
  initialConvertSlugState,
}: ArticleSeoManagementFormProps) {
  const [scanState, scanFormAction, isScanPending] = useActionState(scanAction, initialScanState);
  const [updateState, updateFormAction, isUpdatePending] = useActionState(updateAction, initialUpdateState);
  const [generateState, generateFormAction, isGeneratePending] = useActionState(generateAction, initialGenerateState);
  const [bulkGenerateState, bulkGenerateFormAction, isBulkGeneratePending] = useActionState(
    bulkGenerateAction,
    initialBulkGenerateState,
  );
  const [bulkGenerateCanonicalUrlState, bulkGenerateCanonicalUrlFormAction, isBulkGenerateCanonicalUrlPending] =
    useActionState(bulkGenerateCanonicalUrlAction, initialBulkGenerateCanonicalUrlState);
  const [convertSlugState, convertSlugFormAction, isConvertSlugPending] = useActionState(
    convertSlugAction,
    initialConvertSlugState,
  );
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedPostIds, setExpandedPostIds] = useState<Set<string>>(new Set());
  const [selectedSlugPostIds, setSelectedSlugPostIds] = useState<Set<string>>(new Set());
  const [selectedSeoPostIds, setSelectedSeoPostIds] = useState<Set<string>>(new Set());
  const [seoData, setSeoData] = useState<
    Record<string, { seoTitle: string; seoDescription: string; seoKeywords: string; canonicalUrl: string }>
  >({});
  const scanFormRef = useRef<HTMLFormElement | null>(null);
  const generateFormRef = useRef<HTMLFormElement | null>(null);
  const bulkGenerateFormRef = useRef<HTMLFormElement | null>(null);
  const bulkGenerateCanonicalUrlFormRef = useRef<HTMLFormElement | null>(null);
  const updateFormRefs = useRef<Record<string, HTMLFormElement | null>>({});
  const convertSlugFormRef = useRef<HTMLFormElement | null>(null);

  const posts = scanState.details?.posts ?? [];
  const page = scanState.details?.page ?? currentPage;
  const totalPages = scanState.details?.totalPages ?? null;

  useEffect(() => {
    if (scanState.details?.page) setCurrentPage(scanState.details.page);
  }, [scanState.details?.page]);

  // AI SEO 생성 결과를 입력 필드에 반영
  useEffect(() => {
    if (generateState.details && generateState.status === 'success') {
      const { postId, seoTitle, seoDescription, seoKeywords } = generateState.details;
      const post = posts.find((p) => p.id === postId);
      setSeoData((prev) => ({
        ...prev,
        [postId]: {
          seoTitle: seoTitle ?? '',
          seoDescription: seoDescription ?? '',
          seoKeywords: seoKeywords ?? '',
          canonicalUrl: prev[postId]?.canonicalUrl ?? post?.canonicalUrl ?? '',
        },
      }));
    }
  }, [generateState, posts]);

  // 펼쳐진 글의 초기 SEO 데이터 설정
  useEffect(() => {
    posts.forEach((post) => {
      if (expandedPostIds.has(post.id) && !seoData[post.id]) {
        setSeoData((prev) => ({
          ...prev,
          [post.id]: {
            seoTitle: post.seoTitle ?? '',
            seoDescription: post.seoDescription ?? '',
            seoKeywords: post.seoKeywords ?? '',
            canonicalUrl: post.canonicalUrl ?? '',
          },
        }));
      }
    });
  }, [expandedPostIds, posts, seoData]);

  // 일괄 생성 완료 시 글 목록 새로고침
  useEffect(() => {
    if (bulkGenerateState.status === 'success' && bulkGenerateState.details && bulkGenerateState.details.generated > 0) {
      // 일괄 생성이 완료되면 현재 페이지를 다시 조회하여 최신 데이터 반영
      if (scanFormRef.current) {
        const formData = new FormData(scanFormRef.current);
        formData.set('page', String(page));
        startTransition(() => {
          scanFormAction(formData);
        });
      }
    }
  }, [bulkGenerateState.status, bulkGenerateState.details, page, scanFormAction]);

  // Canonical URL 일괄 생성 완료 시 글 목록 새로고침
  useEffect(() => {
    if (
      bulkGenerateCanonicalUrlState.status === 'success' &&
      bulkGenerateCanonicalUrlState.details &&
      bulkGenerateCanonicalUrlState.details.generated > 0
    ) {
      if (scanFormRef.current) {
        const formData = new FormData(scanFormRef.current);
        formData.set('page', String(page));
        startTransition(() => {
          scanFormAction(formData);
        });
      }
    }
  }, [bulkGenerateCanonicalUrlState.status, bulkGenerateCanonicalUrlState.details, page, scanFormAction]);

  const handleScanPageChange = (newPage: number) => {
    if (!scanFormRef.current) return;
    setCurrentPage(newPage);
    setExpandedPostIds(new Set()); // 페이지 변경 시 펼침 상태 초기화
    setSelectedSlugPostIds(new Set()); // 페이지 변경 시 선택 초기화
    setSelectedSeoPostIds(new Set()); // 페이지 변경 시 SEO 선택 초기화
    const formData = new FormData(scanFormRef.current);
    formData.set('page', String(newPage));
    startTransition(() => {
      scanFormAction(formData);
    });
  };

  const toggleExpand = (postId: string) => {
    setExpandedPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) {
        next.delete(postId);
      } else {
        next.add(postId);
        // 초기 SEO 데이터 설정
        const post = posts.find((p) => p.id === postId);
        if (post && !seoData[postId]) {
          setSeoData((prevData) => ({
            ...prevData,
            [postId]: {
              seoTitle: post.seoTitle ?? '',
              seoDescription: post.seoDescription ?? '',
              seoKeywords: post.seoKeywords ?? '',
              canonicalUrl: post.canonicalUrl ?? '',
            },
          }));
        }
      }
      return next;
    });
  };

  const handleUpdate = (postId: string) => {
    const form = updateFormRefs.current[postId];
    if (!form) return;
    form.requestSubmit();
  };

  const handleGenerateSeo = (postId: string) => {
    if (!generateFormRef.current) return;
    const formData = new FormData(generateFormRef.current);
    formData.set('postId', postId);
    startTransition(() => {
      generateFormAction(formData);
    });
  };

  const handleConvertSlugs = () => {
    if (!convertSlugFormRef.current) return;
    startTransition(() => {
      convertSlugFormRef.current?.requestSubmit();
    });
  };

  const toggleSlugSelection = (postId: string) => {
    setSelectedSlugPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const toggleAllSlugSelectionOnPage = () => {
    if (posts.length === 0) return;
    setSelectedSlugPostIds((prev) => {
      const pageIds = posts.map((p) => p.id);
      const allSelected = pageIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const pageAllSelected = posts.length > 0 && posts.every((p) => selectedSlugPostIds.has(p.id));

  const toggleSeoSelection = (postId: string) => {
    setSelectedSeoPostIds((prev) => {
      const next = new Set(prev);
      if (next.has(postId)) next.delete(postId);
      else next.add(postId);
      return next;
    });
  };

  const toggleAllSeoSelectionOnPage = () => {
    if (posts.length === 0) return;
    setSelectedSeoPostIds((prev) => {
      const pageIds = posts.map((p) => p.id);
      const allSelected = pageIds.every((id) => prev.has(id));
      if (allSelected) {
        const next = new Set(prev);
        pageIds.forEach((id) => next.delete(id));
        return next;
      }
      const next = new Set(prev);
      pageIds.forEach((id) => next.add(id));
      return next;
    });
  };

  const pageAllSeoSelected = posts.length > 0 && posts.every((p) => selectedSeoPostIds.has(p.id));

  const decodeSlugForUi = (slug: string): string => {
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

  const needsSlugConvert = (slug: string): boolean => {
    const trimmed = slug.trim();
    if (!trimmed) return false;
    return decodeSlugForUi(trimmed) !== trimmed;
  };

  const handleConvertSelectedSlugs = () => {
    if (!convertSlugFormRef.current) return;
    if (selectedSlugPostIds.size === 0) return;
    startTransition(() => {
      convertSlugFormRef.current?.requestSubmit();
    });
  };

  const handleBulkGenerateSeo = () => {
    if (!bulkGenerateFormRef.current) return;
    if (selectedSeoPostIds.size === 0) return;
    startTransition(() => {
      bulkGenerateFormRef.current?.requestSubmit();
    });
  };

  const handleBulkGenerateCanonicalUrl = () => {
    if (!bulkGenerateCanonicalUrlFormRef.current) return;
    if (selectedSeoPostIds.size === 0) return;
    startTransition(() => {
      bulkGenerateCanonicalUrlFormRef.current?.requestSubmit();
    });
  };

  return (
    <div className="space-y-6">
      {/* Slug 일괄 변환 섹션 */}
      <Card>
        <CardHeader>
          <CardTitle>Slug 일괄 변환 (한글 변환)</CardTitle>
          <CardDescription>
            `allstay_blogs` 테이블의 slug를 URL 인코딩된 형태에서 한글 형태로 일괄 변환합니다.
            <br />
            <span className="text-xs text-muted-foreground">
              ⚠️ 변환 전에 Supabase SQL Editor에서 백업 테이블을 생성하세요: <code className="bg-muted px-1 rounded">CREATE TABLE allstay_blogs_duplicate_slug_test AS SELECT * FROM allstay_blogs;</code>
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form ref={convertSlugFormRef} action={convertSlugFormAction} className="hidden">
            {Array.from(selectedSlugPostIds).map((id) => (
              <input key={id} type="hidden" name="postIds" value={id} />
            ))}
          </form>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleConvertSlugs}
              disabled={isConvertSlugPending}
              variant="destructive"
            >
              {isConvertSlugPending ? '변환 중...' : 'Slug 일괄 변환 실행'}
            </Button>
            <Button
              type="button"
              onClick={handleConvertSelectedSlugs}
              disabled={isConvertSlugPending || selectedSlugPostIds.size === 0}
              variant="outline"
            >
              선택 변환 실행 ({selectedSlugPostIds.size})
            </Button>
            {convertSlugState.message ? (
              <p
                className={cn(
                  'text-sm flex-1',
                  convertSlugState.status === 'success' && 'text-green-600',
                  convertSlugState.status === 'error' && 'text-red-600',
                  convertSlugState.status === 'idle' && 'text-muted-foreground',
                )}
              >
                {convertSlugState.message}
              </p>
            ) : null}
          </div>
          <p className="text-xs text-muted-foreground">
            선택 변환을 사용하려면 아래 <span className="font-medium text-foreground">글 목록 조회</span> 후 변환할 글을 체크하세요.
          </p>
          {convertSlugState.details ? (
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-2">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">전체:</span>{' '}
                  <span className="font-medium">{convertSlugState.details.total.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">변환:</span>{' '}
                  <span className="font-medium text-green-600">{convertSlugState.details.converted.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">스킵:</span>{' '}
                  <span className="font-medium">{convertSlugState.details.skipped.toLocaleString()}</span>
                </div>
                <div>
                  <span className="text-muted-foreground">오류:</span>{' '}
                  <span className="font-medium text-red-600">{convertSlugState.details.errors.length.toLocaleString()}</span>
                </div>
              </div>
              {convertSlugState.details.duplicates && convertSlugState.details.duplicates.length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-red-600">중복 slug:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4">
                    {convertSlugState.details.duplicates.map((dup, idx) => (
                      <li key={idx}>
                        <code className="bg-background px-1 rounded">{dup.slug}</code>: {dup.ids.length}개 (IDs: {dup.ids.join(', ')})
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {convertSlugState.details.errors.length > 0 ? (
                <div className="mt-3 space-y-1">
                  <p className="text-sm font-medium text-red-600">오류 목록:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 ml-4 max-h-40 overflow-y-auto">
                    {convertSlugState.details.errors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SEO 데이터 조회</CardTitle>
          <CardDescription>블로그 글 목록을 조회하여 SEO 데이터를 확인하고 수정할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form ref={scanFormRef} action={scanFormAction} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="scanPerPage">페이지 크기</Label>
                <Input id="scanPerPage" name="perPage" type="number" min={1} max={50} defaultValue={20} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="scanPage">페이지</Label>
                <Input id="scanPage" name="page" type="number" min={1} defaultValue={1} />
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={isScanPending} className="w-full" variant="outline">
                  {isScanPending ? '조회 중...' : '글 목록 조회'}
                </Button>
              </div>
            </div>
          </form>

          {scanState.message ? (
            <p
              className={cn(
                'text-sm',
                scanState.status === 'success' && 'text-green-600',
                scanState.status === 'error' && 'text-red-600',
                scanState.status === 'idle' && 'text-muted-foreground',
              )}
            >
              {scanState.message}
            </p>
          ) : null}

          {/* AI SEO 일괄 생성 폼 */}
          <form ref={bulkGenerateFormRef} action={bulkGenerateFormAction} className="hidden">
            {Array.from(selectedSeoPostIds).map((id) => (
              <input key={id} type="hidden" name="postIds" value={id} />
            ))}
          </form>

          {/* Canonical URL 일괄 생성 폼 */}
          <form ref={bulkGenerateCanonicalUrlFormRef} action={bulkGenerateCanonicalUrlFormAction} className="hidden">
            {Array.from(selectedSeoPostIds).map((id) => (
              <input key={id} type="hidden" name="postIds" value={id} />
            ))}
          </form>

          {posts.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <p className="text-xs text-muted-foreground">
                    현재 페이지: <span className="font-medium text-foreground">{page.toLocaleString()}</span>
                    {typeof totalPages === 'number' ? (
                      <>
                        {' '}
                        / <span className="font-medium text-foreground">{totalPages.toLocaleString()}</span>
                      </>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    선택된 글: <span className="font-medium text-foreground">{selectedSeoPostIds.size}</span>개
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isScanPending || posts.length === 0}
                    onClick={toggleAllSeoSelectionOnPage}
                  >
                    {pageAllSeoSelected ? '전체 선택 해제' : '전체 선택'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={isBulkGeneratePending || selectedSeoPostIds.size === 0}
                    onClick={handleBulkGenerateSeo}
                  >
                    {isBulkGeneratePending
                      ? `AI SEO 생성 중... (${selectedSeoPostIds.size})`
                      : `AI SEO 일괄 생성 (${selectedSeoPostIds.size})`}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={isBulkGenerateCanonicalUrlPending || selectedSeoPostIds.size === 0}
                    onClick={handleBulkGenerateCanonicalUrl}
                  >
                    {isBulkGenerateCanonicalUrlPending
                      ? `Canonical URL 생성 중... (${selectedSeoPostIds.size})`
                      : `Canonical URL 일괄 생성 (${selectedSeoPostIds.size})`}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isScanPending || posts.length === 0}
                    onClick={toggleAllSlugSelectionOnPage}
                  >
                    {pageAllSelected ? 'Slug 변환 선택 해제' : 'Slug 변환 전체 선택'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isScanPending || page <= 1}
                    onClick={() => handleScanPageChange(Math.max(1, page - 1))}
                  >
                    이전
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isScanPending || (typeof totalPages === 'number' ? page >= totalPages : false)}
                    onClick={() => handleScanPageChange(page + 1)}
                  >
                    다음
                  </Button>
                </div>
              </div>

              {/* 글 목록 */}
              <div className="rounded-md border border-border bg-background">
                <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                      checked={pageAllSeoSelected && posts.length > 0}
                      onChange={toggleAllSeoSelectionOnPage}
                      disabled={isScanPending || posts.length === 0}
                      aria-label="전체 선택"
                    />
                    <span>SEO 선택</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                      checked={pageAllSelected && posts.length > 0}
                      onChange={toggleAllSlugSelectionOnPage}
                      disabled={isScanPending || posts.length === 0}
                      aria-label="Slug 변환 전체 선택"
                    />
                    <span>Slug 변환</span>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {posts.map((post) => {
                    const isExpanded = expandedPostIds.has(post.id);
                    const isGenerating = isGeneratePending && generateState.details?.postId === post.id;
                    const isOtherGenerating = isGeneratePending && generateState.details?.postId !== post.id;
                    const isSelectedForSlug = selectedSlugPostIds.has(post.id);
                    const decodedSlug = post.slug ? decodeSlugForUi(post.slug) : '';
                    const isSlugConvertible = post.slug ? needsSlugConvert(post.slug) : false;
                    return (
                      <div key={post.id}>
                        {/* 글 레코드 */}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 pt-0.5">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                                checked={selectedSeoPostIds.has(post.id)}
                                onChange={() => toggleSeoSelection(post.id)}
                                aria-label="SEO 데이터 조회 선택"
                              />
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                                checked={isSelectedForSlug}
                                onChange={() => toggleSlugSelection(post.id)}
                                aria-label="slug 변환 대상 선택"
                                title="Slug 변환용"
                              />
                            </div>
                            <div className="flex-1 space-y-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">{post.title || '(제목 없음)'}</p>
                              <p className="text-xs text-muted-foreground break-all">
                                slug: <span className="font-mono">
                                  {post.slug ? decodedSlug : '-'}
                                </span>
                                {isSlugConvertible ? (
                                  <span className="ml-2 inline-flex items-center rounded-sm bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                                    변환 필요
                                  </span>
                                ) : null}
                                {post.publishedAt ? <span className="ml-2">• {post.publishedAt}</span> : null}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant={isExpanded ? 'default' : 'outline'}
                                onClick={() => toggleExpand(post.id)}
                              >
                                {isExpanded ? '접기' : 'SEO 관리'}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {/* 슬라이드 SEO 입력 폼 */}
                        <div
                          className={cn(
                            'overflow-hidden transition-all duration-300 ease-in-out',
                            isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0',
                          )}
                        >
                          <div className="border-t border-border bg-muted/30 p-4 space-y-4">
                            {/* SEO 미리보기 */}
                            <div className="bg-white rounded-lg border border-border p-4 space-y-4">
                              <div className="border-b border-border pb-2">
                                <div className="flex gap-1">
                                  <button
                                    type="button"
                                    className={cn(
                                      "px-4 py-2 text-sm font-medium border-b-2 transition-colors",
                                      "border-primary text-primary"
                                    )}
                                  >
                                    SUMMARY
                                  </button>
                                </div>
                              </div>
                              <div className="space-y-3 text-sm">
                                {/* Title */}
                                <div className="flex items-start gap-2">
                                  <div className="flex items-center gap-1 min-w-[100px]">
                                    <span className="font-medium">Title</span>
                                    <span className="text-muted-foreground text-xs">?</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-foreground wrap-break-word">
                                      {seoData[post.id]?.seoTitle || post.seoTitle || post.title || '(제목 없음)'}
                                    </div>
                                    <div className="text-green-600 text-xs mt-1">
                                      {(seoData[post.id]?.seoTitle || post.seoTitle || post.title || '').length} characters
                                    </div>
                                  </div>
                                </div>
                                {/* Description */}
                                <div className="flex items-start gap-2">
                                  <div className="flex items-center gap-1 min-w-[100px]">
                                    <span className="font-medium">Description</span>
                                    <span className="text-muted-foreground text-xs">?</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-foreground wrap-break-word">
                                      {seoData[post.id]?.seoDescription || post.seoDescription || '(설명 없음)'}
                                    </div>
                                    <div className="text-green-600 text-xs mt-1">
                                      {(seoData[post.id]?.seoDescription || post.seoDescription || '').length} characters
                                    </div>
                                  </div>
                                </div>
                                {/* Keywords */}
                                <div className="flex items-start gap-2">
                                  <div className="flex items-center gap-1 min-w-[100px]">
                                    <span className="font-medium">Keywords</span>
                                    <span className="text-muted-foreground text-xs">?</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className={cn(
                                      "text-foreground wrap-break-word",
                                      !seoData[post.id]?.seoKeywords && !post.seoKeywords && "text-muted-foreground"
                                    )}>
                                      {seoData[post.id]?.seoKeywords || post.seoKeywords || 'Keywords are missing!'}
                                    </div>
                                  </div>
                                </div>
                                {/* URL */}
                                <div className="flex items-start gap-2">
                                  <div className="flex items-center gap-1 min-w-[100px]">
                                    <span className="font-medium">URL</span>
                                    <span className="text-muted-foreground text-xs">?</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-foreground break-all font-mono text-xs">
                                      {(() => {
                                        const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://allstay.com';
                                        const slug = post.slug || '';
                                        try {
                                          // 여러 번 인코딩된 경우를 처리하기 위해 반복 디코딩
                                      const decodedSlug = decodeSlugForUi(slug);
                                          return `${baseUrl}/alltrip/post/${decodedSlug}`;
                                        } catch {
                                          return `${baseUrl}/alltrip/post/${slug}`;
                                        }
                                      })()}
                                    </div>
                                  </div>
                                </div>
                                {/* Canonical */}
                                <div className="flex items-start gap-2">
                                  <div className="flex items-center gap-1 min-w-[100px]">
                                    <span className="font-medium">Canonical</span>
                                    <span className="text-muted-foreground text-xs">?</span>
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="text-foreground break-all font-mono text-xs">
                                      {seoData[post.id]?.canonicalUrl ||
                                        post.canonicalUrl ||
                                        (() => {
                                          const baseUrl =
                                            typeof window !== 'undefined'
                                              ? window.location.origin
                                              : 'https://allstay.com';
                                          const slug = post.slug || '';
                                          try {
                                            const decodedSlug = decodeSlugForUi(slug);
                                            return `${baseUrl}/alltrip/post/${decodedSlug}`;
                                          } catch {
                                            return `${baseUrl}/alltrip/post/${slug}`;
                                          }
                                        })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <form
                              ref={(el) => {
                                updateFormRefs.current[post.id] = el;
                              }}
                              action={updateFormAction}
                              className="space-y-4"
                            >
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`seoTitle_${post.id}`}>SEO 제목</Label>
                                  <Input
                                    id={`seoTitle_${post.id}`}
                                    name={`seoTitle_${post.id}`}
                                    value={seoData[post.id]?.seoTitle ?? ''}
                                    onChange={(e) => {
                                      setSeoData((prev) => ({
                                        ...prev,
                                        [post.id]: {
                                          ...(prev[post.id] ?? {
                                            seoTitle: post.seoTitle ?? '',
                                            seoDescription: post.seoDescription ?? '',
                                            seoKeywords: post.seoKeywords ?? '',
                                            canonicalUrl: post.canonicalUrl ?? '',
                                          }),
                                          seoTitle: e.target.value,
                                        },
                                      }));
                                    }}
                                    placeholder="SEO 제목을 입력하세요"
                                    className="font-medium"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`seoDescription_${post.id}`}>SEO 설명</Label>
                                  <Textarea
                                    id={`seoDescription_${post.id}`}
                                    name={`seoDescription_${post.id}`}
                                    value={seoData[post.id]?.seoDescription ?? ''}
                                    onChange={(e) => {
                                      setSeoData((prev) => ({
                                        ...prev,
                                        [post.id]: {
                                          ...(prev[post.id] ?? {
                                            seoTitle: post.seoTitle ?? '',
                                            seoDescription: post.seoDescription ?? '',
                                            seoKeywords: post.seoKeywords ?? '',
                                            canonicalUrl: post.canonicalUrl ?? '',
                                          }),
                                          seoDescription: e.target.value,
                                        },
                                      }));
                                    }}
                                    placeholder="SEO 설명을 입력하세요"
                                    rows={3}
                                    className="resize-none"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`seoKeywords_${post.id}`}>SEO 키워드</Label>
                                  <Input
                                    id={`seoKeywords_${post.id}`}
                                    name={`seoKeywords_${post.id}`}
                                    value={seoData[post.id]?.seoKeywords ?? ''}
                                    onChange={(e) => {
                                      setSeoData((prev) => ({
                                        ...prev,
                                        [post.id]: {
                                          ...(prev[post.id] ?? {
                                            seoTitle: post.seoTitle ?? '',
                                            seoDescription: post.seoDescription ?? '',
                                            seoKeywords: post.seoKeywords ?? '',
                                            canonicalUrl: post.canonicalUrl ?? '',
                                          }),
                                          seoKeywords: e.target.value,
                                        },
                                      }));
                                    }}
                                    placeholder="키워드를 쉼표로 구분하여 입력하세요 (예: 호텔, 도쿄, 추천)"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`canonicalUrl_${post.id}`}>Canonical URL</Label>
                                  <Input
                                    id={`canonicalUrl_${post.id}`}
                                    name={`canonicalUrl_${post.id}`}
                                    value={seoData[post.id]?.canonicalUrl ?? ''}
                                    onChange={(e) => {
                                      setSeoData((prev) => ({
                                        ...prev,
                                        [post.id]: {
                                          ...(prev[post.id] ?? {
                                            seoTitle: post.seoTitle ?? '',
                                            seoDescription: post.seoDescription ?? '',
                                            seoKeywords: post.seoKeywords ?? '',
                                            canonicalUrl: post.canonicalUrl ?? '',
                                          }),
                                          canonicalUrl: e.target.value,
                                        },
                                      }));
                                    }}
                                    placeholder="https://allstay.com/alltrip/post/..."
                                    className="font-mono text-xs"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    비워두면 기본 URL이 사용됩니다. (현재: /alltrip/post/{post.slug ? decodeSlugForUi(post.slug) : '...'})
                                  </p>
                                </div>
                              </div>

                              <input type="hidden" name="postId" value={post.id} />

                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isGenerating || isOtherGenerating}
                                  onClick={() => handleGenerateSeo(post.id)}
                                  className={cn(
                                    "text-blue-600 hover:text-blue-700 hover:bg-blue-50",
                                    isGenerating && "opacity-75"
                                  )}
                                >
                                  {isGenerating ? '생성 중...' : 'AI SEO'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={isGenerating || isOtherGenerating}
                                  onClick={() => toggleExpand(post.id)}
                                >
                                  취소
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={isUpdatePending || isGenerating || isOtherGenerating}
                                  className="min-w-32"
                                >
                                  {isUpdatePending ? '저장 중...' : '저장'}
                                </Button>
                              </div>
                            </form>

                            {/* AI SEO 생성 결과 메시지 */}
                            {generateState.details?.postId === post.id && generateState.message ? (
                              <div className="mt-2 pt-2 border-t border-border">
                                <p
                                  className={cn(
                                    'text-sm',
                                    generateState.status === 'success' && 'text-green-600',
                                    generateState.status === 'error' && 'text-red-600',
                                  )}
                                >
                                  {generateState.message}
                                </p>
                              </div>
                            ) : null}

                            {/* 저장 결과 메시지 */}
                            {updateState.details && updateState.message ? (
                              <div className="mt-2 pt-2 border-t border-border">
                                <p
                                  className={cn(
                                    'text-sm',
                                    updateState.status === 'success' && 'text-green-600',
                                    updateState.status === 'error' && 'text-red-600',
                                  )}
                                >
                                  {updateState.message}
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AI SEO 생성 폼 (hidden) */}
              <form ref={generateFormRef} action={generateFormAction} className="hidden">
                <input type="hidden" name="postId" value="" />
              </form>
            </div>
          ) : null}

          {/* AI SEO 일괄 생성 결과 */}
          {bulkGenerateState.message ? (
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
              <p
                className={cn(
                  'text-sm font-medium',
                  bulkGenerateState.status === 'success' && 'text-green-600',
                  bulkGenerateState.status === 'error' && 'text-red-600',
                  bulkGenerateState.status === 'idle' && 'text-muted-foreground',
                )}
              >
                {bulkGenerateState.message}
              </p>
              {bulkGenerateState.details ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">전체:</span>{' '}
                      <span className="font-medium">{bulkGenerateState.details.total.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">생성:</span>{' '}
                      <span className="font-medium text-green-600">
                        {bulkGenerateState.details.generated.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">스킵:</span>{' '}
                      <span className="font-medium">{bulkGenerateState.details.skipped.toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">오류:</span>{' '}
                      <span className="font-medium text-red-600">
                        {bulkGenerateState.details.errors.length.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {bulkGenerateState.details.errors.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium text-red-600">오류 목록:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4 max-h-40 overflow-y-auto">
                        {bulkGenerateState.details.errors.map((err, idx) => (
                          <li key={idx}>
                            [{err.postId}] {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* Canonical URL 일괄 생성 결과 */}
          {bulkGenerateCanonicalUrlState.message ? (
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
              <p
                className={cn(
                  'text-sm font-medium',
                  bulkGenerateCanonicalUrlState.status === 'success' && 'text-green-600',
                  bulkGenerateCanonicalUrlState.status === 'error' && 'text-red-600',
                  bulkGenerateCanonicalUrlState.status === 'idle' && 'text-muted-foreground',
                )}
              >
                {bulkGenerateCanonicalUrlState.message}
              </p>
              {bulkGenerateCanonicalUrlState.details ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">전체:</span>{' '}
                      <span className="font-medium">
                        {bulkGenerateCanonicalUrlState.details.total.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">생성:</span>{' '}
                      <span className="font-medium text-green-600">
                        {bulkGenerateCanonicalUrlState.details.generated.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">스킵:</span>{' '}
                      <span className="font-medium">
                        {bulkGenerateCanonicalUrlState.details.skipped.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">오류:</span>{' '}
                      <span className="font-medium text-red-600">
                        {bulkGenerateCanonicalUrlState.details.errors.length.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {bulkGenerateCanonicalUrlState.details.errors.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium text-red-600">오류 목록:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4 max-h-40 overflow-y-auto">
                        {bulkGenerateCanonicalUrlState.details.errors.map((err, idx) => (
                          <li key={idx}>
                            [{err.postId}] {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {updateState.message ? (
        <Card>
          <CardHeader>
            <CardTitle>업데이트 결과</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              const errors = updateState.details?.errors ?? [];
              return (
                <>
                  <p
                    className={cn(
                      'text-sm',
                      updateState.status === 'success' && 'text-green-600',
                      updateState.status === 'error' && 'text-red-600',
                      updateState.status === 'idle' && 'text-muted-foreground',
                    )}
                  >
                    {updateState.message}
                  </p>
                  {errors.length > 0 ? (
                    <div className="mt-4 pt-4 border-t border-border">
                      <p className="text-xs font-medium text-foreground mb-2">오류 상세</p>
                      <ul className="list-disc pl-5 text-xs text-muted-foreground space-y-1">
                        {errors.slice(0, 20).map((e, idx) => (
                          <li key={`${idx}-${e}`}>{e}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </>
              );
            })()}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

