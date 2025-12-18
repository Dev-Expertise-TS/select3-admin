'use client';

import { useActionState, useEffect, useRef, useState, startTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import HotelSearchWidget from '@/components/shared/hotel-search-widget';
import type {
  HotelSeoIntroGenerateState,
  HotelSeoIntroScanState,
  HotelSeoIntroUpdateState,
  HotelSeoIntroBulkGenerateState,
} from './page';

interface HotelSeoIntroManagementFormProps {
  scanAction: (prevState: HotelSeoIntroScanState, formData: FormData) => Promise<HotelSeoIntroScanState>;
  initialScanState: HotelSeoIntroScanState;
  updateAction: (prevState: HotelSeoIntroUpdateState, formData: FormData) => Promise<HotelSeoIntroUpdateState>;
  initialUpdateState: HotelSeoIntroUpdateState;
  generateAction: (prevState: HotelSeoIntroGenerateState, formData: FormData) => Promise<HotelSeoIntroGenerateState>;
  initialGenerateState: HotelSeoIntroGenerateState;
  bulkGenerateAction: (prevState: HotelSeoIntroBulkGenerateState, formData: FormData) => Promise<HotelSeoIntroBulkGenerateState>;
  initialBulkGenerateState: HotelSeoIntroBulkGenerateState;
}

export function HotelSeoIntroManagementForm({
  scanAction,
  initialScanState,
  updateAction,
  initialUpdateState,
  generateAction,
  initialGenerateState,
  bulkGenerateAction,
  initialBulkGenerateState,
}: HotelSeoIntroManagementFormProps) {
  const [scanState, scanFormAction, isScanPending] = useActionState(scanAction, initialScanState);
  const [updateState, updateFormAction, isUpdatePending] = useActionState(updateAction, initialUpdateState);
  const [generateState, generateFormAction, isGeneratePending] = useActionState(generateAction, initialGenerateState);
  const [bulkGenerateState, bulkGenerateFormAction, isBulkGeneratePending] = useActionState(bulkGenerateAction, initialBulkGenerateState);
  const [expandedSabreIds, setExpandedSabreIds] = useState<Set<string>>(new Set());
  const [seoData, setSeoData] = useState<
    Record<string, { seoTitle: string; seoDescription: string; seoKeywords: string; canonicalUrl: string }>
  >({});
  const [searchQuery, setSearchQuery] = useState<string>('');
  const scanFormRef = useRef<HTMLFormElement | null>(null);
  const generateFormRef = useRef<HTMLFormElement | null>(null);
  const updateFormRefs = useRef<Record<string, HTMLFormElement | null>>({});

  const hotels = scanState.details?.hotels ?? [];

  // AI SEO 생성 결과를 입력 필드에 반영
  useEffect(() => {
    if (generateState.details && generateState.status === 'success') {
      const { sabreId, seoTitle, seoDescription, seoKeywords, canonicalUrl } = generateState.details;
      const hotel = hotels.find((h) => h.sabreId === sabreId);
      
      // 완료 알림 표시
      const hotelName = hotel?.propertyNameKo || hotel?.propertyNameEn || '호텔';
      window.alert(`AI SEO 추출이 완료되었습니다.\n\n호텔: ${hotelName}\nSEO 제목, 설명, 키워드가 생성되었습니다.`);
      
      setSeoData((prev) => {
        const updated = {
          ...prev,
          [sabreId]: {
            seoTitle:
              seoTitle && seoTitle.trim() !== ''
                ? seoTitle
                : prev[sabreId]?.seoTitle !== undefined
                  ? prev[sabreId].seoTitle
                  : hotel?.seoTitle || '',
            seoDescription:
              seoDescription && seoDescription.trim() !== ''
                ? seoDescription
                : prev[sabreId]?.seoDescription !== undefined
                  ? prev[sabreId].seoDescription
                  : hotel?.seoDescription || '',
            seoKeywords:
              seoKeywords && seoKeywords.trim() !== ''
                ? seoKeywords
                : prev[sabreId]?.seoKeywords !== undefined
                  ? prev[sabreId].seoKeywords
                  : hotel?.seoKeywords || '',
            canonicalUrl:
              canonicalUrl && canonicalUrl.trim() !== ''
                ? canonicalUrl
                : prev[sabreId]?.canonicalUrl !== undefined
                  ? prev[sabreId].canonicalUrl
                  : hotel?.canonicalUrl || '',
          },
        };
        return updated;
      });
    }
  }, [generateState, hotels]);

  // 펼쳐진 호텔의 초기 SEO 데이터 설정
  useEffect(() => {
    hotels.forEach((hotel) => {
      if (expandedSabreIds.has(hotel.sabreId) && !seoData[hotel.sabreId]) {
        setSeoData((prev) => ({
          ...prev,
          [hotel.sabreId]: {
            seoTitle: hotel.seoTitle ?? '',
            seoDescription: hotel.seoDescription ?? '',
            seoKeywords: hotel.seoKeywords ?? '',
            canonicalUrl: hotel.canonicalUrl ?? '',
          },
        }));
      }
    });
  }, [expandedSabreIds, hotels, seoData]);

  const toggleExpand = (sabreId: string) => {
    setExpandedSabreIds((prev) => {
      const next = new Set(prev);
      if (next.has(sabreId)) {
        next.delete(sabreId);
      } else {
        next.add(sabreId);
        const hotel = hotels.find((h) => h.sabreId === sabreId);
        if (hotel && !seoData[sabreId]) {
          setSeoData((prevData) => ({
            ...prevData,
            [sabreId]: {
              seoTitle: hotel.seoTitle ?? '',
              seoDescription: hotel.seoDescription ?? '',
              seoKeywords: hotel.seoKeywords ?? '',
              canonicalUrl: hotel.canonicalUrl ?? '',
            },
          }));
        }
      }
      return next;
    });
  };

  const handleUpdate = (sabreId: string) => {
    const form = updateFormRefs.current[sabreId];
    if (!form) return;
    form.requestSubmit();
  };

  const handleGenerateSeo = (sabreId: string) => {
    if (!generateFormRef.current) return;
    const formData = new FormData(generateFormRef.current);
    formData.set('sabreId', sabreId);
    startTransition(() => {
      generateFormAction(formData);
    });
  };

  // SEO 데이터 조회 핸들러
  const handleSeoFetch = async (sabreId: string): Promise<{
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl: string | null;
  }> => {
    try {
      const response = await fetch(`/api/hotel-seo-intro/fetch?sabreId=${sabreId}`);
      if (!response.ok) {
        const bodyText = await response.text().catch(() => '');
        throw new Error(`API 오류: ${response.status}${bodyText ? ` - ${bodyText}` : ''}`);
      }
      const data = await response.json();
      if (data.success && data.data) {
        return {
          seoTitle: data.data.seoTitle ?? null,
          seoDescription: data.data.seoDescription ?? null,
          seoKeywords: data.data.seoKeywords ?? null,
          canonicalUrl: data.data.canonicalUrl ?? null,
        };
      }
    } catch (error) {
      console.error('SEO 데이터 조회 실패:', error);
    }
    return {
      seoTitle: null,
      seoDescription: null,
      seoKeywords: null,
      canonicalUrl: null,
    };
  };

  // SEO 데이터 업데이트 핸들러
  const handleSeoUpdate = async (sabreId: string, seoData: {
    seoTitle: string;
    seoDescription: string;
    seoKeywords: string;
    canonicalUrl: string;
  }): Promise<void> => {
    const formData = new FormData();
    formData.set('sabreId', sabreId);
    formData.set(`seoTitle_${sabreId}`, seoData.seoTitle);
    formData.set(`seoDescription_${sabreId}`, seoData.seoDescription);
    formData.set(`seoKeywords_${sabreId}`, seoData.seoKeywords);
    formData.set(`canonicalUrl_${sabreId}`, seoData.canonicalUrl);
    
    await updateAction(updateState, formData);
  };

  // SEO 데이터 생성 핸들러
  const handleSeoGenerate = async (sabreId: string): Promise<{
    seoTitle: string | null;
    seoDescription: string | null;
    seoKeywords: string | null;
    canonicalUrl: string | null;
  }> => {
    const formData = new FormData();
    formData.set('sabreId', sabreId);
    const result = await generateAction(generateState, formData);
    
    if (result.status === 'success' && result.details) {
      return {
        seoTitle: result.details.seoTitle,
        seoDescription: result.details.seoDescription,
        seoKeywords: result.details.seoKeywords,
        canonicalUrl: result.details.canonicalUrl,
      };
    }
    throw new Error(result.message || 'SEO 생성 실패');
  };

  // 일괄 AI SEO 생성 핸들러
  const handleBulkSeoGenerate = async (sabreIds: string[]): Promise<void> => {
    const formData = new FormData();
    formData.set('sabreIds', sabreIds.join(','));
    
    const result = await bulkGenerateAction(initialBulkGenerateState, formData);
    
    if (result.status === 'success') {
      // 성공 메시지 표시 (추후 UI에 반영 가능)
      console.log(`일괄 SEO 생성 완료: ${result.details?.success}개 성공`);
    } else {
      throw new Error(result.message || '일괄 SEO 생성 실패');
    }
  };

  return (
    <div className="space-y-6">
      <HotelSearchWidget
        title="호텔 소개 SEO 관리"
        description="호텔을 검색하여 SEO 메타데이터를 확인하고 수정할 수 있습니다."
        hideHeader={false}
        enableHotelEdit={false}
        showInitialHotels={false}
        enableSeoManagement={true}
        onSeoFetch={handleSeoFetch}
        onSeoUpdate={handleSeoUpdate}
        onSeoGenerate={handleSeoGenerate}
        onBulkSeoGenerate={handleBulkSeoGenerate}
      />

      {/* SEO 관리 섹션은 HotelSearchWidget의 확장 패널로 통합됨 - 호텔 행을 클릭하면 해당 행 아래에 슬라이드로 표시됩니다 */}

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

