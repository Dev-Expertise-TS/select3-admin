'use client';

import { useActionState, useEffect, useRef, useState, startTransition } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import type {
  HotelCanonicalUrlBulkGenerateState,
  HotelSeoAndCanonicalBulkGenerateState,
  HotelSeoBulkGenerateState,
  HotelSeoGenerateState,
  HotelSeoScanState,
  HotelSeoUpdateState,
} from './page';

interface HotelSeoManagementFormProps {
  scanAction: (prevState: HotelSeoScanState, formData: FormData) => Promise<HotelSeoScanState>;
  initialScanState: HotelSeoScanState;
  updateAction: (prevState: HotelSeoUpdateState, formData: FormData) => Promise<HotelSeoUpdateState>;
  initialUpdateState: HotelSeoUpdateState;
  generateAction: (prevState: HotelSeoGenerateState, formData: FormData) => Promise<HotelSeoGenerateState>;
  initialGenerateState: HotelSeoGenerateState;
  bulkGenerateAction: (
    prevState: HotelSeoBulkGenerateState,
    formData: FormData,
  ) => Promise<HotelSeoBulkGenerateState>;
  initialBulkGenerateState: HotelSeoBulkGenerateState;
  bulkGenerateCanonicalUrlAction: (
    prevState: HotelCanonicalUrlBulkGenerateState,
    formData: FormData,
  ) => Promise<HotelCanonicalUrlBulkGenerateState>;
  initialBulkGenerateCanonicalUrlState: HotelCanonicalUrlBulkGenerateState;
  bulkGenerateSeoAndCanonicalAction: (
    prevState: HotelSeoAndCanonicalBulkGenerateState,
    formData: FormData,
  ) => Promise<HotelSeoAndCanonicalBulkGenerateState>;
  initialBulkGenerateSeoAndCanonicalState: HotelSeoAndCanonicalBulkGenerateState;
  extractCanonicalUrlAction: (
    prevState: { status: 'idle' | 'success' | 'error'; message: string; canonicalUrl?: string | null; hotelId?: string },
    formData: FormData,
  ) => Promise<{ status: 'idle' | 'success' | 'error'; message: string; canonicalUrl?: string | null; hotelId?: string }>;
  initialExtractCanonicalUrlState: { status: 'idle' | 'success' | 'error'; message: string; canonicalUrl?: string | null; hotelId?: string };
  generateSeoAndCanonicalAction: (
    prevState: HotelSeoGenerateState,
    formData: FormData,
  ) => Promise<HotelSeoGenerateState>;
  initialGenerateSeoAndCanonicalState: HotelSeoGenerateState;
}

