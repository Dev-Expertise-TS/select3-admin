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
  Megaphone
} from "lucide-react";

interface PromoBanner {
  id: number;
  title: string;
  content: string;
  link_url: string | null;
  background_color: string | null;
  text_color: string | null;
  is_active: boolean;
  priority: number;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  updated_at: string;
}

export function PromoBannerManager() {
  const [promoBanners, setPromoBanners] = useState<PromoBanner[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBanner, setEditingBanner] = useState<PromoBanner | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // 폼 데이터
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    link_url: "",
    background_color: "#3B82F6",
    text_color: "#FFFFFF",
    is_active: true,
    priority: 1,
    start_date: "",
    end_date: "",
  });

  // 프로모션 베너 목록 조회
  const fetchPromoBanners = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/promo-banners/list");
      
      // 응답이 JSON인지 확인
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`예상치 못한 응답 형식: ${contentType}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setPromoBanners(data.data.banners || []);
      } else {
        console.error("프로모션 베너 조회 실패:", data.error);
        setPromoBanners([]); // 실패 시 빈 배열로 설정
      }
    } catch (error) {
      console.error("프로모션 베너 조회 오류:", error);
      setPromoBanners([]); // 오류 시 빈 배열로 설정
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromoBanners();
  }, []);

  // 프로모션 베너 생성
  const handleCreate = async () => {
    if (!formData.title || !formData.content) {
      alert("제목과 내용은 필수입니다.");
      return;
    }

    try {
      const response = await fetch("/api/promo-banners/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      // 응답이 JSON인지 확인
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`예상치 못한 응답 형식: ${contentType}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert("프로모션 베너가 성공적으로 생성되었습니다.");
        fetchPromoBanners();
        resetForm();
      } else {
        alert(`프로모션 베너 생성 실패: ${data.error}`);
      }
    } catch (error) {
      console.error("프로모션 베너 생성 오류:", error);
      alert("프로모션 베너 생성 중 오류가 발생했습니다.");
    }
  };

  // 프로모션 베너 업데이트
  const handleUpdate = async () => {
    if (!editingBanner || !formData.title || !formData.content) {
      alert("제목과 내용은 필수입니다.");
      return;
    }

    try {
      const response = await fetch("/api/promo-banners/update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingBanner.id,
          ...formData,
        }),
      });

      // 응답이 JSON인지 확인
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`예상치 못한 응답 형식: ${contentType}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert("프로모션 베너가 성공적으로 업데이트되었습니다.");
        fetchPromoBanners();
        resetForm();
      } else {
        alert(`프로모션 베너 업데이트 실패: ${data.error}`);
      }
    } catch (error) {
      console.error("프로모션 베너 업데이트 오류:", error);
      alert("프로모션 베너 업데이트 중 오류가 발생했습니다.");
    }
  };

  // 프로모션 베너 삭제
  const handleDelete = async (banner: PromoBanner) => {
    if (!confirm(`프로모션 베너 "${banner.title}"을(를) 삭제하시겠습니까?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/promo-banners/delete?id=${banner.id}`, {
        method: "DELETE",
      });

      // 응답이 JSON인지 확인
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        throw new Error(`예상치 못한 응답 형식: ${contentType}`);
      }

      const data = await response.json();
      
      if (data.success) {
        alert("프로모션 베너가 성공적으로 삭제되었습니다.");
        fetchPromoBanners();
      } else {
        alert(`프로모션 베너 삭제 실패: ${data.error}`);
      }
    } catch (error) {
      console.error("프로모션 베너 삭제 오류:", error);
      alert("프로모션 베너 삭제 중 오류가 발생했습니다.");
    }
  };

  // 폼 리셋
  const resetForm = () => {
    setFormData({
      title: "",
      content: "",
      link_url: "",
      background_color: "#3B82F6",
      text_color: "#FFFFFF",
      is_active: true,
      priority: 1,
      start_date: "",
      end_date: "",
    });
    setEditingBanner(null);
    setIsCreating(false);
  };

  // 편집 모드 시작
  const startEdit = (banner: PromoBanner) => {
    setFormData({
      title: banner.title,
      content: banner.content,
      link_url: banner.link_url || "",
      background_color: banner.background_color || "#3B82F6",
      text_color: banner.text_color || "#FFFFFF",
      is_active: banner.is_active,
      priority: banner.priority,
      start_date: banner.start_date || "",
      end_date: banner.end_date || "",
    });
    setEditingBanner(banner);
    setIsCreating(false);
  };

  // 생성 모드 시작
  const startCreate = () => {
    resetForm();
    setIsCreating(true);
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">상단 프로모션 띠 베너 관리</h1>
        <Button onClick={startCreate} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          프로모션 베너 추가
        </Button>
      </div>

      {/* 프로모션 베너 생성/편집 폼 */}
      {(isCreating || editingBanner) && (
        <div className="bg-white rounded-lg border p-6">
          <h2 className="text-lg font-semibold mb-4">
            {isCreating ? "새 프로모션 베너 생성" : "프로모션 베너 편집"}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                제목 *
              </label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="예: 신년 특가 프로모션"
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                내용 *
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="프로모션 베너에 표시될 내용을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                링크 URL
              </label>
              <Input
                value={formData.link_url}
                onChange={(e) => setFormData({ ...formData, link_url: e.target.value })}
                placeholder="https://example.com"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                우선순위
              </label>
              <Input
                type="number"
                min="1"
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                배경색
              </label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.background_color}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.background_color}
                  onChange={(e) => setFormData({ ...formData, background_color: e.target.value })}
                  placeholder="#3B82F6"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                텍스트 색상
              </label>
              <div className="flex gap-2">
                <Input
                  type="color"
                  value={formData.text_color}
                  onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.text_color}
                  onChange={(e) => setFormData({ ...formData, text_color: e.target.value })}
                  placeholder="#FFFFFF"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                시작일
              </label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                종료일
              </label>
              <Input
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm font-medium text-gray-700">활성화</span>
              </label>
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

      {/* 프로모션 베너 목록 */}
      <div className="bg-white rounded-lg border">
        <div className="p-6 border-b">
          <h2 className="text-lg font-semibold">프로모션 베너 목록 ({promoBanners.length}개)</h2>
        </div>
        
        {loading ? (
          <div className="p-6 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="mt-2 text-gray-600">로딩 중...</p>
          </div>
        ) : (
          <div className="divide-y">
            {promoBanners.map((banner) => (
              <div key={banner.id} className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900">
                        {banner.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        banner.is_active 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {banner.is_active ? '활성' : '비활성'}
                      </span>
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-full">
                        우선순위 {banner.priority}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 mb-3">{banner.content}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {banner.start_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          시작: {banner.start_date}
                        </div>
                      )}
                      {banner.end_date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          종료: {banner.end_date}
                        </div>
                      )}
                      {banner.link_url && (
                        <div className="text-blue-600">
                          링크: {banner.link_url}
                        </div>
                      )}
                    </div>
                    
                    {/* 색상 미리보기 */}
                    <div className="mt-3">
                      <div 
                        className="px-4 py-2 rounded text-sm"
                        style={{
                          backgroundColor: banner.background_color || '#3B82F6',
                          color: banner.text_color || '#FFFFFF'
                        }}
                      >
                        {banner.content}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => startEdit(banner)}
                      className="flex items-center gap-2"
                    >
                      <Edit className="h-4 w-4" />
                      편집
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(banner)}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                      삭제
                    </Button>
                  </div>
                </div>
              </div>
            ))}
            
            {promoBanners.length === 0 && (
              <div className="p-6 text-center text-gray-500">
                <Megaphone className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>등록된 프로모션 베너가 없습니다.</p>
                <p className="text-sm">새 프로모션 베너를 추가해보세요.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
