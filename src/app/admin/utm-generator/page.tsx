'use client'

import React, { useState } from 'react'
import { LinkIcon, Copy, RotateCcw, Check } from 'lucide-react'
import { AuthGuard } from '@/components/shared/auth-guard'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

function normalize(value: string): string {
  // 소문자 + 공백/하이픈을 언더스코어로
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/-+/g, '_')
}

function UtmGeneratorContent() {
  const [baseUrl, setBaseUrl] = useState('')
  const [utmSource, setUtmSource] = useState('')
  const [utmMedium, setUtmMedium] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')
  const [utmContent, setUtmContent] = useState('')
  const [utmTerm, setUtmTerm] = useState('')
  const [lowercase, setLowercase] = useState(true)
  const [encode, setEncode] = useState(true)
  const [result, setResult] = useState('')
  const [showResult, setShowResult] = useState(false)
  const [copied, setCopied] = useState(false)

  const buildURL = () => {
    const base = baseUrl.trim()
    const source = utmSource.trim()
    const medium = utmMedium.trim()
    const campaign = utmCampaign.trim()
    const content = utmContent.trim()
    const term = utmTerm.trim()

    if (!base) {
      alert('기본 URL을 입력해주세요.')
      return
    }
    if (!source || !medium || !campaign) {
      alert('utm_source / utm_medium / utm_campaign 은 필수입니다.')
      return
    }

    const params = new URLSearchParams()

    const v = (x: string) => {
      if (!x) return ''
      const vv = lowercase ? normalize(x) : x
      return encode ? encodeURIComponent(vv) : vv
    }

    params.set('utm_source', v(source))
    params.set('utm_medium', v(medium))
    params.set('utm_campaign', v(campaign))
    if (content) params.set('utm_content', v(content))
    if (term) params.set('utm_term', v(term))

    const joiner = base.includes('?') ? '&' : '?'

    const finalUrl = base + joiner + params.toString()
    setResult(finalUrl)
    setShowResult(true)
  }

  const copyToClipboard = async () => {
    if (!showResult || !result) {
      alert('먼저 URL을 생성해주세요.')
      return
    }
    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (e) {
      console.error(e)
      alert('복사에 실패했어요. 텍스트를 직접 선택하여 복사해주세요.')
    }
  }

  const resetForm = () => {
    setBaseUrl('')
    setUtmSource('')
    setUtmMedium('')
    setUtmCampaign('')
    setUtmContent('')
    setUtmTerm('')
    setLowercase(true)
    setEncode(true)
    setResult('')
    setShowResult(false)
    setCopied(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-blue-100 rounded-xl grid place-items-center">
          <LinkIcon className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">UTM 자동 생성기</h1>
          <p className="text-sm text-muted-foreground mt-1">
            기본 URL과 UTM 파라미터(소스/매체/캠페인 등)를 입력하면 추적 URL을 자동으로 만들어줍니다.
          </p>
        </div>
      </div>

      {/* Form */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Base URL */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2">
              기본 URL <span className="text-gray-500 font-normal">(예: https://luxury-select.co.kr/hotels/aman-tokyo)</span>
            </label>
            <Input
              type="url"
              placeholder="https://example.com/path"
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              className="w-full"
            />
          </div>

          {/* utm_source */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              utm_source <span className="text-gray-500 font-normal text-xs">(출처: naver, google, instagram, kakao 등)</span>
            </label>
            <Input
              placeholder="naver"
              value={utmSource}
              onChange={(e) => setUtmSource(e.target.value)}
              className="w-full"
            />
          </div>

          {/* utm_medium */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              utm_medium <span className="text-gray-500 font-normal text-xs">(매체: organic, blog, social, cpc, email, chat 등)</span>
            </label>
            <Input
              placeholder="blog"
              value={utmMedium}
              onChange={(e) => setUtmMedium(e.target.value)}
              className="w-full"
            />
          </div>

          {/* utm_campaign */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              utm_campaign <span className="text-gray-500 font-normal text-xs">(캠페인명: autumn_2025 등)</span>
            </label>
            <Input
              placeholder="autumn_2025"
              value={utmCampaign}
              onChange={(e) => setUtmCampaign(e.target.value)}
              className="w-full"
            />
          </div>

          {/* utm_content */}
          <div>
            <label className="block text-sm font-semibold mb-2">
              utm_content <span className="text-gray-500 font-normal text-xs">(선택: 광고/링크 구분)</span>
            </label>
            <Input
              placeholder="post_link"
              value={utmContent}
              onChange={(e) => setUtmContent(e.target.value)}
              className="w-full"
            />
          </div>

          {/* utm_term */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-2">
              utm_term <span className="text-gray-500 font-normal text-xs">(선택: 키워드)</span>
            </label>
            <Input
              placeholder="luxury+hotel"
              value={utmTerm}
              onChange={(e) => setUtmTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Options */}
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold mb-3">옵션</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={lowercase}
                  onChange={(e) => setLowercase(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">소문자/언더스코어로 정규화</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={encode}
                  onChange={(e) => setEncode(e.target.checked)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-sm">URL 인코딩(한글/공백 안전)</span>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="md:col-span-2 flex gap-3">
            <Button
              onClick={buildURL}
              className="bg-black text-white hover:bg-gray-800"
            >
              URL 생성
            </Button>
            <Button
              onClick={copyToClipboard}
              variant="outline"
              className="gap-2"
            >
              <Copy className="h-4 w-4" />
              복사
            </Button>
            <Button
              onClick={resetForm}
              variant="outline"
              className="gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              초기화
            </Button>
          </div>

          {/* Result */}
          {showResult && (
            <div className="md:col-span-2">
              <div
                onClick={copyToClipboard}
                className={cn(
                  'relative p-4 rounded-lg font-mono text-sm break-all cursor-pointer transition-all',
                  'hover:ring-2 hover:ring-green-500 hover:ring-offset-2',
                  copied ? 'bg-blue-600 text-white' : 'bg-green-700 text-white'
                )}
                title="클릭하여 복사"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="flex-1">{result}</span>
                  {copied ? (
                    <Check className="h-5 w-5 flex-shrink-0 animate-in fade-in zoom-in" />
                  ) : (
                    <Copy className="h-5 w-5 flex-shrink-0 opacity-70" />
                  )}
                </div>
                {copied && (
                  <div className="absolute top-2 right-2 bg-white text-blue-600 text-xs font-semibold px-2 py-1 rounded shadow-lg animate-in fade-in slide-in-from-top-1">
                    복사 완료!
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tip */}
      <div className="text-sm text-muted-foreground space-y-1">
        <div>
          <strong>Tip:</strong> 생성된 UTM 링크를 클릭하면 자동으로 복사됩니다.
        </div>
        <div>
          기존 URL에 이미 <code className="bg-gray-100 px-1 py-0.5 rounded">?</code>가 있다면 자동으로{' '}
          <code className="bg-gray-100 px-1 py-0.5 rounded">&</code>로 연결됩니다.
        </div>
      </div>
    </div>
  )
}

export default function UtmGeneratorPage() {
  return (
    <AuthGuard requiredRole="admin">
      <UtmGeneratorContent />
    </AuthGuard>
  )
}

