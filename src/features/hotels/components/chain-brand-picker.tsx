'use client'

import React from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export type Chain = {
  chain_id: number
  name_kr: string | null
  name_en: string | null
}

export type Brand = {
  brand_id: number
  chain_id: number | null
  name_kr: string | null
  name_en: string | null
}

interface Props {
  isOpen: boolean
  onClose: () => void
  onSelect: (chain: Chain | null, brand: Brand | null) => void
  selectedChainId?: number | null
  selectedBrandId?: number | null
}

export function ChainBrandPicker({ isOpen, onClose, onSelect, selectedChainId, selectedBrandId }: Props) {
  const [chains, setChains] = React.useState<Chain[]>([])
  const [brands, setBrands] = React.useState<Brand[]>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [currentChainId, setCurrentChainId] = React.useState<number | null>(selectedChainId || null)
  const [currentBrandId, setCurrentBrandId] = React.useState<number | null>(selectedBrandId || null)

  // 선택된 체인에 따른 브랜드 필터링
  const filteredBrands = React.useMemo(() => {
    if (!currentChainId) return []
    return brands.filter(brand => brand.chain_id === currentChainId)
  }, [brands, currentChainId])

  React.useEffect(() => {
    if (isOpen) {
      fetchData()
    }
  }, [isOpen])

  const fetchData = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/chain-brand/list')

      if (!response.ok) {
        const errorText = await response.text()
        setError(`데이터를 불러올 수 없습니다. (${response.status}): ${errorText}`)
        return
      }

      const result = await response.json().catch(() => {
        setError('서버 응답을 파싱할 수 없습니다.')
        return null
      })

      if (!result) return
      
      if (result.success) {
        setChains(result.data.chains || [])
        setBrands(result.data.brands || [])
      } else {
        setError(result.error || '데이터 로드에 실패했습니다.')
      }
    } catch (err) {
      console.error('체인/브랜드 데이터 로드 오류:', err)
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleChainSelect = (chain: Chain) => {
    setCurrentChainId(chain.chain_id)
    setCurrentBrandId(null) // 체인 변경 시 브랜드 선택 초기화
  }

  const handleBrandSelect = (brand: Brand) => {
    setCurrentBrandId(brand.brand_id)
  }

  const handleConfirm = () => {
    const selectedChain = chains.find(c => c.chain_id === currentChainId) || null
    const selectedBrand = filteredBrands.find(b => b.brand_id === currentBrandId) || null
    onSelect(selectedChain, selectedBrand)
    onClose()
  }

  const handleClear = () => {
    setCurrentChainId(null)
    setCurrentBrandId(null)
    onSelect(null, null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="absolute left-1/2 top-1/2 w-[min(95vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">체인 & 브랜드 관리</h2>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            닫기
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-600">로딩 중...</div>
          </div>
        ) : error ? (
          <div className="p-4 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md mb-4">
            {error}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 체인 선택 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">호텔 체인</h3>
              <div className="max-h-64 overflow-y-auto border rounded-md">
                {chains.map((chain) => (
                  <button
                    key={chain.chain_id}
                    type="button"
                    className={cn(
                      "w-full px-3 py-2 text-left text-sm border-b border-gray-100 hover:bg-blue-50 transition-colors",
                      currentChainId === chain.chain_id
                        ? "bg-blue-100 text-blue-900 font-medium"
                        : "text-gray-700"
                    )}
                    onClick={() => handleChainSelect(chain)}
                  >
                    <div className="font-medium">
                      {chain.name_kr || '-'} {chain.name_en || ''}
                    </div>
                  </button>
                ))}
                {chains.length === 0 && (
                  <div className="p-4 text-center text-sm text-gray-500">
                    등록된 체인이 없습니다.
                  </div>
                )}
              </div>
            </div>

            {/* 브랜드 선택 */}
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">
                브랜드 {currentChainId && `(${chains.find(c => c.chain_id === currentChainId)?.name_kr || ''})`}
              </h3>
              <div className="max-h-64 overflow-y-auto border rounded-md">
                {currentChainId ? (
                  <>
                    {filteredBrands.map((brand) => (
                      <button
                        key={brand.brand_id}
                        type="button"
                        className={cn(
                          "w-full px-3 py-2 text-left text-sm border-b border-gray-100 hover:bg-green-50 transition-colors",
                          currentBrandId === brand.brand_id
                            ? "bg-green-100 text-green-900 font-medium"
                            : "text-gray-700"
                        )}
                        onClick={() => handleBrandSelect(brand)}
                      >
                        <div className="font-medium">
                          {brand.name_kr || '-'} {brand.name_en || ''}
                        </div>
                      </button>
                    ))}
                    {filteredBrands.length === 0 && (
                      <div className="p-4 text-center text-sm text-gray-500">
                        해당 체인의 브랜드가 없습니다.
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-4 text-center text-sm text-gray-500">
                    먼저 체인을 선택하세요.
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 선택된 정보 표시 */}
        {(currentChainId || currentBrandId) && (
          <div className="mt-4 p-3 bg-gray-50 rounded-md">
            <div className="text-sm font-medium text-gray-700 mb-1">선택된 정보:</div>
            <div className="text-sm text-gray-600">
              체인: {currentChainId ? chains.find(c => c.chain_id === currentChainId)?.name_kr || '-' : '선택되지 않음'}
            </div>
            <div className="text-sm text-gray-600">
              브랜드: {currentBrandId ? `[${currentBrandId}] ${filteredBrands.find(b => b.brand_id === currentBrandId)?.name_kr || '-'}` : '선택되지 않음'}
            </div>
          </div>
        )}

        {/* 액션 버튼 */}
        <div className="flex items-center justify-end gap-2 mt-6">
          <Button type="button" variant="secondary" size="sm" onClick={handleClear}>
            선택 해제
          </Button>
          <Button type="button" variant="secondary" size="sm" onClick={onClose}>
            취소
          </Button>
          <Button type="button" size="sm" onClick={handleConfirm}>
            선택
          </Button>
        </div>
      </div>
    </div>
  )
}
