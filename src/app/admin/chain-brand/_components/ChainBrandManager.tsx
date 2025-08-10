'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { ConfirmDialog } from '@/components/shared/confirm-dialog'
import { isFormDirty } from '@/components/shared/form-dirty'
import { highlightRowFields } from '@/components/shared/field-highlight'

export type Chain = { chain_id: number; chain_code: string; name_kr: string | null; name_en: string | null }
export type Brand = { brand_id: number; brand_code: string; name_kr: string | null; name_en: string | null; chain_id: number | null }

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
  const [brandsState, setBrandsState] = React.useState<Brand[]>(brands)
  const createFormId = React.useId()
  const preventEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      e.stopPropagation()
    }
  }

  React.useEffect(() => {
    // 호텔 체인 조회 결과를 브라우저 콘솔에 출력
    console.log('[chain-brand] chains (count=%d)', chains.length, chains)
  }, [chains])

  // 왼쪽 호텔 체인 선택이 바뀌면 신규 입력 행은 취소(숨김)
  React.useEffect(() => {
    setAddingBrand(false)
  }, [selectedChainId])

  const filteredBrands = React.useMemo(() => {
    if (selectedChainId == null) return [] as Brand[]
    return brandsState.filter((b) => (b.chain_id ?? null) === selectedChainId)
  }, [brandsState, selectedChainId])

  const selectedChain = React.useMemo(() => {
    return chains.find((c) => c.chain_id === selectedChainId)
  }, [chains, selectedChainId])

  const brandHeaderText = React.useMemo(() => {
    if (!selectedChain) return '브랜드'
    const chainName = selectedChain.name_kr || selectedChain.name_en || '이름 없음'
    const brandCount = filteredBrands.length
    return `${chainName} 브랜드 (${brandCount}개)`
  }, [selectedChain, filteredBrands.length])

  return (
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
          <form action="/api/chain-brand/chain/create" method="post">
            <Button
              type="button"
              size="sm"
              variant="teal"
              onClick={() => {
                // 호텔 상세 편집 저장 UX와 동일: 변경 없음/저장 케이스를 안내
                setDialogMessage('체인 관리 기능은 이 화면에서 추가/수정 버튼으로 진행됩니다.')
                setDialogOpen(true)
              }}
            >
              체인 관리
            </Button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[520px] w-full text-sm">
            <thead>
              <tr className="bg-muted/60">
                <th className="px-3 py-2 text-left">호텔 체인(한글)</th>
                <th className="px-3 py-2 text-left">호텔 체인(영문)</th>
              </tr>
            </thead>
            <tbody>
              {chains.map((c) => {
                const active = c.chain_id === selectedChainId
                return (
                  <tr
                    key={c.chain_id}
                    className={cn('border-t hover:bg-gray-50 cursor-pointer', active && 'bg-primary/10')}
                    onClick={() => {
                      if (c.chain_id !== selectedChainId) {
                        setAddingBrand(false)
                      }
                      setSelectedChainId(c.chain_id)
                    }}
                    aria-selected={active}
                  >
                    <td className="px-3 py-2">{c.name_kr ?? '—'}</td>
                    <td className="px-3 py-2">{c.name_en ?? '—'}</td>
                  </tr>
                )
              })}
              {chains.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-xs text-muted-foreground" colSpan={2}>
                    체인 데이터가 없습니다.
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
            disabled={addingBrand}
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
                    왼쪽 테이블에서 체인을 선택하세요.
                  </td>
                </tr>
              )}
              {selectedChainId != null && filteredBrands.length === 0 && (
                <tr>
                  <td className="px-3 py-4 text-center text-xs text-muted-foreground" colSpan={2}>
                    선택한 체인의 브랜드가 없습니다.
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
                        <input form={formId} name="name_en" defaultValue={String(b.name_en ?? '')} onKeyDown={preventEnter} placeholder="브랜드(영문)" className="w-24 sm:w-28 md:w-32 lg:w-36 rounded border px-2 py-1 text-xs" />
                      </div>
                    </td>
                    <td className="px-1 py-2 text-right">
                      <div className="flex items-center justify-end gap-0.5">
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
                            } catch (err) {
                              console.error('save error', err)
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
                      <input form={createFormId} name="name_en" placeholder="브랜드(영문)" onKeyDown={preventEnter} className="w-24 sm:w-28 md:w-32 lg:w-36 rounded border px-2 py-1 text-xs" />
                    </div>
                  </td>
                  <td className="px-1 py-2 text-right">
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
                          const nameEnInput = document.querySelector(`input[form="${createFormId}"][name="name_en"]`) as HTMLInputElement | null
                          const nkr = (nameKrInput?.value ?? '').trim()
                          const nen = (nameEnInput?.value ?? '').trim()
                          console.log('[brand][client] new brand values:', { name_kr: nkr, name_en: nen })
                          if (!nkr && !nen) {
                            setDialogMessage('브랜드(한글) 또는 브랜드(영문) 중 하나는 입력해야 합니다.')
                            setOnConfirmFn(() => () => {})
                            setDialogOpen(true)
                            return
                          }
                          const fd = new FormData()
                          fd.append('chain_id', String(selectedChainId))
                          fd.append('name_kr', nkr)
                          fd.append('name_en', nen)
                          try {
                            const res = await fetch('/api/chain-brand/brand/save', { method: 'POST', body: fd })
                            const json = await res.json().catch(() => null)
                            if (json?.success && json.data) {
                              // 즉시 신규 입력 행 숨김 (깜빡임 방지)
                              setAddingBrand(false)
                              setBrandsState((prev) => [...prev, json.data as Brand])
                              setDialogMessage('변경 사항을 저장하였습니다.')
                              setOnConfirmFn(() => () => {
                                // 확인 팝업 OK 클릭 시 하이라이트 적용
                                setTimeout(() => {
                                  const newBrandRow = document.querySelector(`tr[data-brand-id="${json.data.brand_id}"]`)
                                  highlightRowFields(newBrandRow, 'input[name="name_kr"], input[name="name_en"]')
                                }, 50)
                              })
                              setDialogOpen(true)
                            } else {
                              setDialogMessage('저장 중 오류가 발생했습니다.')
                              setOnConfirmFn(() => () => {})
                              setDialogOpen(true)
                              // 오류 시에도 신규 입력 행 숨김
                              setAddingBrand(false)
                            }
                          } catch (err) {
                            setDialogMessage('저장 중 오류가 발생했습니다.')
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
  )
}


