"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Edit, 
  Trash2, 
  Save, 
  X, 
  Calendar,
  MapPin,
  Users
} from "lucide-react";
import HotelSearchWidget from "@/components/shared/hotel-search-widget";

interface Promotion {
  id: number;
  promotion_id: string;
  promotion: string;
  promotion_description: string | null;
  booking_date: string | null;
  check_in_date: string | null;
  created_at: string;
  updated_at: string;
}

interface MappedHotel {
  sabre_id: string;
  property_name_ko: string | null;
  property_name_en: string | null;
  slug: string | null;
}

export function PromotionManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingPromotion, setEditingPromotion] = useState<Promotion | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null);
  const [mappedHotels, setMappedHotels] = useState<MappedHotel[]>([]);
  const [showHotelMapping, setShowHotelMapping] = useState(false);

  // 폼 데이터
  const [formData, setFormData] = useState({
    promotion_id: "",
    promotion: "",
    promotion_description: "",
    booking_date: "",
    check_in_date: "",
  });

  // 프로모션 목록 조회
  const fetchPromotions = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/promotions/list");
      const data = await response.json();
      
      if (data.success) {
        setPromotions(data.data.promotions);
      } else {
        console.error("프로모션 조회 실패:", data.error);
      }
    } catch (error) {
      console.error("프로모션 조회 오류:", error);
    } finally {
      setLoading(false);
    }
  };

  // 프로모션에 연결된 호텔 조회
  const fetchMappedHotels = async (promotionId: string) => {
    try {
      const response = await fetch(`/api/promotions/hotels?promotionId=${promotionId}`);
      const data = await response.json();
      
      if (data.success) {
        setMappedHotels(data.data.hotels);
      } else {
        console.error("연결된 호텔 조회 실패:", data.error);
      }
    } catch (error) {
      console.error("연결된 호텔 조회 오류:", error);
    }
  };

  useEffect(() => {
    fetchPromotions();
  }, []);

  // 프로모션 생성
  const handleCreate = async () => {
    if (!formData.promotion_id || !formData.promotion) {
      alert("프로모션 ID와 프로모션명은 필수입니다.");
      return;
    }

    try {
      const response = await fetch("/api/promotions/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      
      if (data.success) {
        alert("프로모션이 성공적으로 생성되었습니다.");
        fetchPromotions();
        resetForm();
      } else {
        alert(`프로모션 생성 실패: ${data.error}`);
      }
    } catch (error) {
      console.error("프로모션 생성 오류:", error);
      alert("프로모션 생성 중 오류가 발생했습니다.");
    }
  };

  // 프로모션 업데이트
  const handleUpdate = async () => {
    if (!editingPromotion || !formData.promotion_id || !formData.promotion) {
      alert("프로모션 ID와 프로모션명은 필수입니다.");
      return;
    }

    try {
      const response = await fetch("/api/promotions/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingPromotion.id,
          ...formData,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert("프로모션이 성공적으로 업데이트되었습니다.");
        fetchPromotions();
        resetForm();
      } else {
        alert(`프로모션 업데이트 실패: ${data.error}`);
      }
    } catch (error) {
      console.error("프로모션 업데이트 오류:", error);
      alert("프로모션 업데이트 중 오류가 발생했습니다.");
    }
  };

  // 프로모션 삭제
  const handleDelete = async (promotion: Promotion) => {
    if (!confirm(`프로모션 "${promotion.promotion}"을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/promotions/delete?id=${promotion.id}`, {
        method: "DELETE",
      });

      const data = await response.json();
      
      if (data.success) {
        alert("프로모션이 성공적으로 삭제되었습니다.");
        fetchPromotions();
      } else {
        alert(`프로모션 삭제 실패: ${data.error}`);
      }
    } catch (error) {
      console.error("프로모션 삭제 오류:", error);
      alert("프로모션 삭제 중 오류가 발생했습니다.");
    }
  };

  // 폼 리셋
  const resetForm = () => {
    setFormData({
      promotion_id: "",
      promotion: "",
      promotion_description: "",
      booking_date: "",
      check_in_date: "",
    });
    setEditingPromotion(null);
    setIsCreating(false);
  };

  // 편집 모드 시작
  const startEdit = (promotion: Promotion) => {
    setFormData({
      promotion_id: promotion.promotion_id,
      promotion: promotion.promotion,
      promotion_description: promotion.promotion_description || "",
      booking_date: promotion.booking_date || "",
      check_in_date: promotion.check_in_date || "",
    });
    setEditingPromotion(promotion);
    setIsCreating(false);
  };

  // 생성 모드 시작
  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  // 호텔 매핑 모드 시작
  const startHotelMapping = (promotion: Promotion) => {
    setSelectedPromotion(promotion);
    setShowHotelMapping(true);
    fetchMappedHotels(promotion.promotion_id);
  };

  // 호텔 연결
  const handleConnectHotel = async (sabreId: string) => {
    if (!selectedPromotion) return;

    try {
      const response = await fetch("/api/promotions/hotels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promotionId: selectedPromotion.promotion_id,
          sabreId: sabreId,
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        alert("호텔이 성공적으로 연결되었습니다.");
        fetchMappedHotels(selectedPromotion.promotion_id);
      } else {
        alert(`호텔 연결 실패: ${data.error}`);
      }
    } catch (error) {
      console.error("호텔 연결 오류:", error);
      alert("호텔 연결 중 오류가 발생했습니다.");
    }
  };

  // 호텔 연결 해제
  const handleDisconnectHotel = async (sabreId: string) => {
    if (!selectedPromotion) return;

    if (!confirm("이 호텔을 프로모션에서 연결 해제하시겠습니까?")) {
      return;
    }

    try {
      const response = await fetch(
        `/api/promotions/hotels?promotionId=${selectedPromotion.promotion_id}&sabreId=${sabreId}`,
        { method: "DELETE" }
      );

      const data = await response.json();
      
      if (data.success) {
        alert("호텔이 성공적으로 연결 해제되었습니다.");
        fetchMappedHotels(selectedPromotion.promotion_id);
      } else {
        alert(`호텔 연결 해제 실패: ${data.error}`);
      }
    } catch (error) {
      console.error("호텔 연결 해제 오류:", error);
      alert("호텔 연결 해제 중 오류가 발생했습니다.");
    }
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">프로모션 관리</h1>
        <Button onClick={startCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          프로모션 추가
        </Button>
      </div>

      {/* 프로모션 생성/편집 폼 */}
      {(isCreating || editingPromotion) && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">
            {isCreating ? "새 프로모션 생성" : "프로모션 편집"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로모션 ID *
              </label>
              <Input
                value={formData.promotion_id}
                onChange={(e) => setFormData({ ...formData, promotion_id: e.target.value })}
                placeholder="예: PROMO202501"
                disabled={!!editingPromotion}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로모션명 *
              </label>
              <Input
                value={formData.promotion}
                onChange={(e) => setFormData({ ...formData, promotion: e.target.value })}
                placeholder="예: 신년 특가 프로모션"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                프로모션 설명
              </label>
              <textarea
                value={formData.promotion_description}
                onChange={(e) => setFormData({ ...formData, promotion_description: e.target.value })}
                placeholder="프로모션에 대한 상세 설명을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                예약 기간
              </label>
              <Input
                type="date"
                value={formData.booking_date}
                onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                체크인 기간
              </label>
              <Input
                type="date"
                value={formData.check_in_date}
                onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value })}
              />
            </div>
          </div>
          
          <div className="flex gap-2 mt-6">
            <Button 
              onClick={isCreating ? handleCreate : handleUpdate}
              className="flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {isCreating ? "생성" : "저장"}
            </Button>
            <Button variant="outline" onClick={resetForm}>
              <X className="h-4 w-4" />
              취소
            </Button>
          </div>
        </div>
      )}

      {/* 프로모션 목록 */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">프로모션 목록 ({promotions.length}개)</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : (
          <div className="divide-y">
            {promotions.map((promotion) => (
              <div key={promotion.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {promotion.promotion}
                      </h3>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        {promotion.promotion_id}
                      </span>
                    </div>
                    
                    {promotion.promotion_description && (
                      <p className="text-gray-600 mb-3">{promotion.promotion_description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {promotion.booking_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          예약: {promotion.booking_date}
                        </div>
                      )}
                      {promotion.check_in_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          체크인: {promotion.check_in_date}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startHotelMapping(promotion)}
                      className="flex items-center gap-2"
                    >
                      <MapPin className="h-4 w-4" />
                      호텔 관리
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(promotion)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      편집
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(promotion)}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {promotions.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>등록된 프로모션이 없습니다.</p>
                <p className="text-sm">새 프로모션을 추가해보세요.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 호텔 매핑 모달 */}
      {showHotelMapping && selectedPromotion && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                프로모션 호텔 관리: {selectedPromotion.promotion}
              </h2>
              <Button
                variant="outline"
                onClick={() => setShowHotelMapping(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* 호텔 검색 및 연결 */}
              <div className="mb-6">
                <h3 className="text-md font-medium mb-3">호텔 추가</h3>
                <HotelSearchWidget
                  onHotelSelect={(sabreId, hotelInfo) => {
                    if (sabreId && hotelInfo) {
                      handleConnectHotel(sabreId);
                    }
                  }}
                />
              </div>
              
              {/* 연결된 호텔 목록 */}
              <div>
                <h3 className="text-md font-medium mb-3">
                  연결된 호텔 ({mappedHotels.length}개)
                </h3>
                
                {mappedHotels.length > 0 ? (
                  <div className="space-y-2">
                    {mappedHotels.map((hotel) => (
                      <div
                        key={hotel.sabre_id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <div className="font-medium">
                            {hotel.property_name_ko || hotel.property_name_en}
                          </div>
                          <div className="text-sm text-gray-500">
                            Sabre ID: {hotel.sabre_id}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDisconnectHotel(hotel.sabre_id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          연결 해제
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                    <p>연결된 호텔이 없습니다.</p>
                    <p className="text-sm">위 검색을 통해 호텔을 연결해보세요.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