export function HotelSeoManagementForm({
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
  bulkGenerateSeoAndCanonicalAction,
  initialBulkGenerateSeoAndCanonicalState,
  extractCanonicalUrlAction,
  initialExtractCanonicalUrlState,
  generateSeoAndCanonicalAction,
  initialGenerateSeoAndCanonicalState,
}: HotelSeoManagementFormProps) {
  const [scanState, scanFormAction, isScanPending] = useActionState(scanAction, initialScanState);
  const [updateState, updateFormAction, isUpdatePending] = useActionState(updateAction, initialUpdateState);
  const [generateState, generateFormAction, isGeneratePending] = useActionState(generateAction, initialGenerateState);
  const [bulkGenerateState, bulkGenerateFormAction, isBulkGeneratePending] = useActionState(
    bulkGenerateAction,
    initialBulkGenerateState,
  );
  const [bulkGenerateCanonicalUrlState, bulkGenerateCanonicalUrlFormAction, isBulkGenerateCanonicalUrlPending] =
    useActionState(bulkGenerateCanonicalUrlAction, initialBulkGenerateCanonicalUrlState);
  const [bulkGenerateSeoAndCanonicalState, bulkGenerateSeoAndCanonicalFormAction, isBulkGenerateSeoAndCanonicalPending] =
    useActionState(bulkGenerateSeoAndCanonicalAction, initialBulkGenerateSeoAndCanonicalState);
  const [extractCanonicalUrlState, extractCanonicalUrlFormAction, isExtractCanonicalUrlPending] = useActionState(
    extractCanonicalUrlAction,
    initialExtractCanonicalUrlState,
  );
  const [generateSeoAndCanonicalState, generateSeoAndCanonicalFormAction, isGenerateSeoAndCanonicalPending] = useActionState(
    generateSeoAndCanonicalAction,
    initialGenerateSeoAndCanonicalState,
  );
  const [expandedHotelIds, setExpandedHotelIds] = useState<Set<string>>(new Set());
  const [selectedSeoHotelIds, setSelectedSeoHotelIds] = useState<Set<string>>(new Set());
  const [extractingCanonicalUrlIds, setExtractingCanonicalUrlIds] = useState<Set<string>>(new Set());
  const [seoData, setSeoData] = useState<
    Record<string, { seoTitle: string; seoDescription: string; seoKeywords: string; canonicalUrl: string }>
  >({});
  const scanFormRef = useRef<HTMLFormElement | null>(null);
  const generateFormRef = useRef<HTMLFormElement | null>(null);
  const bulkGenerateFormRef = useRef<HTMLFormElement | null>(null);
  const bulkGenerateCanonicalUrlFormRef = useRef<HTMLFormElement | null>(null);
  const bulkGenerateSeoAndCanonicalFormRef = useRef<HTMLFormElement | null>(null);
  const extractCanonicalUrlFormRef = useRef<HTMLFormElement | null>(null);
  const generateSeoAndCanonicalFormRef = useRef<HTMLFormElement | null>(null);
  const updateFormRefs = useRef<Record<string, HTMLFormElement | null>>({});
  const bulkGenerateSuccessRef = useRef(false);
  const bulkGenerateCanonicalUrlSuccessRef = useRef(false);
  const bulkGenerateSeoAndCanonicalSuccessRef = useRef(false);

  const hotels = scanState.details?.hotels ?? [];
  const regionsFromScan = scanState.details?.regions ?? [];
  const selectedRegionId = scanState.details?.selectedRegionId ?? null;
  const [currentRegionId, setCurrentRegionId] = useState<string>('ALL');
  const [regions, setRegions] = useState<Array<{ value: string; label: string }>>([]);

  // 초기 로드 시 지역 목록만 조회
  const hasLoadedRegionsRef = useRef(false);
  useEffect(() => {
    const loadRegions = async () => {
      if (hasLoadedRegionsRef.current) return;
      hasLoadedRegionsRef.current = true;
      
      try {
        const response = await fetch('/api/hotel-seo/regions');
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.regions && data.regions.length > 0) {
            setRegions(data.regions);
          }
        }
      } catch (error) {
        console.error('지역 목록 조회 실패:', error);
        hasLoadedRegionsRef.current = false; // 실패 시 다시 시도 가능하도록
      }
    };
    
    if (regions.length === 0 && regionsFromScan.length === 0) {
      loadRegions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 스캔 결과에서 지역 목록이 있으면 업데이트
  useEffect(() => {
    if (regionsFromScan.length > 0 && regionsFromScan.length !== regions.length) {
      setRegions(regionsFromScan);
    }
  }, [regionsFromScan.length, regions.length]);

  // regions 디버깅 (제거 또는 주석 처리)
  // useEffect(() => {
  //   console.log('regions 업데이트:', { regions, regionsLength: regions.length, scanStateDetails: scanState.details });
  // }, [regions, scanState.details]);

  // selectedRegionId가 변경되면 currentRegionId 업데이트
  useEffect(() => {
    if (selectedRegionId !== null && selectedRegionId !== undefined) {
      setCurrentRegionId(selectedRegionId);
    } else {
      setCurrentRegionId('ALL');
    }
  }, [selectedRegionId]);

  // 페이지 초기 로드 시 자동 스캔 제거 - 조회 버튼을 눌러야만 조회되도록 변경

  // AI SEO 생성 결과를 입력 필드에 반영
  useEffect(() => {
    if (generateState.details && generateState.status === 'success') {
      const { hotelId, seoTitle, seoDescription, seoKeywords, canonicalUrl } = generateState.details;
      const hotel = hotels.find((h) => h.id === hotelId);
      
      // 완료 알림 표시
      const hotelName = hotel?.hotelNameKo || hotel?.hotelNameEn || '호텔';
      window.alert(`AI SEO 추출이 완료되었습니다.\n\n호텔: ${hotelName}\nSEO 제목, 설명, 키워드가 생성되었습니다.`);
      
      console.log('AI SEO 생성 결과 반영:', {
        hotelId,
        seoTitle,
        seoDescription,
        seoKeywords,
        canonicalUrl,
        hotelSeoTitle: hotel?.seoTitle,
      });

      setSeoData((prev) => {
        const updated = {
          ...prev,
          [hotelId]: {
            // seoTitle이 null이 아니고 빈 문자열이 아닐 때만 사용, 그렇지 않으면 기존 값 유지
            seoTitle:
              seoTitle && seoTitle.trim() !== ''
                ? seoTitle
                : prev[hotelId]?.seoTitle !== undefined
                  ? prev[hotelId].seoTitle
                  : hotel?.seoTitle || '',
            seoDescription:
              seoDescription && seoDescription.trim() !== ''
                ? seoDescription
                : prev[hotelId]?.seoDescription !== undefined
                  ? prev[hotelId].seoDescription
                  : hotel?.seoDescription || '',
            seoKeywords:
              seoKeywords && seoKeywords.trim() !== ''
                ? seoKeywords
                : prev[hotelId]?.seoKeywords !== undefined
                  ? prev[hotelId].seoKeywords
                  : hotel?.seoKeywords || '',
            canonicalUrl:
              canonicalUrl && canonicalUrl.trim() !== ''
                ? canonicalUrl
                : prev[hotelId]?.canonicalUrl !== undefined
                  ? prev[hotelId].canonicalUrl
                  : hotel?.canonicalUrl || '',
          },
        };
        console.log('seoData 업데이트:', { hotelId, updated: updated[hotelId], received: { seoTitle, seoDescription, seoKeywords, canonicalUrl } });
        return updated;
      });
    }
  }, [generateState, hotels]);

  // AI SEO & Canonical URL 생성 결과를 입력 필드에 반영
  useEffect(() => {
    if (generateSeoAndCanonicalState.details && generateSeoAndCanonicalState.status === 'success') {
      const { hotelId, seoTitle, seoDescription, seoKeywords, canonicalUrl } = generateSeoAndCanonicalState.details;
      const hotel = hotels.find((h) => h.id === hotelId);
      
      // 완료 알림 표시
      const hotelName = hotel?.hotelNameKo || hotel?.hotelNameEn || '호텔';
      window.alert(`AI SEO & Canonical URL 생성이 완료되었습니다.\n\n호텔: ${hotelName}\nSEO 제목, 설명, 키워드 및 Canonical URL이 생성되었습니다.`);
      
      console.log('AI SEO & Canonical URL 생성 결과 반영:', {
        hotelId,
        seoTitle,
        seoDescription,
        seoKeywords,
        canonicalUrl,
        hotelSeoTitle: hotel?.seoTitle,
      });

      setSeoData((prev) => {
        const updated = {
          ...prev,
          [hotelId]: {
            // seoTitle이 null이 아니고 빈 문자열이 아닐 때만 사용, 그렇지 않으면 기존 값 유지
            seoTitle:
              seoTitle && seoTitle.trim() !== ''
                ? seoTitle
                : prev[hotelId]?.seoTitle !== undefined
                  ? prev[hotelId].seoTitle
                  : hotel?.seoTitle || '',
            seoDescription:
              seoDescription && seoDescription.trim() !== ''
                ? seoDescription
                : prev[hotelId]?.seoDescription !== undefined
                  ? prev[hotelId].seoDescription
                  : hotel?.seoDescription || '',
            seoKeywords:
              seoKeywords && seoKeywords.trim() !== ''
                ? seoKeywords
                : prev[hotelId]?.seoKeywords !== undefined
                  ? prev[hotelId].seoKeywords
                  : hotel?.seoKeywords || '',
            canonicalUrl:
              canonicalUrl && canonicalUrl.trim() !== ''
                ? canonicalUrl
                : prev[hotelId]?.canonicalUrl !== undefined
                  ? prev[hotelId].canonicalUrl
                  : hotel?.canonicalUrl || '',
          },
        };
        console.log('seoData 업데이트 (generateSeoAndCanonical):', { hotelId, updated: updated[hotelId], received: { seoTitle, seoDescription, seoKeywords, canonicalUrl } });
        return updated;
      });

      // 성공 시 호텔 목록 새로고침
      if (scanFormRef.current) {
        const formData = new FormData(scanFormRef.current);
        formData.set('regionId', currentRegionId);
        startTransition(() => {
          scanFormAction(formData);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [generateSeoAndCanonicalState.status, generateSeoAndCanonicalState.details?.hotelId, currentRegionId]);

  // 펼쳐진 호텔의 초기 SEO 데이터 설정
  useEffect(() => {
    hotels.forEach((hotel) => {
      if (expandedHotelIds.has(hotel.id) && !seoData[hotel.id]) {
        setSeoData((prev) => ({
          ...prev,
          [hotel.id]: {
            seoTitle: hotel.seoTitle ?? '',
            seoDescription: hotel.seoDescription ?? '',
            seoKeywords: hotel.seoKeywords ?? '',
            canonicalUrl: hotel.canonicalUrl ?? '',
          },
        }));
      }
    });
  }, [expandedHotelIds, hotels, seoData]);

  // 일괄 생성 완료 시 호텔 목록 새로고침
  useEffect(() => {
    if (bulkGenerateState.status === 'success' && bulkGenerateState.details && bulkGenerateState.details.generated > 0 && !bulkGenerateSuccessRef.current) {
      bulkGenerateSuccessRef.current = true;
      // 완료 알림 표시 (전체 일괄 생성 완료 후 한 번만)
      const { generated, total, skipped, errors } = bulkGenerateState.details;
      window.alert(`AI SEO 일괄 생성이 완료되었습니다.\n\n총 ${total}개 중 ${generated}개 생성 완료\n${skipped > 0 ? `건너뜀: ${skipped}개\n` : ''}${errors.length > 0 ? `오류: ${errors.length}개` : ''}`);
      
      if (scanFormRef.current) {
        const formData = new FormData(scanFormRef.current);
        formData.set('regionId', currentRegionId);
        startTransition(() => {
          scanFormAction(formData);
        });
      }
    } else if (bulkGenerateState.status !== 'success') {
      bulkGenerateSuccessRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkGenerateState.status, bulkGenerateState.details, currentRegionId]);

  // Canonical URL 일괄 생성 완료 시 호텔 목록 새로고침
  useEffect(() => {
    if (
      bulkGenerateCanonicalUrlState.status === 'success' &&
      bulkGenerateCanonicalUrlState.details &&
      bulkGenerateCanonicalUrlState.details.generated > 0 &&
      !bulkGenerateCanonicalUrlSuccessRef.current
    ) {
      bulkGenerateCanonicalUrlSuccessRef.current = true;
      // 완료 알림 표시 (전체 일괄 생성 완료 후 한 번만)
      const { generated, total, skipped, errors } = bulkGenerateCanonicalUrlState.details;
      window.alert(`Canonical URL 일괄 생성이 완료되었습니다.\n\n총 ${total}개 중 ${generated}개 생성 완료\n${skipped > 0 ? `건너뜀: ${skipped}개\n` : ''}${errors.length > 0 ? `오류: ${errors.length}개` : ''}`);
      
      if (scanFormRef.current) {
        const formData = new FormData(scanFormRef.current);
        formData.set('regionId', currentRegionId);
        startTransition(() => {
          scanFormAction(formData);
        });
      }
    } else if (bulkGenerateCanonicalUrlState.status !== 'success') {
      bulkGenerateCanonicalUrlSuccessRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkGenerateCanonicalUrlState.status, bulkGenerateCanonicalUrlState.details, currentRegionId]);

  // AI SEO & Canonical URL 일괄 생성 완료 시 호텔 목록 새로고침
  useEffect(() => {
    if (
      bulkGenerateSeoAndCanonicalState.status === 'success' &&
      bulkGenerateSeoAndCanonicalState.details &&
      bulkGenerateSeoAndCanonicalState.details.generated > 0 &&
      !bulkGenerateSeoAndCanonicalSuccessRef.current
    ) {
      bulkGenerateSeoAndCanonicalSuccessRef.current = true;
      // 완료 알림 표시 (전체 일괄 생성 완료 후 한 번만)
      const { generated, total, skipped, errors } = bulkGenerateSeoAndCanonicalState.details;
      window.alert(`AI SEO & Canonical URL 일괄 생성이 완료되었습니다.\n\n총 ${total}개 중 ${generated}개 생성 완료\n${skipped > 0 ? `건너뜀: ${skipped}개\n` : ''}${errors.length > 0 ? `오류: ${errors.length}개` : ''}`);
      
      if (scanFormRef.current) {
        const formData = new FormData(scanFormRef.current);
        formData.set('regionId', currentRegionId);
        startTransition(() => {
          scanFormAction(formData);
        });
      }
    } else if (bulkGenerateSeoAndCanonicalState.status !== 'success') {
      bulkGenerateSeoAndCanonicalSuccessRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bulkGenerateSeoAndCanonicalState.status, bulkGenerateSeoAndCanonicalState.details, currentRegionId]);

  useEffect(() => {
    if (selectedRegionId !== null && selectedRegionId !== undefined) {
      setCurrentRegionId(selectedRegionId);
    }
  }, [selectedRegionId]);

  const handleRegionChange = (regionId: string) => {
    setCurrentRegionId(regionId);
    setExpandedHotelIds(new Set());
    setSelectedSeoHotelIds(new Set());
    if (!scanFormRef.current) return;
    const formData = new FormData(scanFormRef.current);
    formData.set('regionId', regionId);
    startTransition(() => {
      scanFormAction(formData);
    });
  };

  const toggleExpand = (hotelId: string) => {
    setExpandedHotelIds((prev) => {
      const next = new Set(prev);
      if (next.has(hotelId)) {
        next.delete(hotelId);
      } else {
        next.add(hotelId);
        const hotel = hotels.find((h) => h.id === hotelId);
        if (hotel && !seoData[hotelId]) {
          setSeoData((prevData) => ({
            ...prevData,
            [hotelId]: {
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

  const handleUpdate = (hotelId: string) => {
    const form = updateFormRefs.current[hotelId];
    if (!form) return;
    form.requestSubmit();
  };

  const handleGenerateSeo = (hotelId: string) => {
    if (!generateFormRef.current) return;
    const formData = new FormData(generateFormRef.current);
    formData.set('hotelId', hotelId);
    startTransition(() => {
      generateFormAction(formData);
    });
  };

  const handleGenerateSeoAndCanonical = (hotelId: string) => {
    if (!generateSeoAndCanonicalFormRef.current) return;
    const formData = new FormData(generateSeoAndCanonicalFormRef.current);
    formData.set('hotelId', hotelId);
    startTransition(() => {
      generateSeoAndCanonicalFormAction(formData);
    });
  };

  const toggleSeoSelection = (hotelId: string) => {
    setSelectedSeoHotelIds((prev) => {
      const next = new Set(prev);
      if (next.has(hotelId)) next.delete(hotelId);
      else next.add(hotelId);
      return next;
    });
  };

  const toggleAllSeoSelectionOnPage = () => {
    if (hotels.length === 0) return;
    setSelectedSeoHotelIds((prev) => {
      const pageIds = hotels.map((h) => h.id);
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

  const pageAllSeoSelected = hotels.length > 0 && hotels.every((h) => selectedSeoHotelIds.has(h.id));

  const handleBulkGenerateSeo = () => {
    if (selectedSeoHotelIds.size === 0) {
      window.alert('호텔을 선택해주세요.');
      return;
    }
    
    // FormData 직접 생성하여 서버 액션 호출
    const formData = new FormData();
    Array.from(selectedSeoHotelIds).forEach((id) => {
      formData.append('hotelIds', id);
    });
    
    startTransition(() => {
      bulkGenerateFormAction(formData);
    });
  };

  const handleBulkGenerateCanonicalUrl = () => {
    if (selectedSeoHotelIds.size === 0) {
      console.warn('Canonical URL 일괄 생성 실패: 선택된 호텔이 없습니다.');
      window.alert('호텔을 선택해주세요.');
      return;
    }
    
    console.log('Canonical URL 일괄 생성 시작:', { selectedIds: Array.from(selectedSeoHotelIds) });
    
    // FormData 직접 생성하여 서버 액션 호출
    const formData = new FormData();
    Array.from(selectedSeoHotelIds).forEach((id) => {
      formData.append('hotelIds', id);
    });
    
    startTransition(() => {
      bulkGenerateCanonicalUrlFormAction(formData);
    });
  };

  const handleBulkGenerateSeoAndCanonical = () => {
    if (selectedSeoHotelIds.size === 0) {
      window.alert('호텔을 선택해주세요.');
      return;
    }
    
    // FormData 직접 생성하여 서버 액션 호출
    const formData = new FormData();
    Array.from(selectedSeoHotelIds).forEach((id) => {
      formData.append('hotelIds', id);
    });
    
    startTransition(() => {
      bulkGenerateSeoAndCanonicalFormAction(formData);
    });
  };

  const handleExtractCanonicalUrl = (hotelId: string) => {
    const hotel = hotels.find((h) => h.id === hotelId);
    if (!hotel) {
      console.warn('Canonical URL 추출 실패: 호텔을 찾을 수 없습니다.', { hotelId });
      return;
    }

    if (!hotel.hotelSlug && !hotel.hotelId) {
      console.warn('Canonical URL 추출 실패: hotel_slug와 hotel_id가 모두 없습니다.', {
        hotelId,
        hotel: { id: hotel.id, hotelSlug: hotel.hotelSlug, hotelId: hotel.hotelId },
      });
      return;
    }

    setExtractingCanonicalUrlIds((prev) => new Set(prev).add(hotelId));

    if (!extractCanonicalUrlFormRef.current) return;
    const formData = new FormData(extractCanonicalUrlFormRef.current);
    formData.set('hotelId', hotelId);
    startTransition(() => {
      extractCanonicalUrlFormAction(formData);
    });
  };

  // Canonical URL 추출 결과를 입력 필드에 반영
  useEffect(() => {
    if (extractCanonicalUrlState.status === 'success' && extractCanonicalUrlState.canonicalUrl) {
      // hotelId를 state에서 직접 가져오거나 formData에서 가져오기
      const hotelId = extractCanonicalUrlState.hotelId || (extractCanonicalUrlFormRef.current ? String(new FormData(extractCanonicalUrlFormRef.current).get('hotelId') ?? '').trim() : '');
      
      if (hotelId) {
        const hotel = hotels.find((h) => h.id === hotelId);
        
        // 완료 알림 표시
        const hotelName = hotel?.hotelNameKo || hotel?.hotelNameEn || '호텔';
        window.alert(`Canonical URL 추출이 완료되었습니다.\n\n호텔: ${hotelName}\nCanonical URL: ${extractCanonicalUrlState.canonicalUrl}`);
        
        setSeoData((prev) => ({
          ...prev,
          [hotelId]: {
            ...(prev[hotelId] ?? {
              seoTitle: hotel?.seoTitle ?? '',
              seoDescription: hotel?.seoDescription ?? '',
              seoKeywords: hotel?.seoKeywords ?? '',
              canonicalUrl: hotel?.canonicalUrl ?? '',
            }),
            canonicalUrl: extractCanonicalUrlState.canonicalUrl ?? '',
          },
        }));
        setExtractingCanonicalUrlIds((prev) => {
          const next = new Set(prev);
          next.delete(hotelId);
          return next;
        });
      }
    } else if (extractCanonicalUrlState.status === 'error') {
      // 에러 발생 시 추출 중 상태 해제
      const hotelId = extractCanonicalUrlState.hotelId || (extractCanonicalUrlFormRef.current ? String(new FormData(extractCanonicalUrlFormRef.current).get('hotelId') ?? '').trim() : '');
      
      if (hotelId) {
        setExtractingCanonicalUrlIds((prev) => {
          const next = new Set(prev);
          next.delete(hotelId);
          return next;
        });
        // 에러 알림 표시
        window.alert(`Canonical URL 추출 중 오류가 발생했습니다.\n\n${extractCanonicalUrlState.message}`);
      }
    }
  }, [extractCanonicalUrlState, hotels]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>SEO 데이터 조회</CardTitle>
          <CardDescription>호텔 목록을 조회하여 SEO 데이터를 확인하고 수정할 수 있습니다.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <form ref={scanFormRef} action={scanFormAction} className="space-y-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="scanRegion">지역 필터</Label>
                <select
                  id="scanRegion"
                  name="regionId"
                  value={currentRegionId}
                  onChange={(e) => handleRegionChange(e.target.value)}
                  disabled={isScanPending}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="ALL">전체 지역</option>
                  {regions && regions.length > 0 ? (
                    regions.map((region) => (
                      <option key={region.value} value={region.value}>
                        {region.label}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      지역 데이터 로딩 중...
                    </option>
                  )}
                </select>
              </div>
              <div className="flex items-end">
                <Button type="submit" disabled={isScanPending} className="w-full" variant="outline">
                  {isScanPending ? '조회 중...' : '호텔 목록 조회'}
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
            {Array.from(selectedSeoHotelIds).map((id) => (
              <input key={id} type="hidden" name="hotelIds" value={id} />
            ))}
          </form>

          {/* Canonical URL 일괄 생성 폼 */}
          <form ref={bulkGenerateCanonicalUrlFormRef} action={bulkGenerateCanonicalUrlFormAction} className="hidden">
            {Array.from(selectedSeoHotelIds).map((id) => (
              <input key={id} type="hidden" name="hotelIds" value={id} />
            ))}
          </form>

          {/* AI SEO & Canonical URL 일괄 생성 폼 */}
          <form ref={bulkGenerateSeoAndCanonicalFormRef} action={bulkGenerateSeoAndCanonicalFormAction} className="hidden">
            {Array.from(selectedSeoHotelIds).map((id) => (
              <input key={id} type="hidden" name="hotelIds" value={id} />
            ))}
          </form>

          {/* Canonical URL 추출 폼 */}
          <form ref={extractCanonicalUrlFormRef} action={extractCanonicalUrlFormAction} className="hidden">
            <input type="hidden" name="hotelId" value="" />
          </form>

          {/* AI SEO & Canonical URL 생성 폼 */}
          <form ref={generateSeoAndCanonicalFormRef} action={generateSeoAndCanonicalFormAction} className="hidden">
            <input type="hidden" name="hotelId" value="" />
          </form>

          {hotels.length > 0 ? (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-4">
                  <p className="text-xs text-muted-foreground">
                    조회된 호텔: <span className="font-medium text-foreground">{hotels.length.toLocaleString()}</span>개
                  </p>
                  <p className="text-xs text-muted-foreground">
                    선택된 호텔: <span className="font-medium text-foreground">{selectedSeoHotelIds.size}</span>개
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={isScanPending || hotels.length === 0}
                    onClick={toggleAllSeoSelectionOnPage}
                  >
                    {pageAllSeoSelected ? '전체 선택 해제' : '전체 선택'}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={isBulkGenerateSeoAndCanonicalPending || selectedSeoHotelIds.size === 0}
                    onClick={handleBulkGenerateSeoAndCanonical}
                  >
                    {isBulkGenerateSeoAndCanonicalPending
                      ? `AI SEO & Canonical 생성 중... (${selectedSeoHotelIds.size})`
                      : `AI SEO & Canonical URL 일괄 생성 (${selectedSeoHotelIds.size})`}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={isBulkGeneratePending || selectedSeoHotelIds.size === 0}
                    onClick={handleBulkGenerateSeo}
                  >
                    {isBulkGeneratePending
                      ? `AI SEO 추출 중... (${selectedSeoHotelIds.size})`
                      : `AI SEO 추출 (${selectedSeoHotelIds.size})`}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="default"
                    disabled={isBulkGenerateCanonicalUrlPending || selectedSeoHotelIds.size === 0}
                    onClick={handleBulkGenerateCanonicalUrl}
                  >
                    {isBulkGenerateCanonicalUrlPending
                      ? `Canonical URL 생성 중... (${selectedSeoHotelIds.size})`
                      : `Canonical URL 일괄 생성 (${selectedSeoHotelIds.size})`}
                  </Button>
                </div>
              </div>

              {/* 호텔 목록 */}
              <div className="rounded-md border border-border bg-background">
                <div className="px-4 py-2 border-b border-border bg-muted/30 flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                      checked={pageAllSeoSelected && hotels.length > 0}
                      onChange={toggleAllSeoSelectionOnPage}
                      disabled={isScanPending || hotels.length === 0}
                      aria-label="전체 선택"
                    />
                    <span>SEO 선택</span>
                  </div>
                </div>
                <div className="divide-y divide-border">
                  {hotels.map((hotel) => {
                    const isExpanded = expandedHotelIds.has(hotel.id);
                    const isGenerating = isGeneratePending && generateState.details?.hotelId === hotel.id;
                    const isOtherGenerating = isGeneratePending && generateState.details?.hotelId !== hotel.id;
                    const isGeneratingSeoAndCanonical =
                      isGenerateSeoAndCanonicalPending && generateSeoAndCanonicalState.details?.hotelId === hotel.id;
                    const isOtherGeneratingSeoAndCanonical =
                      isGenerateSeoAndCanonicalPending && generateSeoAndCanonicalState.details?.hotelId !== hotel.id;
                    const isSelectedForSeo = selectedSeoHotelIds.has(hotel.id);
                    return (
                      <div key={hotel.id}>
                        {/* 호텔 레코드 */}
                        <div className="p-4">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2 pt-0.5">
                              <input
                                type="checkbox"
                                className="h-4 w-4 rounded border-input text-primary focus:ring-ring"
                                checked={isSelectedForSeo}
                                onChange={() => toggleSeoSelection(hotel.id)}
                                aria-label="SEO 데이터 조회 선택"
                              />
                            </div>
                            <div className="flex-1 space-y-1 min-w-0">
                              <p className="text-sm font-medium text-foreground">
                                {hotel.hotelNameKo || hotel.hotelNameEn || '(호텔명 없음)'}
                              </p>
                              <p className="text-xs text-muted-foreground break-all">
                                {hotel.hotelNameEn && hotel.hotelNameKo ? (
                                  <>
                                    <span className="font-mono">{hotel.hotelNameEn}</span>
                                    <span className="ml-2">•</span>
                                  </>
                                ) : null}
                                {hotel.regionNameKo ? <span className="ml-2">{hotel.regionNameKo}</span> : null}
                                {hotel.hotelId ? <span className="ml-2">• ID: {hotel.hotelId}</span> : null}
                                {hotel.createdAt ? <span className="ml-2">• {hotel.createdAt}</span> : null}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <Button
                                type="button"
                                size="sm"
                                variant={isExpanded ? 'default' : 'outline'}
                                onClick={() => toggleExpand(hotel.id)}
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
                                      'px-4 py-2 text-sm font-medium border-b-2 transition-colors',
                                      'border-primary text-primary',
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
                                      {seoData[hotel.id]?.seoTitle ||
                                        hotel.seoTitle ||
                                        hotel.hotelNameKo ||
                                        hotel.hotelNameEn ||
                                        '(제목 없음)'}
                                    </div>
                                    <div className="text-green-600 text-xs mt-1">
                                      {(seoData[hotel.id]?.seoTitle ||
                                        hotel.seoTitle ||
                                        hotel.hotelNameKo ||
                                        hotel.hotelNameEn ||
                                        '').length}{' '}
                                      characters
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
                                      {seoData[hotel.id]?.seoDescription || hotel.seoDescription || '(설명 없음)'}
                                    </div>
                                    <div className="text-green-600 text-xs mt-1">
                                      {(seoData[hotel.id]?.seoDescription || hotel.seoDescription || '').length} characters
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
                                    <div
                                      className={cn(
                                        'text-foreground wrap-break-word',
                                        !seoData[hotel.id]?.seoKeywords && !hotel.seoKeywords && 'text-muted-foreground',
                                      )}
                                    >
                                      {seoData[hotel.id]?.seoKeywords || hotel.seoKeywords || 'Keywords are missing!'}
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
                                        const baseUrl = 'https://allstay.com';
                                        const hotelSlug = hotel.hotelSlug || '';
                                        const hotelId = hotel.hotelId || '';
                                        // regionId가 있으면 region_slug는 서버에서 조회해야 하므로 간단히 표시
                                        return hotelSlug
                                          ? `${baseUrl}/[region_slug]/${hotelSlug}`
                                          : hotelId
                                            ? `${baseUrl}/hotel/${hotelId}`
                                            : '-';
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
                                      {seoData[hotel.id]?.canonicalUrl ||
                                        hotel.canonicalUrl ||
                                        (() => {
                                          const baseUrl = 'https://allstay.com';
                                          const hotelSlug = hotel.hotelSlug || '';
                                          const hotelId = hotel.hotelId || '';
                                          // regionId가 있으면 region_slug는 서버에서 조회해야 하므로 간단히 표시
                                          return hotelSlug
                                            ? `${baseUrl}/[region_slug]/${hotelSlug}`
                                            : hotelId
                                              ? `${baseUrl}/hotel/${hotelId}`
                                              : '-';
                                        })()}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            <form
                              ref={(el) => {
                                updateFormRefs.current[hotel.id] = el;
                              }}
                              action={updateFormAction}
                              className="space-y-4"
                            >
                              <div className="space-y-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`seoTitle_${hotel.id}`}>SEO 제목</Label>
                                  <Input
                                    id={`seoTitle_${hotel.id}`}
                                    name={`seoTitle_${hotel.id}`}
                                    value={
                                      seoData[hotel.id]?.seoTitle !== undefined
                                        ? seoData[hotel.id].seoTitle
                                        : hotel.seoTitle ?? ''
                                    }
                                    onChange={(e) => {
                                      setSeoData((prev) => ({
                                        ...prev,
                                        [hotel.id]: {
                                          ...(prev[hotel.id] ?? {
                                            seoTitle: hotel.seoTitle ?? '',
                                            seoDescription: hotel.seoDescription ?? '',
                                            seoKeywords: hotel.seoKeywords ?? '',
                                            canonicalUrl: hotel.canonicalUrl ?? '',
                                          }),
                                          seoTitle: e.target.value,
                                        },
                                      }));
                                    }}
                                    placeholder={`SEO 제목을 입력하세요${hotel.hotelNameKo || hotel.hotelNameEn ? ` (호텔명: ${hotel.hotelNameKo || hotel.hotelNameEn})` : ''}`}
                                    className="font-medium"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`seoDescription_${hotel.id}`}>SEO 설명</Label>
                                  <Textarea
                                    id={`seoDescription_${hotel.id}`}
                                    name={`seoDescription_${hotel.id}`}
                                    value={seoData[hotel.id]?.seoDescription ?? ''}
                                    onChange={(e) => {
                                      setSeoData((prev) => ({
                                        ...prev,
                                        [hotel.id]: {
                                          ...(prev[hotel.id] ?? {
                                            seoTitle: hotel.seoTitle ?? '',
                                            seoDescription: hotel.seoDescription ?? '',
                                            seoKeywords: hotel.seoKeywords ?? '',
                                            canonicalUrl: hotel.canonicalUrl ?? '',
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
                                  <Label htmlFor={`seoKeywords_${hotel.id}`}>SEO 키워드</Label>
                                  <Input
                                    id={`seoKeywords_${hotel.id}`}
                                    name={`seoKeywords_${hotel.id}`}
                                    value={seoData[hotel.id]?.seoKeywords ?? ''}
                                    onChange={(e) => {
                                      setSeoData((prev) => ({
                                        ...prev,
                                        [hotel.id]: {
                                          ...(prev[hotel.id] ?? {
                                            seoTitle: hotel.seoTitle ?? '',
                                            seoDescription: hotel.seoDescription ?? '',
                                            seoKeywords: hotel.seoKeywords ?? '',
                                            canonicalUrl: hotel.canonicalUrl ?? '',
                                          }),
                                          seoKeywords: e.target.value,
                                        },
                                      }));
                                    }}
                                    placeholder="키워드를 쉼표로 구분하여 입력하세요 (예: 호텔, 도쿄, 추천)"
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label htmlFor={`canonicalUrl_${hotel.id}`}>Canonical URL</Label>
                                  <Input
                                    id={`canonicalUrl_${hotel.id}`}
                                    name={`canonicalUrl_${hotel.id}`}
                                    value={seoData[hotel.id]?.canonicalUrl ?? ''}
                                    onChange={(e) => {
                                      setSeoData((prev) => ({
                                        ...prev,
                                        [hotel.id]: {
                                          ...(prev[hotel.id] ?? {
                                            seoTitle: hotel.seoTitle ?? '',
                                            seoDescription: hotel.seoDescription ?? '',
                                            seoKeywords: hotel.seoKeywords ?? '',
                                            canonicalUrl: hotel.canonicalUrl ?? '',
                                          }),
                                          canonicalUrl: e.target.value,
                                        },
                                      }));
                                    }}
                                    placeholder="https://allstay.com/hotel/..."
                                    className="font-mono text-xs"
                                  />
                                  <p className="text-xs text-muted-foreground">
                                    비워두면 기본 URL이 사용됩니다. (형식:{' '}
                                    {hotel.hotelSlug
                                      ? `/{region_slug}/${hotel.hotelSlug}`
                                      : hotel.hotelId
                                        ? `/hotel/${hotel.hotelId}`
                                        : '...'}
                                    )
                                  </p>
                                </div>
                              </div>

                              <input type="hidden" name="hotelId" value={hotel.id} />

                              <div className="flex justify-end gap-2">
                                <Button
                                  type="button"
                                  variant="default"
                                  disabled={
                                    isGeneratingSeoAndCanonical ||
                                    isOtherGeneratingSeoAndCanonical ||
                                    isGenerating ||
                                    isOtherGenerating
                                  }
                                  onClick={() => handleGenerateSeoAndCanonical(hotel.id)}
                                  className={cn(
                                    'text-purple-600 hover:text-purple-700 hover:bg-purple-50',
                                    isGeneratingSeoAndCanonical && 'opacity-75',
                                  )}
                                >
                                  {isGeneratingSeoAndCanonical ? '생성 중...' : 'AI SEO & Canonical URL 생성'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={
                                    isGenerating ||
                                    isOtherGenerating ||
                                    isGeneratingSeoAndCanonical ||
                                    isOtherGeneratingSeoAndCanonical
                                  }
                                  onClick={() => handleGenerateSeo(hotel.id)}
                                  className={cn(
                                    'text-blue-600 hover:text-blue-700 hover:bg-blue-50 min-w-[140px]',
                                    isGenerating && 'opacity-75',
                                  )}
                                >
                                  {isGenerating ? 'AI SEO 추출중...' : 'AI SEO 추출'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={
                                    (!hotel.hotelSlug && !hotel.hotelId) ||
                                    extractingCanonicalUrlIds.has(hotel.id) ||
                                    isGeneratingSeoAndCanonical ||
                                    isOtherGeneratingSeoAndCanonical
                                  }
                                  onClick={() => handleExtractCanonicalUrl(hotel.id)}
                                  className={cn(
                                    'text-green-600 hover:text-green-700 hover:bg-green-50',
                                    extractingCanonicalUrlIds.has(hotel.id) && 'opacity-75',
                                  )}
                                >
                                  {extractingCanonicalUrlIds.has(hotel.id) ? '추출 중...' : 'Canonical URL 추출'}
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  disabled={
                                    isGenerating ||
                                    isOtherGenerating ||
                                    isGeneratingSeoAndCanonical ||
                                    isOtherGeneratingSeoAndCanonical
                                  }
                                  onClick={() => toggleExpand(hotel.id)}
                                >
                                  취소
                                </Button>
                                <Button
                                  type="submit"
                                  disabled={
                                    isUpdatePending ||
                                    isGenerating ||
                                    isOtherGenerating ||
                                    isGeneratingSeoAndCanonical ||
                                    isOtherGeneratingSeoAndCanonical
                                  }
                                  className="min-w-32"
                                >
                                  {isUpdatePending ? '저장 중...' : '저장'}
                                </Button>
                              </div>
                            </form>

                            {/* AI SEO 생성 결과 메시지 */}
                            {generateState.details?.hotelId === hotel.id && generateState.message ? (
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

                            {/* AI SEO & Canonical URL 생성 결과 메시지 */}
                            {generateSeoAndCanonicalState.details?.hotelId === hotel.id &&
                            generateSeoAndCanonicalState.message ? (
                              <div className="mt-2 pt-2 border-t border-border">
                                <p
                                  className={cn(
                                    'text-sm',
                                    generateSeoAndCanonicalState.status === 'success' && 'text-green-600',
                                    generateSeoAndCanonicalState.status === 'error' && 'text-red-600',
                                  )}
                                >
                                  {generateSeoAndCanonicalState.message}
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
                <input type="hidden" name="hotelId" value="" />
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
                            [{err.hotelId}] {err.error}
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
                            [{err.hotelId}] {err.error}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          ) : null}

          {/* AI SEO & Canonical URL 일괄 생성 결과 */}
          {bulkGenerateSeoAndCanonicalState.message ? (
            <div className="rounded-md border border-border bg-muted/30 p-4 space-y-3">
              <p
                className={cn(
                  'text-sm font-medium',
                  bulkGenerateSeoAndCanonicalState.status === 'success' && 'text-green-600',
                  bulkGenerateSeoAndCanonicalState.status === 'error' && 'text-red-600',
                  bulkGenerateSeoAndCanonicalState.status === 'idle' && 'text-muted-foreground',
                )}
              >
                {bulkGenerateSeoAndCanonicalState.message}
              </p>
              {bulkGenerateSeoAndCanonicalState.details ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                    <div>
                      <span className="text-muted-foreground">전체:</span>{' '}
                      <span className="font-medium">
                        {bulkGenerateSeoAndCanonicalState.details.total.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">생성:</span>{' '}
                      <span className="font-medium text-green-600">
                        {bulkGenerateSeoAndCanonicalState.details.generated.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">스킵:</span>{' '}
                      <span className="font-medium">
                        {bulkGenerateSeoAndCanonicalState.details.skipped.toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">오류:</span>{' '}
                      <span className="font-medium text-red-600">
                        {bulkGenerateSeoAndCanonicalState.details.errors.length.toLocaleString()}
                      </span>
                    </div>
                  </div>
                  {bulkGenerateSeoAndCanonicalState.details.errors.length > 0 ? (
                    <div className="mt-3 space-y-1">
                      <p className="text-sm font-medium text-red-600">오류 목록:</p>
                      <ul className="text-xs text-muted-foreground space-y-1 ml-4 max-h-40 overflow-y-auto">
                        {bulkGenerateSeoAndCanonicalState.details.errors.map((err, idx) => (
                          <li key={idx}>
                            [{err.hotelId}] {err.error}
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
