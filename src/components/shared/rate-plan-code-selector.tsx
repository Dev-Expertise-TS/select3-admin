"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"

interface RatePlanCodeSelectorProps {
  selectedCodes: string[]
  onChange: (codes: string[]) => void
  dbCodes?: string[]
  title?: string
  description?: string
  className?: string
  showLegend?: boolean
  onCodesLoaded?: (codes: string[]) => void
}

type RatePlanCodesResponse = {
  success: boolean
  data?: string[]
  error?: string
}

let cachedCodes: string[] | null = null
let cachedError: string | null = null
let inflightPromise: Promise<string[]> | null = null

async function fetchRatePlanCodesOnce(): Promise<string[]> {
  if (cachedCodes) {
    return cachedCodes
  }
  if (cachedError) {
    throw new Error(cachedError)
  }
  if (inflightPromise) {
    return inflightPromise
  }
  inflightPromise = (async () => {
    const response = await fetch("/api/rate-plan-codes", { cache: "no-store" })
    if (!response.ok) {
      const text = await response.text()
      throw new Error(text || "Rate plan codes를 불러오지 못했습니다.")
    }
    const json: RatePlanCodesResponse = await response.json()
    if (!json.success || !json.data) {
      throw new Error(json.error || "Rate plan codes를 불러오지 못했습니다.")
    }
    cachedCodes = json.data
    cachedError = null
    return json.data
  })()
  try {
    return await inflightPromise
  } catch (err) {
    cachedError = err instanceof Error ? err.message : "Rate plan codes를 불러오지 못했습니다."
    inflightPromise = null
    throw err
  } finally {
    inflightPromise = null
  }
}

export function RatePlanCodeSelector({
  selectedCodes,
  onChange,
  dbCodes = [],
  title = "Rate Plan Codes",
  description,
  className,
  showLegend = true,
  onCodesLoaded,
}: RatePlanCodeSelectorProps) {
  const [codes, setCodes] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true
    const hydrate = async () => {
      setError(null)
      if (cachedCodes) {
        setCodes(cachedCodes)
        onCodesLoaded?.(cachedCodes)
        return
      }
      if (cachedError) {
        setError(cachedError)
        return
      }
      setLoading(true)
      try {
        const data = await fetchRatePlanCodesOnce()
        if (!isMounted) return
        setCodes(data)
        onCodesLoaded?.(data)
      } catch (err) {
        if (!isMounted) return
        const message = err instanceof Error ? err.message : "Rate plan codes를 불러오지 못했습니다."
        setError(message)
      } finally {
        if (isMounted) setLoading(false)
      }
    }
    hydrate()
    return () => {
      isMounted = false
    }
  }, [onCodesLoaded])

  const toggleCode = (code: string) => {
    if (!code) return
    if (selectedCodes.includes(code)) {
      onChange(selectedCodes.filter((c) => c !== code))
    } else {
      onChange([...selectedCodes, code])
    }
  }

  return (
    <div className={cn("space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-900">{title}</p>
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
      </div>
      {showLegend && (
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
              DB
            </span>
            <span>현재 설정값</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-3 h-3 bg-gray-300 rounded" />
            <span>기타</span>
          </div>
        </div>
      )}
      {loading ? (
        <div className="flex items-center text-sm text-gray-500">
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Loading rate plan codes...
        </div>
      ) : error ? (
        <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-600">
          {error}
        </div>
      ) : codes.length === 0 ? (
        <div className="text-sm text-gray-500 italic">Rate plan codes가 설정되어 있지 않습니다.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-64 overflow-y-auto border border-gray-200 rounded p-3">
          {codes.map((code) => {
            const isSelected = selectedCodes.includes(code)
            const isDbCode = dbCodes.includes(code)
            return (
              <label key={code} className="flex items-center space-x-2 text-sm">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleCode(code)}
                  className="rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                />
                <span className={cn("flex items-center gap-1", isDbCode ? "text-gray-900 font-medium" : "text-gray-600")}>
                  {code}
                  {isDbCode && (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                      DB
                    </span>
                  )}
                </span>
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}

