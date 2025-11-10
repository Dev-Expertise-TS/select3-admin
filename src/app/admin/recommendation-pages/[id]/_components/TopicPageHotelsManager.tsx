'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Edit2, Trash2, Save, X } from 'lucide-react'
import { TopicPageHotelWithInfo } from '@/types/topic-page'

interface TopicPageHotelsManagerProps {
  pageId: string
  hotels: TopicPageHotelWithInfo[]
}

export function TopicPageHotelsManager({ pageId, hotels: initialHotels }: TopicPageHotelsManagerProps) {
  const queryClient = useQueryClient()
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editData, setEditData] = useState<Partial<TopicPageHotelWithInfo>>({})
  const [isAdding, setIsAdding] = useState(false)
  const [newHotelSabreId, setNewHotelSabreId] = useState('')

  // 호텔 목록 조회
  const { data: response } = useQuery({
    queryKey: ['topic-page-hotels', pageId],
    queryFn: async () => {
      const res = await fetch(`/api/recommendation-page-hotels?page_id=${pageId}`)
      if (!res.ok) throw new Error('호텔 목록 조회 실패')
      return res.json()
    },
    initialData: { success: true, data: initialHotels },
  })

  // 중복 제거 (id 기준)
  const hotelsRaw = (response?.data || []) as TopicPageHotelWithInfo[]
  const hotels = hotelsRaw.reduce((acc: TopicPageHotelWithInfo[], current) => {
    const isDuplicate = acc.some(item => item.id === current.id)
    if (!isDuplicate) {
      acc.push(current)
    } else {
      console.warn(`[TopicPageHotelsManager] Duplicate hotel removed: id=${current.id}`)
    }
    return acc
  }, [])

  // 호텔 추가
  const addMutation = useMutation({
    mutationFn: async (sabreId: number) => {
      const res = await fetch('/api/recommendation-page-hotels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ page_id: pageId, sabre_id: sabreId }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '호텔 추가 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-page-hotels', pageId] })
      queryClient.invalidateQueries({ queryKey: ['topic-page', pageId] })
      setIsAdding(false)
      setNewHotelSabreId('')
      alert('호텔이 추가되었습니다.')
    },
    onError: (error: Error) => {
      alert(`호텔 추가 실패: ${error.message}`)
    },
  })

  // 호텔 수정
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<TopicPageHotelWithInfo> }) => {
      const res = await fetch('/api/recommendation-page-hotels', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...updates }),
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '호텔 정보 수정 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-page-hotels', pageId] })
      queryClient.invalidateQueries({ queryKey: ['topic-page', pageId] })
      setEditingId(null)
      setEditData({})
      alert('호텔 정보가 수정되었습니다.')
    },
    onError: (error: Error) => {
      alert(`호텔 정보 수정 실패: ${error.message}`)
    },
  })

  // 호텔 삭제
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/recommendation-page-hotels?id=${id}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '호텔 제거 실패')
      }
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topic-page-hotels', pageId] })
      queryClient.invalidateQueries({ queryKey: ['topic-page', pageId] })
      alert('호텔이 제거되었습니다.')
    },
    onError: (error: Error) => {
      alert(`호텔 제거 실패: ${error.message}`)
    },
  })

  const handleEdit = (hotel: TopicPageHotelWithInfo) => {
    setEditingId(hotel.id)
    setEditData(hotel)
  }

  const handleSave = (id: number) => {
    updateMutation.mutate({ id, updates: editData })
  }

  const handleCancel = () => {
    setEditingId(null)
    setEditData({})
  }

  const handleDelete = (id: number, hotelName: string) => {
    if (confirm(`"${hotelName}" 호텔을 제거하시겠습니까?`)) {
      deleteMutation.mutate(id)
    }
  }

  const handleAdd = () => {
    const sabreId = parseInt(newHotelSabreId)
    if (!sabreId || isNaN(sabreId)) {
      alert('유효한 Sabre ID를 입력하세요.')
      return
    }
    addMutation.mutate(sabreId)
  }

  return (
    <div className="rounded-lg border bg-white p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">연결된 호텔 ({hotels.length}개)</h2>
          <p className="text-sm text-gray-600 mt-1">추천 페이지에 표시될 호텔을 관리합니다.</p>
        </div>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
          >
            <Plus className="h-4 w-4" />
            호텔 추가
          </button>
        )}
      </div>

      {/* 호텔 추가 폼 */}
      {isAdding && (
        <div className="flex items-center gap-2 p-4 bg-blue-50 rounded-lg">
          <input
            type="number"
            value={newHotelSabreId}
            onChange={(e) => setNewHotelSabreId(e.target.value)}
            placeholder="Sabre ID 입력..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAdd}
            disabled={addMutation.isPending}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm disabled:opacity-50"
          >
            {addMutation.isPending ? '추가 중...' : '추가'}
          </button>
          <button
            onClick={() => {
              setIsAdding(false)
              setNewHotelSabreId('')
            }}
            className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* 호텔 테이블 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b">
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">Sabre ID</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">호텔명</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">핀</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">순위</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">배지</th>
              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700">카드 제목</th>
              <th className="px-3 py-2 text-right text-xs font-semibold text-gray-700">작업</th>
            </tr>
          </thead>
          <tbody>
            {hotels.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-gray-500">
                  연결된 호텔이 없습니다.
                </td>
              </tr>
            ) : (
              hotels.map((hotel) => (
                <tr key={hotel.id} className="border-b hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm font-mono">{hotel.sabre_id}</td>
                  <td className="px-3 py-2 text-sm">
                    {editingId === hotel.id ? (
                      <input
                        type="text"
                        value={editData.card_title_ko || ''}
                        onChange={(e) => setEditData({ ...editData, card_title_ko: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder={hotel.hotel?.property_name_ko || ''}
                      />
                    ) : (
                      <div>
                        <div className="font-medium">{hotel.card_title_ko || hotel.hotel?.property_name_ko}</div>
                        {hotel.hotel?.city_ko && (
                          <div className="text-xs text-gray-500">{hotel.hotel.city_ko}</div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === hotel.id ? (
                      <input
                        type="checkbox"
                        checked={editData.pin_to_top || false}
                        onChange={(e) => setEditData({ ...editData, pin_to_top: e.target.checked })}
                        className="w-4 h-4"
                      />
                    ) : (
                      <span className="text-sm">{hotel.pin_to_top ? '📌' : '-'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === hotel.id ? (
                      <input
                        type="number"
                        value={editData.rank_manual ?? ''}
                        onChange={(e) => setEditData({ ...editData, rank_manual: e.target.value ? parseInt(e.target.value) : null })}
                        className="w-20 px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      <span className="text-sm">{hotel.rank_manual ?? '-'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === hotel.id ? (
                      <input
                        type="text"
                        value={editData.badge_text_ko || ''}
                        onChange={(e) => setEditData({ ...editData, badge_text_ko: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                        placeholder="배지 텍스트"
                      />
                    ) : (
                      <span className="text-sm">{hotel.badge_text_ko || '-'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {editingId === hotel.id ? (
                      <input
                        type="text"
                        value={editData.card_title_ko || ''}
                        onChange={(e) => setEditData({ ...editData, card_title_ko: e.target.value })}
                        className="w-full px-2 py-1 border rounded text-sm"
                      />
                    ) : (
                      <span className="text-sm">{hotel.card_title_ko || '-'}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-end gap-1">
                      {editingId === hotel.id ? (
                        <>
                          <button
                            onClick={() => handleSave(hotel.id)}
                            disabled={updateMutation.isPending}
                            className="p-1.5 rounded text-green-600 hover:bg-green-50 disabled:opacity-50"
                            title="저장"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={handleCancel}
                            className="p-1.5 rounded text-gray-600 hover:bg-gray-100"
                            title="취소"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEdit(hotel)}
                            className="p-1.5 rounded text-blue-600 hover:bg-blue-50"
                            title="편집"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(hotel.id, hotel.hotel?.property_name_ko || hotel.card_title_ko || `Hotel ${hotel.sabre_id}`)}
                            disabled={deleteMutation.isPending}
                            className="p-1.5 rounded text-red-600 hover:bg-red-50 disabled:opacity-50"
                            title="삭제"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

