'use client';

import { useState, useEffect, useRef, startTransition } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { HotelSearchResult } from '@/types/hotel';
import { Loader2 } from 'lucide-react';

interface SeoManagementPanelProps {
  hotel: HotelSearchResult;
  hotelId: string;
  initialSeoData?: {
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl: string | null;
  };
  onUpdate?: (sabreId: string, seoData: {
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    canonicalUrl: string;
  }) => Promise<void>;
  onGenerate?: (sabreId: string) => Promise<{
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl: string | null;
  }>;
}

export function SeoManagementPanel({
  hotel,
  hotelId,
  initialSeoData,
  onUpdate,
  onGenerate,
}: SeoManagementPanelProps) {
  const [seoData, setSeoData] = useState({
    seoTitle: initialSeoData?.seoTitle ?? '',
    seoDescription: initialSeoData?.seoDescription ?? '',
    seoKeywords: initialSeoData?.seoKeywords ?? '',
    canonicalUrl: initialSeoData?.canonicalUrl ?? '',
  });
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [generateMessage, setGenerateMessage] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    // initialSeoData가 undefined가 아닐 때 (null 포함) 업데이트
    if (initialSeoData !== undefined) {
      setSeoData({
        seoTitle: initialSeoData?.seoTitle ?? '',
        seoDescription: initialSeoData?.seoDescription ?? '',
        seoKeywords: initialSeoData?.seoKeywords ?? '',
        canonicalUrl: initialSeoData?.canonicalUrl ?? '',
      });
    }
  }, [initialSeoData]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onUpdate || !hotel.sabre_id) return;

    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      await onUpdate(hotel.sabre_id, seoData);
      setUpdateMessage({ type: 'success', message: 'SEO 데이터가 저장되었습니다.' });
    } catch (error) {
      setUpdateMessage({
        type: 'error',
        message: error instanceof Error ? error.message : '저장 중 오류가 발생했습니다.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleGenerate = async () => {
    if (!onGenerate || !hotel.sabre_id) return;

    setIsGenerating(true);
    setGenerateMessage(null);

    try {
      const result = await onGenerate(hotel.sabre_id);
      setSeoData({
        seoTitle: result.seoTitle ?? '',
        seoDescription: result.seoDescription ?? '',
        seoKeywords: result.seoKeywords ?? '',
        canonicalUrl: result.canonicalUrl ?? '',
      });
      setGenerateMessage({ type: 'success', message: 'AI SEO 메타데이터가 생성되었습니다.' });
    } catch (error) {
      setGenerateMessage({
        type: 'error',
        message: error instanceof Error ? error.message : 'AI SEO 생성 중 오류가 발생했습니다.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const sabreId = hotel.sabre_id ?? '';
  const defaultCanonicalUrl = hotel.slug
    ? `https://luxury-select.co.kr/hotel/${hotel.slug}`
    : `https://luxury-select.co.kr/hotel/${sabreId}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h4 className="text-lg font-medium text-gray-900">SEO 데이터 관리</h4>
      </div>

      {/* SEO 미리보기 */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
        <div className="border-b border-gray-200 pb-2">
          <div className="flex gap-1">
            <button
              type="button"
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                'border-blue-600 text-blue-600',
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
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 break-words">
                {seoData.seoTitle || hotel.property_name_ko || hotel.property_name_en || '(제목 없음)'}
              </div>
              <div className="text-green-600 text-xs mt-1">
                {(seoData.seoTitle || hotel.property_name_ko || hotel.property_name_en || '').length} characters
              </div>
            </div>
          </div>
          {/* Description */}
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 min-w-[100px]">
              <span className="font-medium">Description</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 break-words">
                {seoData.seoDescription || '(설명 없음)'}
              </div>
              <div className="text-green-600 text-xs mt-1">
                {(seoData.seoDescription || '').length} characters
              </div>
            </div>
          </div>
          {/* Keywords */}
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 min-w-[100px]">
              <span className="font-medium">Keywords</span>
            </div>
            <div className="flex-1 min-w-0">
              <div
                className={cn(
                  'text-gray-900 break-words',
                  !seoData.seoKeywords && 'text-gray-400',
                )}
              >
                {seoData.seoKeywords || 'Keywords are missing!'}
              </div>
            </div>
          </div>
          {/* Canonical */}
          <div className="flex items-start gap-2">
            <div className="flex items-center gap-1 min-w-[100px]">
              <span className="font-medium">Canonical</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-gray-900 break-all font-mono text-xs">
                {seoData.canonicalUrl || defaultCanonicalUrl}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEO 입력 폼 */}
      <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`seoTitle_${hotelId}`}>SEO 제목</Label>
            <Input
              id={`seoTitle_${hotelId}`}
              value={seoData.seoTitle}
              onChange={(e) => setSeoData((prev) => ({ ...prev, seoTitle: e.target.value }))}
              placeholder={`SEO 제목을 입력하세요${hotel.property_name_ko || hotel.property_name_en ? ` (호텔명: ${hotel.property_name_ko || hotel.property_name_en})` : ''}`}
              className="font-medium"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`seoDescription_${hotelId}`}>SEO 설명</Label>
            <Textarea
              id={`seoDescription_${hotelId}`}
              value={seoData.seoDescription}
              onChange={(e) => setSeoData((prev) => ({ ...prev, seoDescription: e.target.value }))}
              placeholder="SEO 설명을 입력하세요"
              rows={3}
              className="resize-none"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`seoKeywords_${hotelId}`}>SEO 키워드</Label>
            <Input
              id={`seoKeywords_${hotelId}`}
              value={seoData.seoKeywords}
              onChange={(e) => setSeoData((prev) => ({ ...prev, seoKeywords: e.target.value }))}
              placeholder="키워드를 쉼표로 구분하여 입력하세요 (예: 호텔, 도쿄, 추천)"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor={`canonicalUrl_${hotelId}`}>Canonical URL</Label>
            <Input
              id={`canonicalUrl_${hotelId}`}
              value={seoData.canonicalUrl}
              onChange={(e) => setSeoData((prev) => ({ ...prev, canonicalUrl: e.target.value }))}
              placeholder="https://luxury-select.co.kr/hotel/..."
              className="font-mono text-xs"
            />
            <p className="text-xs text-gray-500">
              비워두면 기본 URL이 사용됩니다. (형식: /hotel/{sabreId})
            </p>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          {onGenerate && (
            <Button
              type="button"
              variant="outline"
              disabled={isGenerating || isUpdating}
              onClick={handleGenerate}
              className={cn(
                'text-blue-600 hover:text-blue-700 hover:bg-blue-50 min-w-[140px]',
                isGenerating && 'opacity-75',
              )}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  AI SEO 추출중...
                </>
              ) : (
                'AI SEO 추출'
              )}
            </Button>
          )}
          {onUpdate && (
            <Button
              type="submit"
              disabled={isUpdating || isGenerating}
              className="min-w-32"
            >
              {isUpdating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  저장 중...
                </>
              ) : (
                '저장'
              )}
            </Button>
          )}
        </div>
      </form>

      {/* 메시지 표시 */}
      {generateMessage && (
        <div
          className={cn(
            'p-3 rounded-md text-sm',
            generateMessage.type === 'success' && 'bg-green-50 text-green-700',
            generateMessage.type === 'error' && 'bg-red-50 text-red-700',
          )}
        >
          {generateMessage.message}
        </div>
      )}

      {updateMessage && (
        <div
          className={cn(
            'p-3 rounded-md text-sm',
            updateMessage.type === 'success' && 'bg-green-50 text-green-700',
            updateMessage.type === 'error' && 'bg-red-50 text-red-700',
          )}
        >
          {updateMessage.message}
        </div>
      )}
    </div>
  );
}

