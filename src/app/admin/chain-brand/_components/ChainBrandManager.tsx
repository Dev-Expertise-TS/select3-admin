'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { highlightRowFields } from '@/components/shared/field-highlight'
import HotelSearchWidget from '@/components/shared/hotel-search-widget'

export type Chain = { chain_id: number; name_kr: string | null; name_en: string | null; slug: string | null }
export type Brand = { brand_id: number; name_kr: string | null; name_en: string | null; chain_id: number | null }

interface Props {
  chains: Chain[]
  brands: Brand[]
}

export function ChainBrandManager({ chains, brands }: Props) {
  const [selectedChainId, setSelectedChainId] = React.useState<number | null>(chains[0]?.chain_id ?? null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [dialogMessage, setDialogMessage] = React.useState('')
  const [onConfirmFn, setOnConfirmFn] = React.useState<(() => void) | null>(null)
  const [addingBrand, setAddingBrand] = React.useState(false)
  const [addingChain, setAddingChain] = React.useState(false)
  const [brandsState, setBrandsState] = React.useState<Brand[]>(brands)
  const [chainsState, setChainsState] = React.useState<Chain[]>(chains)
  const [showHotelConnectModal, setShowHotelConnectModal] = React.useState(false)
  const [selectedBrandForConnect, setSelectedBrandForConnect] = React.useState<Brand | null>(null)
  const [showSchemaInfo, setShowSchemaInfo] = React.useState(false)
  const createFormId = React.useId()
  const createChainFormId = React.useId()
  
  // 실제 존재하는 컬럼 확인
  const hasNameEn = React.useMemo(() => {
    return brands.length > 0 && brands[0].hasOwnProperty('name_en')
  }, [brands])
  
  const preventEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  React.useEffect(() => {
    // 호텔 체인 조회 결과를 브라우저 콘솔에 출력
    console.log('[chain-brand] chains (count=%d)', chains.length, chains)
    console.log('[chain-brand] brands (count=%d)', brands.length, brands)
    
    // 첫 번째 체인과 브랜드의 구조 로깅
    if (chains.length > 0) {
      console.log('[chain-brand] First chain structure:', chains[0])
    }
    if (brands.length > 0) {
      console.log('[chain-brand] First brand structure:', brands[0])
    }
  }, [chains, brands])

  // 왼쪽 호텔 체인 선택이 바뀌면 신규 입력 행은 취소(숨김)
  React.useEffect(() => {
    setAddingBrand(false)
  }, [selectedChainId])

  const filteredBrands = React.useMemo(() => {
    if (selectedChainId == null) return [] as Brand[]
    return brandsState.filter((b) => (b.chain_id ?? null) === selectedChainId)
  }, [brandsState, selectedChainId])

  const selectedChain = React.useMemo(() => {
    return chainsState.find((c) => c.chain_id === selectedChainId)
  }, [chainsState, selectedChainId])

  // 선택된 브랜드의 체인 정보 가져오기
  const selectedBrandChain = React.useMemo(() => {
    if (!selectedBrandForConnect) return null
    return chainsState.find((c) => c.chain_id === selectedBrandForConnect.chain_id)
  }, [chainsState, selectedBrandForConnect])

  const brandHeaderText = React.useMemo(() => {
    if (!selectedChain) return '브랜드'
    const chainName = selectedChain.name_kr || selectedChain.name_en || '이름 없음'
    const brandCount = filteredBrands.length
    return `${chainName} 브랜드 (${brandCount}개)`
  }, [selectedChain, filteredBrands.length])

  // 데이터가 없는 경우 안내 메시지 표시
  if (chains.length === 0 && brands.length === 0) {
    return (
      <div className="space-y-8">
        <div className="p-8 bg-white rounded-lg border border-gray-200 text-center">
          <div className="text-gray-500 mb-4">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">데이터가 없습니다</h3>
          <p className="text-sm text-gray-600 mb-4">
            호텔 체인과 브랜드 데이터가 아직 생성되지 않았습니다.
          </p>
          <div className="space-y-2">
            <p className="text-xs text-gray-500">
              • 첫 번째 체인을 추가하려면 &quot;체인 추가&quot; 버튼을 클릭하세요
            </p>
            <p className="text-xs text-gray-500">
              • 체인이 생성된 후 브랜드를 추가할 수 있습니다
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="grid gap-4 lg:grid-cols-2">
        <ConfirmDialog
          open={dialogOpen}
          message={dialogMessage}
          onClose={() => setDialogOpen(false)}
          onConfirm={() => {
            try { onConfirmFn?.() } finally {
              setOnConfirmFn(null)
              setDialogOpen(false)
            }
          }}
        />
      {/* Left: Chains */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium">호텔 체인</h2>
            <p className="text-xs text-muted-foreground">호텔 체인(한글) / 호텔 체인(영문)</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setShowSchemaInfo(!showSchemaInfo)}
            >
              스키마 정보
            </Button>
            <Button
              type="button"
              size="sm"
              variant="teal"
              onClick={() => setAddingChain(true)}
              disabled={addingChain}
            >
              체인 추가
            </Button>
          </div>
        </div>

        {/* 스키마 정보 표시 */}
        {showSchemaInfo && (
          <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded text-xs">
            <div className="font-medium mb-2">현재 데이터 구조:</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <strong>Chains ({chainsState.length}개):</strong>
                {chainsState.length > 0 ? (
                  <div className="mt-1 text-gray-600">
                    {Object.keys(chainsState[0]).map(key => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className="font-mono">{typeof chainsState[0][key as keyof Chain]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">데이터 없음</span>
                )}
              </div>
              <div>
                <strong>Brands ({brandsState.length}개):</strong>
                {brandsState.length > 0 ? (
                  <div className="mt-1 text-gray-600">
                    {Object.keys(brandsState[0]).map(key => (
                      <div key={key} className="flex justify-between">
                        <span>{key}:</span>
                        <span className="font-mono">{typeof brandsState[0][key as keyof Brand]}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <span className="text-gray-500">데이터 없음</span>
                )}
              </div>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="min-w-[520px] w-full text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="px-3 py-2 text-left">호텔 체인(한글)</th>
                <th className="px-3 py-2 text-left">호텔 체인(영문)</th>
                <th className="px-3 py-2 text-left">Slug</th>
                <th className="px-3 py-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {chainsState.map((c) => {
                const active = c.chain_id === selectedChainId
                const formId = `chain-form-${c.chain_id}`
                return (
                  <tr
                    key={c.chain_id}
                    data-chain-id={c.chain_id}
                    className={cn('border-t hover:bg-gray-50', active && 'bg-primary/10')}
                  >
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setSelectedChainId(c.chain_id)}>
                      <form id={formId} action="/api/chain-brand/chain/save" method="post" className="hidden">
                        <input type="hidden" name="chain_id" value={String(c.chain_id)} />
                      </form>
                      <input 
                        form={formId} 
                        name="name_kr" 
                        defaultValue={String(c.name_kr ?? '')} 
                        onKeyDown={preventEnter} 
                        placeholder="체인(한글)" 
                        className="w-full rounded border px-2 py-1 text-xs" 
                      />
                    </td>
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setSelectedChainId(c.chain_id)}>
                      <input 
                        form={formId} 
                        name="name_en" 
                        defaultValue={String(c.name_en ?? '')} 
                        onKeyDown={preventEnter} 
                        placeholder="체인(영문)" 
                        className="w-full rounded border px-2 py-1 text-xs" 
                      />
                    </td>
                    <td className="px-3 py-2 cursor-pointer" onClick={() => setSelectedChainId(c.chain_id)}>
                      <input 
                        form={formId} 
                        name="slug" 
                        defaultValue={String(c.slug ?? '')} 
                        onKeyDown={preventEnter} 
                        placeholder="slug" 
                        className="w-full rounded border px-2 py-1 text-xs" 
                      />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          type="button"
                          size="xs"
                          variant="teal"
                          onClick={async () => {
                            try {
                              const nameKrInput = document.querySelector(`input[form="${formId}"][name="name_kr"]`) as HTMLInputElement | null
                              const nameEnInput = document.querySelector(`input[form="${formId}"][name="name_en"]`) as HTMLInputElement | null
                              const slugInput = document.querySelector(`input[form="${formId}"][name="slug"]`) as HTMLInputElement | null
                              const nkr = (nameKrInput?.value ?? '').trim()
                              const nen = (nameEnInput?.value ?? '').trim()
                              const slug = (slugInput?.value ?? '').trim()
                              
                              if (!nkr && !nen) {
                                setDialogMessage('체인(한글) 또는 체인(영문) 중 하나는 입력해야 합니다.')
                                setOnConfirmFn(() => () => {})
                                setDialogOpen(true)
                                return
                              }
                              
                              const fd = new FormData()
                              fd.append('chain_id', String(c.chain_id))
                              fd.append('name_kr', nkr)
                              fd.append('name_en', nen)
                              fd.append('slug', slug)
                              const res = await fetch('/api/chain-brand/chain/save', { method: 'POST', body: fd })
                              const json = await res.json().catch(() => null)
                              if (json?.success) {
                                // 로컬 상태 업데이트
                                setChainsState((prev) => prev.map((x) => (x.chain_id === c.chain_id ? { ...x, name_kr: nkr, name_en: nen, slug: slug } : x)))
                                // 공통 하이라이트 적용
                                const row = nameKrInput?.closest('tr') ?? null
                                highlightRowFields(row, 'input[name="name_kr"], input[name="name_en"], input[name="slug"]')
                              } else {
                                const errMsg = (json && json.error) ? String(json.error) : '저장 중 오류가 발생했습니다.'
                                setDialogMessage(errMsg)
                                setOnConfirmFn(() => () => {})
                                setDialogOpen(true)
                              }
                            } catch {
                              setDialogMessage('저장 중 오류가 발생했습니다.')
                              setOnConfirmFn(() => () => {})
                              setDialogOpen(true)
                            }
                          }}
                        >
                          저장
                        </Button>
                        <form action="/api/chain-brand/chain/delete" method="post" className="inline">
                          <input type="hidden" name="chain_id" value={String(c.chain_id)} />
                          <Button type="submit" size="xs" variant="destructive">삭제</Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {addingChain && (
                <tr className="border-t bg-teal-50/40">
                  <td className="px-3 py-2">
                    <form id={createChainFormId} action="/api/chain-brand/chain/create" method="post" className="hidden" onSubmit={(e) => { e.preventDefault(); e.stopPropagation() }}>
                    </form>
                    <input 
                      form={createChainFormId} 
                      name="name_kr" 
                      placeholder="체인(한글)" 
                      onKeyDown={preventEnter} 
                      className="w-full rounded border px-2 py-1 text-xs" 
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input 
                      form={createChainFormId} 
                      name="name_en" 
                      placeholder="체인(영문)" 
                      onKeyDown={preventEnter} 
                      className="w-full rounded border px-2 py-1 text-xs" 
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input 
                      form={createChainFormId} 
                      name="slug" 
                      placeholder="slug" 
                      onKeyDown={preventEnter} 
                      className="w-full rounded border px-2 py-1 text-xs" 
                    />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="teal"
                        onClick={async () => {
                          const nameKrInput = document.querySelector(`input[form="${createChainFormId}"][name="name_kr"]`) as HTMLInputElement | null
                          const nameEnInput = document.querySelector(`input[form="${createChainFormId}"][name="name_en"]`) as HTMLInputElement | null
                          const slugInput = document.querySelector(`input[form="${createChainFormId}"][name="slug"]`) as HTMLInputElement | null
                          const nkr = (nameKrInput?.value ?? '').trim()
                          const nen = (nameEnInput?.value ?? '').trim()
                          const slug = (slugInput?.value ?? '').trim()
                          
                          if (!nkr && !nen) {
                            setDialogMessage('체인(한글) 또는 체인(영문) 중 하나는 입력해야 합니다.')
                            setOnConfirmFn(() => () => {})
                            setDialogOpen(true)
                            return
                          }
                          
                          const fd = new FormData()
                          fd.append('name_kr', nkr)
                          fd.append('name_en', nen)
                          fd.append('slug', slug)
                          try {
                            const res = await fetch('/api/chain-brand/chain/create', { method: 'POST', body: fd })
                            const json = await res.json().catch(() => null)
                            if (json?.success) {
                              // 즉시 신규 입력 행 숨김
                              setAddingChain(false)
                              // 페이지 새로고침으로 최신 데이터 가져오기
                              window.location.reload()
                            } else {
                              setDialogMessage('저장 중 오류가 발생했습니다.')
                              setOnConfirmFn(() => () => {})
                              setDialogOpen(true)
                              setAddingChain(false)
                            }
                          } catch {
                            setDialogMessage('저장 중 오류가 발생했습니다.')
                            setOnConfirmFn(() => () => {})
                            setDialogOpen(true)
                            setAddingChain(false)
                          }
                        }}
                      >
                        저장
                      </Button>
                      <Button type="button" size="xs" variant="ghost" onClick={() => setAddingChain(false)}>취소</Button>
                    </div>
                  </td>
                </tr>
              )}
              {chainsState.length === 0 && !addingChain && (
                <tr>
                  <td className="px-3 py-4 text-center text-xs text-muted-foreground" colSpan={2}>
                    <div className="space-y-2">
                      <p>체인 데이터가 없습니다.</p>
                      <p className="text-blue-600">&quot;체인 추가&quot; 버튼을 클릭하여 첫 번째 체인을 생성하세요.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Right: Brands (filtered) */}
      <section className="rounded-lg border bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-medium">{brandHeaderText}</h2>
          </div>
          <Button
            type="button"
            size="sm"
            variant="violet"
            onClick={() => setAddingBrand(true)}
            disabled={addingBrand || selectedChainId == null}
            title={selectedChainId == null ? '먼저 체인을 선택해주세요' : '새 브랜드 추가'}
          >
            브랜드 추가
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm table-fixed">
            <thead>
              <tr className="bg-muted/60">
                <th className="px-1 py-2 text-left w-2/3">브랜드</th>
                <th className="px-1 py-2 text-right w-1/3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {selectedChainId == null && (
                <tr>
                  <td className="px-3 py-4 text-center text-xs text-muted-foreground" colSpan={2}>
                    <div className="space-y-2">
                      <p>왼쪽 테이블에서 체인을 선택하세요.</p>
                      <p className="text-blue-600">체인을 선택한 후 브랜드를 추가할 수 있습니다.</p>
                    </div>
                  </td>
                </tr>
              )}
              {selectedChainId != null && filteredBrands.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-xs text-muted-foreground" colSpan={2}>
                    <div className="space-y-2">
                      <p>선택한 체인의 브랜드가 없습니다.</p>
                      <p className="text-blue-600">&quot;브랜드 추가&quot; 버튼을 클릭하여 첫 번째 브랜드를 생성하세요.</p>
                    </div>
                  </td>
                </tr>
              )}
              {filteredBrands.map((b) => {
                const formId = `brand-form-${b.brand_id}`
                return (
                  <tr key={b.brand_id} data-brand-id={b.brand_id} className="border-t">
                    <td className="px-1 py-2">
                      {/* 숨김 폼: 다른 셀의 입력들도 form 속성으로 묶음 */}
                      <form id={formId} action="/api/chain-brand/brand/save" method="post" className="hidden">
                        <input type="hidden" name="brand_id" value={String(b.brand_id)} />
                        <input type="hidden" name="chain_id" value={String(selectedChainId ?? '')} />
                      </form>
                      <div className="flex items-center gap-1">
                        <input form={formId} name="name_kr" defaultValue={String(b.name_kr ?? '')} onKeyDown={preventEnter} placeholder="브랜드(한글)" className="w-24 sm:w-28 md:w-32 lg:w-36 rounded border px-2 py-1 text-xs" />
                        {hasNameEn && (
                          <input form={formId} name="name_en" defaultValue={String(b.name_en ?? '')} onKeyDown={preventEnter} placeholder="브랜드(영문)" className="w-24 sm:w-28 md:w-32 lg:w-36 rounded border px-2 py-1 text-xs" />
                        )}
                      </div>
                    </td>
                    <td className="px-1 py-2 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <Button
                          type="button"
                          size="xs"
                          className="bg-orange-500 text-white hover:bg-orange-600"
                          onClick={() => {
                            setSelectedBrandForConnect(b)
                            setShowHotelConnectModal(true)
                          }}
                        >
                          호텔 연결
                        </Button>
                        <Button
                          type="button"
                          size="xs"
                          variant="teal"
                          onClick={async () => {
                            try {
                              // form 속성으로 연결된 input들을 직접 찾기
                              const nameKrInput = document.querySelector(`input[form="${formId}"][name="name_kr"]`) as HTMLInputElement | null
                              const nameEnInput = document.querySelector(`input[form="${formId}"][name="name_en"]`) as HTMLInputElement | null
                              const nkr = (nameKrInput?.value ?? '').trim()
                              const nen = (nameEnInput?.value ?? '').trim()
                              console.log('[brand][client] updating existing:', { brand_id: b.brand_id, chain_id: selectedChainId, name_kr: nkr, name_en: nen })
                              
                              if (!nkr && !nen) {
                                setDialogMessage('브랜드(한글) 또는 브랜드(영문) 중 하나는 입력해야 합니다.')
                                setOnConfirmFn(() => () => {})
                                setDialogOpen(true)
                                return
                              }
                              
                              const fd = new FormData()
                              fd.append('brand_id', String(b.brand_id))
                              fd.append('chain_id', String(selectedChainId ?? ''))
                              fd.append('name_kr', nkr)
                              fd.append('name_en', nen)
                              const res = await fetch('/api/chain-brand/brand/save', { method: 'POST', body: fd })
                              const json = await res.json().catch(() => null)
                              if (json?.success && json.data) {
                                // 로컬 상태 업데이트
                                setBrandsState((prev) => prev.map((x) => (x.brand_id === json.data.brand_id ? (json.data as Brand) : x)))
                                // 공통 하이라이트 적용
                                const row = nameKrInput?.closest('tr') ?? null
                                highlightRowFields(row, 'input[name="name_kr"], input[name="name_en"]')
                              } else {
                                const errMsg = (json && json.error) ? String(json.error) : '저장 중 오류가 발생했습니다.'
                                setDialogMessage(errMsg)
                                setOnConfirmFn(() => () => {})
                                setDialogOpen(true)
                              }
                            } catch {
                              setDialogMessage('저장 중 오류가 발생했습니다.')
                              setOnConfirmFn(() => () => {})
                              setDialogOpen(true)
                            }
                          }}
                        >
                          저장
                        </Button>
                        <form action="/api/chain-brand/brand/delete" method="post" className="inline">
                          <input type="hidden" name="id" value={String(b.brand_id)} />
                          <Button type="submit" size="xs" variant="destructive">삭제</Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {addingBrand && (
                <tr className="border-t bg-violet-50/40">
                  <td className="px-1 py-2">
                    <form id={createFormId} action="/api/chain-brand/brand/save" method="post" className="hidden" onSubmit={(e) => { e.preventDefault(); e.stopPropagation() }}>
                      <input type="hidden" name="chain_id" value={String(selectedChainId ?? '')} />
                    </form>
                    <div className="flex items-center gap-1">
                      <input form={createFormId} name="name_kr" placeholder="브랜드(한글)" onKeyDown={preventEnter} className="w-24 sm:w-28 md:w-32 lg:w-36 rounded border px-2 py-1 text-xs" />
                      {hasNameEn && (
                        <input form={createFormId} name="name_en" placeholder="브랜드(영문)" onKeyDown={preventEnter} className="w-24 sm:w-28 md:w-32 lg:w-36 rounded border px-2 py-1 text-xs" />
                      )}
                    </div>
                    {/* 디버깅 정보 */}
                    <div className="text-xs text-gray-500 mt-1">
                      선택된 체인 ID: {selectedChainId ?? '없음'}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        type="button"
                        size="xs"
                        variant="teal"
                        onClick={async () => {
                          if (selectedChainId == null) {
                            setDialogMessage('체인을 먼저 선택하세요.')
                            setOnConfirmFn(() => () => {})
                            setDialogOpen(true)
                            return
                          }
                          
                          // form 속성으로 연결된 input들을 직접 찾기
                          const nameKrInput = document.querySelector(`input[form="${createFormId}"][name="name_kr"]`) as HTMLInputElement | null
                          const nameEnInput = hasNameEn ? document.querySelector(`input[form="${createFormId}"][name="name_en"]`) as HTMLInputElement | null : null
                          
                          if (!nameKrInput) {
                            setDialogMessage('입력 필드를 찾을 수 없습니다.')
                            setOnConfirmFn(() => () => {})
                            setDialogOpen(true)
                            return
                          }
                          
                          const nkr = (nameKrInput.value ?? '').trim()
                          const nen = hasNameEn ? (nameEnInput?.value ?? '').trim() : ''
                          
                          console.log('[brand][client] new brand values:', { 
                            chain_id: selectedChainId,
                            name_kr: nkr, 
                            name_en: nen,
                            hasNameEn
                          })
                          
                          if (!nkr && !nen) {
                            setDialogMessage('브랜드(한글) 또는 브랜드(영문) 중 하나는 입력해야 합니다.')
                            setOnConfirmFn(() => () => {})
                            setDialogOpen(true)
                            return
                          }
                          
                          const fd = new FormData()
                          // 새 브랜드 생성이므로 brand_id는 전송하지 않음
                          fd.append('chain_id', String(selectedChainId))
                          fd.append('name_kr', nkr)
                          if (hasNameEn) {
                            fd.append('name_en', nen)
                          }
                          
                          // FormData 내용 검증
                          const formDataObj = {
                            chain_id: fd.get('chain_id'),
                            name_kr: fd.get('name_kr'),
                            ...(hasNameEn && { name_en: fd.get('name_en') })
                          }
                          
                          console.log('[brand][client] sending FormData:', formDataObj)
                          
                          // 체인 ID 검증
                          if (!formDataObj.chain_id || formDataObj.chain_id === 'null' || formDataObj.chain_id === 'undefined') {
                            setDialogMessage('체인 ID가 올바르지 않습니다. 체인을 다시 선택해주세요.')
                            setOnConfirmFn(() => () => {})
                            setDialogOpen(true)
                            return
                          }
                          
                          try {
                            const res = await fetch('/api/chain-brand/brand/save', { 
                              method: 'POST', 
                              body: fd 
                            })
                            
                            console.log('[brand][client] response status:', res.status)
                            
                            const json = await res.json().catch(() => null)
                            console.log('[brand][client] response json:', json)
                            
                            if (json?.success && json.data) {
                              // 즉시 신규 입력 행 숨김 (깜빡임 방지)
                              setAddingBrand(false)
                              
                              // 새 브랜드를 로컬 상태에 추가
                              const newBrand: Brand = {
                                brand_id: json.data.brand_id,
                                chain_id: selectedChainId,
                                name_kr: nkr,
                                name_en: hasNameEn ? nen : null
                              }
                              
                              setBrandsState((prev) => [...prev, newBrand])
                              
                              setDialogMessage('브랜드가 성공적으로 생성되었습니다.')
                              setOnConfirmFn(() => () => {
                                // 확인 팝업 OK 클릭 시 하이라이트 적용
                                setTimeout(() => {
                                  const newBrandRow = document.querySelector(`tr[data-brand-id="${json.data.brand_id}"]`)
                                  if (newBrandRow) {
                                    highlightRowFields(newBrandRow, 'input[name="name_kr"], input[name="name_en"]')
                                  }
                                }, 50)
                              })
                              setDialogOpen(true)
                            } else {
                              const errMsg = json?.error || '저장 중 오류가 발생했습니다.'
                              const details = json?.details ? `\n\n상세 오류: ${json.details}` : ''
                              setDialogMessage(`${errMsg}${details}`)
                              setOnConfirmFn(() => () => {})
                              setDialogOpen(true)
                              // 오류 시에도 신규 입력 행 숨김
                              setAddingBrand(false)
                            }
                          } catch (error) {
                            console.error('[brand][client] fetch error:', error)
                            setDialogMessage(`네트워크 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
                            setOnConfirmFn(() => () => {})
                            setDialogOpen(true)
                            // 오류 시에도 신규 입력 행 숨김
                            setAddingBrand(false)
                          }
                        }}
                      >
                        저장
                      </Button>
                      <Button type="button" size="xs" variant="ghost" onClick={() => setAddingBrand(false)}>취소</Button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      </div>

      {/* 호텔 연결 모달 */}
      {showHotelConnectModal && selectedBrandForConnect && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => {
            setShowHotelConnectModal(false)
            setSelectedBrandForConnect(null)
          }} />
          <div className="absolute left-1/2 top-1/2 w-[min(95vw,1200px)] h-[80vh] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-6 shadow-xl overflow-hidden flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">호텔 연결</h2>
                <div className="mt-1 text-sm text-gray-600">
                  연결 대상 체인 & 브랜드: 
                  <span className="font-medium text-gray-900 ml-1">
                    {selectedBrandChain?.name_kr || '-'}({selectedBrandChain?.name_en || '-'}) / {selectedBrandForConnect.name_kr || '-'}({selectedBrandForConnect.name_en || '-'})
                  </span>
                </div>
              </div>
              <Button 
                type="button" 
                variant="secondary" 
                size="sm" 
                onClick={() => {
                  setShowHotelConnectModal(false)
                  setSelectedBrandForConnect(null)
                }}
              >
                닫기
              </Button>
            </div>
            
            {/* 모달 콘텐츠 */}
            <div className="flex-1 overflow-auto">
              <HotelSearchWidget 
                hideHeader={true}
                enableHotelEdit={true}
                showInitialHotels={true}
                enableChainBrandConnect={true}
                connectChainId={selectedBrandForConnect?.chain_id || null}
                connectBrandId={selectedBrandForConnect?.brand_id || null}
                onConnectSuccess={(sabreId) => {
                  console.log(`호텔 ${sabreId}가 체인 ${selectedBrandForConnect?.chain_id}, 브랜드 ${selectedBrandForConnect?.brand_id}에 연결되었습니다.`)
                  // 연결 성공 시 모달 닫기 (선택사항)
                  // setShowHotelConnectModal(false)
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


