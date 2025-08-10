'use client'

import React from 'react'

// Deprecated: replaced by mapped read-only table in the edit page
export function BenefitPickerInput({ name, defaultValue }: { name: string; defaultValue?: string | null }) {
  const [open, setOpen] = React.useState(false)
  const [value, setValue] = React.useState<string>(defaultValue ?? '')
  const [rows, setRows] = React.useState<Array<{ benefit: string; benefit_description: string | null; start_date: string | null; end_date: string | null }>>([])
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const fetchRows = async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/benefits/list', { cache: 'no-store' })
      const json = await res.json()
      if (json.success) {
        const data = (json.data as Array<{ benefit: string; benefit_description: string | null; start_date: string | null; end_date: string | null }>).map((r) => ({
          benefit: String(r.benefit ?? ''),
          benefit_description: r.benefit_description ?? null,
          start_date: r.start_date ?? null,
          end_date: r.end_date ?? null,
        }))
        setRows(data)
      } else {
        setError(json.error || '불러오기 실패')
      }
    } catch {
      setError('네트워크 오류')
    } finally {
      setLoading(false)
    }
  }

  const openPopup = async () => {
    setOpen(true)
    if (rows.length === 0 && !loading) await fetchRows()
  }

  return (
    <div className="relative">
      <label className="mb-1 block text-xs font-medium text-gray-600">{name}</label>
      <div className="flex items-center gap-2">
        <input
          name={name}
          className="w-56 sm:w-64 max-w-full rounded-md border px-3 py-2 text-sm"
          value={value}
          data-initial={defaultValue ?? ''}
          onChange={(e) => setValue(e.target.value)}
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck={false}
        />
        <button
          type="button"
          className="rounded bg-gray-100 px-3 py-2 text-xs whitespace-nowrap hover:bg-gray-200"
          onClick={openPopup}
        >
          선택
        </button>
        <button
          type="button"
          className="rounded bg-red-50 px-3 py-2 text-xs whitespace-nowrap text-red-700 hover:bg-red-100"
          onClick={() => setValue('')}
        >
          삭제
        </button>
      </div>

      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute left-1/2 top-1/2 w-[min(90vw,900px)] -translate-x-1/2 -translate-y-1/2 rounded-lg border bg-white p-4 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-medium">기본 혜택 선택</div>
              <button type="button" className="rounded bg-gray-100 px-2 py-1 text-xs" onClick={() => setOpen(false)}>닫기</button>
            </div>
            {loading ? (
              <div className="p-4 text-sm text-gray-600">불러오는 중...</div>
            ) : error ? (
              <div className="p-4 text-sm text-red-700 bg-red-50 border">{error}</div>
            ) : rows.length === 0 ? (
              <div className="p-4 text-sm text-gray-600">데이터가 없습니다.</div>
            ) : (
              <div className="max-h-[60vh] overflow-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">benefit</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">benefit_description</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">start_date</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-600">end_date</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {rows.map((r, i) => (
                      <tr
                        key={`${r.benefit}-${i}`}
                        className="hover:bg-blue-50 cursor-pointer"
                        onClick={() => {
                          setValue(r.benefit ?? '')
                          setOpen(false)
                        }}
                      >
                        <td className="px-3 py-2 text-sm">{r.benefit}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{r.benefit_description ?? ''}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{r.start_date ?? ''}</td>
                        <td className="px-3 py-2 text-xs text-gray-700">{r.end_date ?? ''}</td>
                        <td className="px-3 py-2 text-right">
                          <button
                            type="button"
                            className="rounded bg-blue-600 px-2 py-1 text-xs text-white hover:bg-blue-700"
                            onClick={() => {
                              setValue(r.benefit ?? '')
                              setOpen(false)
                            }}
                          >선택</button>
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
    </div>
  )
}


