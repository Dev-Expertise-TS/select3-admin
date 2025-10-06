"use client"

import React, { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Megaphone, Plus, Save, X, Loader2, AlertCircle, CheckCircle, Edit, Trash2, Calendar, MapPin, ArrowLeft } from "lucide-react"
import HotelQuickSearch from "@/components/shared/hotel-quick-search"

interface Promotion {
  id: number
  promotion_id: string
  promotion: string
  promotion_description: string | null
  booking_date: string | null
  check_in_date: string | null
  created_at: string
  updated_at: string
}

interface PromotionForm {
  promotion_id: string
  promotion: string
  promotion_description: string
  booking_date: string | null
  check_in_date: string | null
}

interface MappedHotel {
  sabre_id: string
  promotion_id: string
  promotion_name: string
  property_name_ko: string | null
  property_name_en: string | null
}

export function PromotionManager() {
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'manage' | 'mapped'>('manage')
  const [selectedPromotion, setSelectedPromotion] = useState<Promotion | null>(null)
  const [mappedHotels, setMappedHotels] = useState<MappedHotel[]>([])
  const [mappingLoading, setMappingLoading] = useState(false)
  const [allMappedHotels, setAllMappedHotels] = useState<MappedHotel[]>([])
  const [allMappedLoading, setAllMappedLoading] = useState(false)
  const [showAddHotelForm, setShowAddHotelForm] = useState(false)
  const [showHotelPromotionPopup, setShowHotelPromotionPopup] = useState(false)
  const [selectedHotel, setSelectedHotel] = useState<{sabre_id: string, property_name_ko: string} | null>(null)
  const [hotelPromotions, setHotelPromotions] = useState<Array<{promotion_id: string, promotion_name: string}>>([])
  const [hotelPopupLoading, setHotelPopupLoading] = useState(false)

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [formLoading, setFormLoading] = useState(false)
  const [formData, setFormData] = useState<PromotionForm>({
    promotion_id: "",
    promotion: "",
    promotion_description: "",
    booking_date: null,
    check_in_date: null,
  })

  const loadPromotions = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/promotions/list")
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "목록을 불러오지 못했습니다.")
      setPromotions(data.data.promotions as Promotion[])
    } catch (err) {
      setError(err instanceof Error ? err.message : "데이터 로드 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadPromotions()
    if (activeTab === 'mapped') {
      loadAllMappedHotels()
    }
  }, [activeTab])

  const loadAllMappedHotels = async () => {
    setAllMappedLoading(true)
    try {
      const res = await fetch('/api/promotions/mapped-hotels')
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '매핑된 호텔 목록을 불러오지 못했습니다.')
      setAllMappedHotels(data.data ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '매핑된 호텔 조회 중 오류가 발생했습니다.')
    } finally {
      setAllMappedLoading(false)
    }
  }

  const openMapping = (p: Promotion) => {
    setSelectedPromotion(p)
    setActiveTab('mapped')
    loadMappedHotels(p.promotion_id)
  }

  const loadMappedHotels = async (promotionId: string) => {
    setMappingLoading(true)
    try {
      const res = await fetch(`/api/promotions/hotels?promotionId=${encodeURIComponent(promotionId)}`)
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '연결된 호텔을 불러오지 못했습니다.')
      setMappedHotels(data.data.hotels ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : '연결된 호텔 조회 중 오류가 발생했습니다.')
    } finally {
      setMappingLoading(false)
    }
  }

  const connectHotel = async (sabreId: string) => {
    if (!selectedPromotion) return
    try {
      const res = await fetch('/api/promotions/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotionId: selectedPromotion.promotion_id, sabreId })
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '호텔 연결에 실패했습니다.')
      setSuccess('호텔이 연결되었습니다.')
      loadMappedHotels(selectedPromotion.promotion_id)
      if (activeTab === 'mapped') {
        loadAllMappedHotels()
      }
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '호텔 연결 중 오류가 발생했습니다.')
    }
  }

  const disconnectHotel = async (sabreId: string, promotionId?: string) => {
    const targetPromotionId = promotionId || selectedPromotion?.promotion_id
    if (!targetPromotionId) return
    if (!confirm('이 호텔을 연결 해제하시겠습니까?')) return
    try {
      const res = await fetch(`/api/promotions/hotels?promotionId=${encodeURIComponent(targetPromotionId)}&sabreId=${encodeURIComponent(sabreId)}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '호텔 연결 해제에 실패했습니다.')
      setSuccess('호텔 연결을 해제했습니다.')
      if (selectedPromotion) {
        loadMappedHotels(selectedPromotion.promotion_id)
      }
      if (activeTab === 'mapped') {
        loadAllMappedHotels()
      }
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '호텔 연결 해제 중 오류가 발생했습니다.')
    }
  }

  const addHotelMapping = async (promotionId: string, sabreId: string) => {
    try {
      const res = await fetch('/api/promotions/hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotionId, sabreId })
      })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || '호텔 연결에 실패했습니다.')
      setSuccess('호텔이 연결되었습니다.')
      loadAllMappedHotels()
      if (showHotelPromotionPopup && selectedHotel) {
        loadHotelPromotions(selectedHotel.sabre_id)
      }
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : '호텔 연결 중 오류가 발생했습니다.')
    }
  }

  const openHotelPromotionPopup = async (sabre_id: string, property_name_ko: string) => {
    setSelectedHotel({ sabre_id, property_name_ko })
    setShowHotelPromotionPopup(true)
    await loadHotelPromotions(sabre_id)
  }

  const closeHotelPromotionPopup = () => {
    setShowHotelPromotionPopup(false)
    setSelectedHotel(null)
    setHotelPromotions([])
  }

  const loadHotelPromotions = async (sabreId: string) => {
    setHotelPopupLoading(true)
    try {
      // 해당 호텔의 프로모션 목록 조회
      const hotelMappings = allMappedHotels.filter(h => h.sabre_id === sabreId)
      const uniquePromotions = hotelMappings.map(h => ({
        promotion_id: h.promotion_id,
        promotion_name: h.promotion_name
      }))
      setHotelPromotions(uniquePromotions)
    } catch (err) {
      setError(err instanceof Error ? err.message : '호텔 프로모션 조회 중 오류가 발생했습니다.')
    } finally {
      setHotelPopupLoading(false)
    }
  }

  const removeHotelPromotion = async (sabreId: string, promotionId: string) => {
    try {
      await disconnectHotel(sabreId, promotionId)
      if (selectedHotel) {
        await loadHotelPromotions(selectedHotel.sabre_id)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '프로모션 연결 해제 중 오류가 발생했습니다.')
    }
  }

  const resetForm = () => {
    setFormData({ promotion_id: "", promotion: "", promotion_description: "", booking_date: null, check_in_date: null })
    setEditingId(null)
    setShowForm(false)
  }

  const handleAddNew = () => {
    resetForm()
    setShowForm(true)
  }

  const startEdit = (p: Promotion) => {
    setEditingId(p.id)
    setFormData({
      promotion_id: p.promotion_id,
      promotion: p.promotion,
      promotion_description: p.promotion_description ?? "",
      booking_date: p.booking_date ?? null,
      check_in_date: p.check_in_date ?? null,
    })
    setShowForm(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormLoading(true)
    setError(null)
    try {
      const url = editingId ? "/api/promotions/update" : "/api/promotions/create"
      const method = editingId ? "PUT" : "POST"
      const body = editingId ? { id: editingId, ...formData } : formData
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "저장 중 오류가 발생했습니다.")
      setSuccess(editingId ? "수정되었습니다." : "추가되었습니다.")
      resetForm()
      loadPromotions()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장 중 오류가 발생했습니다.")
    } finally {
      setFormLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm("정말로 삭제하시겠습니까?")) return
    try {
      const res = await fetch(`/api/promotions/delete?id=${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok || !data.success) throw new Error(data.error || "삭제 중 오류가 발생했습니다.")
      setSuccess("삭제되었습니다.")
      loadPromotions()
      setTimeout(() => setSuccess(null), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "삭제 중 오류가 발생했습니다.")
    }
  }

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-orange-600 p-2">
            <Megaphone className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight text-gray-900">프로모션 관리</h2>
            <p className="text-sm text-gray-600 mt-1">select_hotel_promotions 테이블의 레코드를 관리합니다</p>
          </div>
        </div>
        <Button onClick={handleAddNew} className="bg-orange-600 hover:bg-orange-700">
          <Plus className="h-4 w-4 mr-2" /> 새 프로모션 추가
        </Button>
      </div>

      {/* 탭 네비게이션 */}
      <div>
        <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
          <button
            className={`px-3 py-1.5 text-sm ${activeTab === 'manage' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('manage')}
          >
            프로모션 관리
          </button>
          <button
            className={`px-3 py-1.5 text-sm border-l border-gray-200 ${activeTab === 'mapped' ? 'bg-orange-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            onClick={() => setActiveTab('mapped')}
          >
            프로모션 적용 호텔 목록
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium">오류</h3>
            <p className="text-sm mt-1">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
          <div>
            <h3 className="font-medium">성공</h3>
            <p className="text-sm mt-1">{success}</p>
          </div>
          <button onClick={() => setSuccess(null)} className="ml-auto text-green-500 hover:text-green-700">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {activeTab === 'manage' && showForm && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{editingId ? "프로모션 수정" : "새 프로모션 추가"}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">프로모션 ID*</label>
                <Input
                  value={formData.promotion_id}
                  onChange={(e) => setFormData({ ...formData, promotion_id: e.target.value })}
                  placeholder="예: PROMO202501"
                  required
                  disabled={!!editingId}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">프로모션명*</label>
                <Input
                  value={formData.promotion}
                  onChange={(e) => setFormData({ ...formData, promotion: e.target.value })}
                  placeholder="예: 신년 특가 프로모션"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">프로모션 설명</label>
                <textarea
                  value={formData.promotion_description}
                  onChange={(e) => setFormData({ ...formData, promotion_description: e.target.value })}
                  placeholder="프로모션 상세 설명을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={3}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">예약 기간</label>
                <Input type="date" value={formData.booking_date ?? ""} onChange={(e) => setFormData({ ...formData, booking_date: e.target.value || null })} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">체크인 기간</label>
                <Input type="date" value={formData.check_in_date ?? ""} onChange={(e) => setFormData({ ...formData, check_in_date: e.target.value || null })} />
              </div>
            </div>
            <div className="flex gap-3">
              <Button type="submit" disabled={formLoading} className="bg-orange-600 hover:bg-orange-700">
                {formLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> 저장 중...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" /> {editingId ? "수정" : "추가"}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" onClick={resetForm} disabled={formLoading}>
                <X className="h-4 w-4 mr-2" /> 취소
              </Button>
            </div>
          </form>
        </div>
      )}

      {activeTab === 'manage' && (
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">프로모션 목록</h3>
          <p className="text-sm text-gray-600 mt-1">총 {promotions.length}개의 항목</p>
        </div>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <span className="ml-2 text-gray-500">로딩 중...</span>
          </div>
        ) : promotions.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">항목이 없습니다</h3>
            <p className="text-gray-600 mb-4">새 프로모션을 추가해보세요.</p>
            <Button onClick={handleAddNew} className="bg-orange-600 hover:bg-orange-700">
              <Plus className="h-4 w-4 mr-2" /> 새 프로모션 추가
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Promotion ID</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-4/5">프로모션명</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">예약 기간</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">체크인 기간</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {promotions.map((p, idx) => (
                  <tr key={typeof p.id === "number" || typeof p.id === "string" ? `promo-${p.id}` : `promo-${idx}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.id}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">{p.promotion_id}</td>
                    <td className="px-6 py-4 text-sm text-gray-900 w-4/5">{p.promotion}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.booking_date ? <div className="flex items-center gap-1"><Calendar className="h-4 w-4" />{p.booking_date}</div> : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {p.check_in_date ? <div className="flex items-center gap-1"><Calendar className="h-4 w-4" />{p.check_in_date}</div> : "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => startEdit(p)}>
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => handleDelete(p.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {activeTab === 'mapped' && (
        <div className="space-y-6">
          {/* 호텔 매핑 추가 폼 */}
          {showAddHotelForm && (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">호텔 매핑 추가</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">프로모션 선택*</label>
                  <select 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onChange={(e) => {
                      const promotion = promotions.find(p => p.promotion_id === e.target.value)
                      if (promotion) setSelectedPromotion(promotion)
                    }}
                  >
                    <option value="">프로모션을 선택하세요</option>
                    {promotions.map(p => (
                      <option key={p.promotion_id} value={p.promotion_id}>{p.promotion}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">호텔 검색*</label>
                  <HotelQuickSearch
                    onSelect={(hotel) => {
                      if (hotel?.sabre_id && selectedPromotion) {
                        addHotelMapping(selectedPromotion.promotion_id, hotel.sabre_id)
                        setShowAddHotelForm(false)
                      }
                    }}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowAddHotelForm(false)}>
                  <X className="h-4 w-4 mr-2" /> 취소
                </Button>
              </div>
            </div>
          )}

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">프로모션 적용 호텔 목록</h3>
                <p className="text-sm text-gray-600 mt-1">총 {allMappedHotels.length}개의 매핑된 호텔</p>
              </div>
              <Button onClick={() => setShowAddHotelForm(true)} className="bg-orange-600 hover:bg-orange-700">
                <Plus className="h-4 w-4 mr-2" /> 호텔 매핑 추가
              </Button>
            </div>
          {allMappedLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
              <span className="ml-2 text-gray-500">로딩 중...</span>
            </div>
          ) : allMappedHotels.length === 0 ? (
            <div className="text-center py-12">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">매핑된 호텔이 없습니다</h3>
              <p className="text-gray-600 mb-4">프로모션 관리 탭에서 호텔을 연결해보세요.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sabre ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">호텔명 (한글)</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">프로모션 ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">프로모션명</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allMappedHotels.map((h, idx) => (
                    <tr key={`${h.sabre_id}-${h.promotion_id}-${idx}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-blue-600">
                        {h.sabre_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <button
                          onClick={() => openHotelPromotionPopup(h.sabre_id, h.property_name_ko || '')}
                          className="text-blue-600 hover:text-blue-800 hover:underline cursor-pointer"
                        >
                          {h.property_name_ko || '-'}
                        </button>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-orange-600">
                        {h.promotion_id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {h.promotion_name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          onClick={() => disconnectHotel(h.sabre_id, h.promotion_id)} 
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          </div>
        </div>
      )}

      {/* 호텔 프로모션 관리 팝업 */}
      {showHotelPromotionPopup && selectedHotel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl h-[600px] flex flex-col border border-gray-200">
            {/* 팝업 헤더 */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">호텔 프로모션 관리</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {selectedHotel.property_name_ko} (Sabre ID: {selectedHotel.sabre_id})
                  </p>
                </div>
                <button
                  onClick={closeHotelPromotionPopup}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 프로모션 추가 섹션 */}
            <div className="px-6 py-4 border-b border-gray-200">
              <h4 className="text-sm font-medium text-gray-900 mb-3">새 프로모션 추가</h4>
              <div className="flex gap-3">
                <select 
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onChange={(e) => {
                    const promotion = promotions.find(p => p.promotion_id === e.target.value)
                    if (promotion) setSelectedPromotion(promotion)
                  }}
                >
                  <option value="">프로모션을 선택하세요</option>
                  {promotions
                    .filter(p => !hotelPromotions.some(hp => hp.promotion_id === p.promotion_id))
                    .map(p => (
                      <option key={p.promotion_id} value={p.promotion_id}>{p.promotion}</option>
                    ))}
                </select>
                <Button 
                  onClick={() => {
                    if (selectedPromotion) {
                      addHotelMapping(selectedPromotion.promotion_id, selectedHotel.sabre_id)
                    }
                  }}
                  disabled={!selectedPromotion}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  <Plus className="h-4 w-4 mr-2" /> 추가
                </Button>
              </div>
            </div>

            {/* 프로모션 목록 */}
            <div className="flex-1 overflow-y-auto px-6 py-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">연결된 프로모션 목록</h4>
              {hotelPopupLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-orange-600" />
                  <span className="ml-2 text-gray-600">로딩 중...</span>
                </div>
              ) : hotelPromotions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Megaphone className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>연결된 프로모션이 없습니다.</p>
                  <p className="text-sm">위에서 프로모션을 추가해보세요.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {hotelPromotions.map((promotion) => (
                    <div key={promotion.promotion_id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                      <div>
                        <div className="font-medium text-gray-900">{promotion.promotion_name}</div>
                        <div className="text-sm text-gray-500 font-mono">{promotion.promotion_id}</div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeHotelPromotion(selectedHotel.sabre_id, promotion.promotion_id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 팝업 푸터 */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={closeHotelPromotionPopup}
                >
                  닫기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


