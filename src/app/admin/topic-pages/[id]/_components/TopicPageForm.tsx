'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Save, Sparkles, Wand2 } from 'lucide-react'
import { TopicPage } from '@/types/topic-page'
import { MultiSelectField } from '@/components/shared/multi-select-field'

interface TopicPageFormProps {
  topicPage?: TopicPage
  isNew: boolean
}

// 토픽 페이지 데이터를 폼 데이터로 변환
const topicPageToFormData = (page?: TopicPage) => ({
  slug: page?.slug || '',
  title_ko: page?.title_ko || '',
  where_countries: page?.where_countries?.join(', ') || '',
  where_cities: page?.where_cities || [],
  companions: page?.companions || [],
  styles: page?.styles || [],
  hero_image_url: page?.hero_image_url || '',
  intro_rich_ko: page?.intro_rich_ko || '',
  hashtags: page?.hashtags || [],
  status: page?.status || 'draft' as const,
  publish: page?.publish ?? false,
  publish_at: page?.publish_at ? new Date(page.publish_at).toISOString().slice(0, 16) : '',
  // SEO 필드
  seo_title_ko: page?.seo_title_ko || '',
  seo_description_ko: page?.seo_description_ko || '',
  seo_canonical_url: page?.seo_canonical_url || '',
  meta_robots: page?.meta_robots || 'index,follow',
  og_title: page?.og_title || '',
  og_description: page?.og_description || '',
  og_image_url: page?.og_image_url || '',
  twitter_title: page?.twitter_title || '',
  twitter_description: page?.twitter_description || '',
  twitter_image_url: page?.twitter_image_url || '',
  seo_hreflang: page?.seo_hreflang ? JSON.stringify(page.seo_hreflang, null, 2) : '[]',
  seo_schema_json: page?.seo_schema_json ? JSON.stringify(page.seo_schema_json, null, 2) : '',
  sitemap_priority: String(page?.sitemap_priority ?? 0.6),
  sitemap_changefreq: page?.sitemap_changefreq || 'weekly',
})

export function TopicPageForm({ topicPage, isNew }: TopicPageFormProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [formData, setFormData] = useState(() => topicPageToFormData(topicPage))
  const [isGeneratingSeo, setIsGeneratingSeo] = useState(false)
  const [isGeneratingIntro, setIsGeneratingIntro] = useState(false)

  // 도시 목록 로드 함수
  const fetchCities = async () => {
    const res = await fetch('/api/regions?type=city&pageSize=1000&status=active')
    if (!res.ok) throw new Error('도시 목록 조회 실패')
    const result = await res.json()
    if (result.success && result.data) {
      return result.data.map((city: any) => ({
        id: String(city.id),
        label: city.city_ko || city.city_en || '',
        sublabel: city.city_en || undefined,
      }))
    }
    return []
  }

  // 태그 목록 로드 함수 (동행인)
  const fetchCompanionTags = async () => {
    // 1. 카테고리 조회
    const categoryRes = await fetch('/api/hashtags/categories')
    if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
    const categoryResult = await categoryRes.json()
    
    if (categoryResult.success && categoryResult.data) {
      const category = categoryResult.data.find((cat: any) => cat.slug === 'companions')
      if (!category) return []
      
      // 2. 태그 조회
      const tagsRes = await fetch(`/api/hashtags/tags?categoryId=${category.id}&isActive=true`)
      if (!tagsRes.ok) throw new Error('태그 조회 실패')
      const tagsResult = await tagsRes.json()
      
      if (tagsResult.success && tagsResult.data) {
        return tagsResult.data.map((tag: any) => ({
          id: tag.id,
          label: tag.name_ko || tag.name_en || '',
          sublabel: tag.name_en || undefined,
        }))
      }
    }
    return []
  }

  // 태그 목록 로드 함수 (스타일)
  const fetchStyleTags = async () => {
    // 1. 카테고리 조회
    const categoryRes = await fetch('/api/hashtags/categories')
    if (!categoryRes.ok) throw new Error('카테고리 조회 실패')
    const categoryResult = await categoryRes.json()
    
    if (categoryResult.success && categoryResult.data) {
      const category = categoryResult.data.find((cat: any) => cat.slug === 'style')
      if (!category) return []
      
      // 2. 태그 조회
      const tagsRes = await fetch(`/api/hashtags/tags?categoryId=${category.id}&isActive=true`)
      if (!tagsRes.ok) throw new Error('태그 조회 실패')
      const tagsResult = await tagsRes.json()
      
      if (tagsResult.success && tagsResult.data) {
        return tagsResult.data.map((tag: any) => ({
          id: tag.id,
          label: tag.name_ko || tag.name_en || '',
          sublabel: tag.name_en || undefined,
        }))
      }
    }
    return []
  }

  useEffect(() => {
    if (topicPage && !isNew) {
      setFormData(topicPageToFormData(topicPage))
    }
  }, [topicPage, isNew])

  // 해시태그 자동 업데이트
  useEffect(() => {
    const autoHashtags = [
      ...formData.where_cities,
      ...formData.companions,
      ...formData.styles,
    ]
    
    // 배열 비교: 길이와 모든 요소가 같은지 확인
    const isSame = 
      formData.hashtags.length === autoHashtags.length &&
      formData.hashtags.every((tag, index) => tag === autoHashtags[index])
    
    if (!isSame) {
      setFormData((prev) => ({ ...prev, hashtags: autoHashtags }))
    }
  }, [formData.where_cities, formData.companions, formData.styles, formData.hashtags])

  // AI로 소개글 생성
  const handleGenerateIntro = async () => {
    if (!formData.title_ko.trim()) {
      alert('제목을 먼저 입력해주세요.')
      return
    }

    if (formData.intro_rich_ko.trim() && !confirm('기존 소개글을 AI로 덮어쓰시겠습니까?')) {
      return
    }

    setIsGeneratingIntro(true)

    try {
      const res = await fetch('/api/topic-pages/generate-intro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_ko: formData.title_ko.trim(),
          where_cities: formData.where_cities,
          companions: formData.companions,
          styles: formData.styles,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '소개글 생성 실패')
      }

      const result = await res.json()

      if (result.success && result.data?.intro_rich_ko) {
        setFormData({
          ...formData,
          intro_rich_ko: result.data.intro_rich_ko,
        })
        alert('AI로 소개글이 생성되었습니다.')
      } else {
        throw new Error('소개글 생성 결과가 없습니다.')
      }
    } catch (error) {
      console.error('소개글 생성 오류:', error)
      alert(`소개글 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setIsGeneratingIntro(false)
    }
  }

  // AI로 SEO 생성
  const handleGenerateSeo = async () => {
    if (!formData.title_ko.trim() || !formData.slug.trim()) {
      alert('제목과 Slug를 먼저 입력해주세요.')
      return
    }

    if (!confirm('AI로 SEO 설정을 자동 생성하시겠습니까?\n기존 SEO 내용이 덮어씌워집니다.')) {
      return
    }

    setIsGeneratingSeo(true)

    try {
      const res = await fetch('/api/topic-pages/generate-seo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title_ko: formData.title_ko.trim(),
          slug: formData.slug.trim(),
          where_countries: formData.where_countries ? formData.where_countries.split(',').map(s => s.trim()).filter(Boolean) : [],
          where_cities: formData.where_cities ? formData.where_cities.split(',').map(s => s.trim()).filter(Boolean) : [],
          companions: formData.companions ? formData.companions.split(',').map(s => s.trim()).filter(Boolean) : [],
          styles: formData.styles ? formData.styles.split(',').map(s => s.trim()).filter(Boolean) : [],
          intro_rich_ko: formData.intro_rich_ko.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || 'SEO 생성 실패')
      }

      const result = await res.json()

      if (result.success && result.data) {
        setFormData({
          ...formData,
          seo_title_ko: result.data.seo_title_ko,
          seo_description_ko: result.data.seo_description_ko,
          og_title: result.data.og_title,
          og_description: result.data.og_description,
          twitter_title: result.data.twitter_title,
          twitter_description: result.data.twitter_description,
          seo_schema_json: result.data.seo_schema_json ? JSON.stringify(result.data.seo_schema_json, null, 2) : '',
        })
        alert('AI로 SEO 설정이 생성되었습니다.')
      } else {
        throw new Error('SEO 생성 결과가 없습니다.')
      }
    } catch (error) {
      console.error('SEO 생성 오류:', error)
      alert(`SEO 생성 실패: ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
    } finally {
      setIsGeneratingSeo(false)
    }
  }

  // 저장 mutation
  const saveMutation = useMutation({
    mutationFn: async () => {
      // seo_hreflang, seo_schema_json 파싱
      let seoHreflang = null
      let seoSchemaJson = null
      try {
        if (formData.seo_hreflang.trim()) {
          seoHreflang = JSON.parse(formData.seo_hreflang)
        }
      } catch (e) {
        alert('seo_hreflang JSON 형식이 올바르지 않습니다.')
        throw new Error('Invalid seo_hreflang JSON')
      }
      try {
        if (formData.seo_schema_json.trim()) {
          seoSchemaJson = JSON.parse(formData.seo_schema_json)
        }
      } catch (e) {
        alert('seo_schema_json JSON 형식이 올바르지 않습니다.')
        throw new Error('Invalid seo_schema_json JSON')
      }

      const payload = {
        ...(isNew ? {} : { id: topicPage?.id }),
        slug: formData.slug.trim(),
        title_ko: formData.title_ko.trim(),
        where_countries: formData.where_countries ? formData.where_countries.split(',').map(s => s.trim()).filter(Boolean) : [],
        where_cities: formData.where_cities || [],
        companions: formData.companions || [],
        styles: formData.styles || [],
        hero_image_url: formData.hero_image_url.trim() || null,
        intro_rich_ko: formData.intro_rich_ko.trim() || null,
        hashtags: formData.hashtags || [],
        status: formData.status,
        publish: formData.publish,
        publish_at: formData.publish_at ? new Date(formData.publish_at).toISOString() : null,
        // SEO 필드
        seo_title_ko: formData.seo_title_ko.trim() || null,
        seo_description_ko: formData.seo_description_ko.trim() || null,
        seo_canonical_url: formData.seo_canonical_url.trim() || null,
        meta_robots: formData.meta_robots.trim() || 'index,follow',
        og_title: formData.og_title.trim() || null,
        og_description: formData.og_description.trim() || null,
        og_image_url: formData.og_image_url.trim() || null,
        twitter_title: formData.twitter_title.trim() || null,
        twitter_description: formData.twitter_description.trim() || null,
        twitter_image_url: formData.twitter_image_url.trim() || null,
        seo_hreflang: seoHreflang,
        seo_schema_json: seoSchemaJson,
        sitemap_priority: parseFloat(formData.sitemap_priority) || 0.6,
        sitemap_changefreq: formData.sitemap_changefreq.trim() || 'weekly',
      }

      const url = isNew ? '/api/topic-pages' : '/api/topic-pages'
      const method = isNew ? 'POST' : 'PATCH'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || '저장 실패')
      }

      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['topic-pages-list'] })
      queryClient.invalidateQueries({ queryKey: ['topic-page', topicPage?.id] })
      alert(isNew ? '토픽 페이지가 생성되었습니다.' : '토픽 페이지가 수정되었습니다.')
      if (isNew && data.data?.id) {
        router.push(`/admin/topic-pages/${data.data.id}`)
      }
    },
    onError: (error: Error) => {
      alert(`저장 실패: ${error.message}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.slug.trim() || !formData.title_ko.trim()) {
      alert('Slug와 제목은 필수입니다.')
      return
    }
    saveMutation.mutate()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border bg-white p-6 space-y-6">
        <h2 className="text-lg font-semibold text-gray-900">기본 정보</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Slug */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Slug <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="my-topic-page"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <p className="text-xs text-gray-500 mt-1">URL에 사용될 고유 식별자</p>
          </div>

          {/* 제목 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              제목 (한글) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title_ko}
              onChange={(e) => setFormData({ ...formData, title_ko: e.target.value })}
              placeholder="로맨틱한 유럽 호텔"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
        </div>

        {/* 국가 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            국가 (쉼표로 구분)
          </label>
          <input
            type="text"
            value={formData.where_countries}
            onChange={(e) => setFormData({ ...formData, where_countries: e.target.value })}
            placeholder="프랑스, 이탈리아, 스페인"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 도시 */}
        <MultiSelectField
          label="도시"
          value={formData.where_cities}
          onChange={(cities) => setFormData({ ...formData, where_cities: cities })}
          placeholder="도시를 선택하세요"
          modalTitle="도시 선택"
          fetchItems={fetchCities}
          emptyMessage="등록된 도시가 없습니다."
        />

        {/* 동행인 */}
        <MultiSelectField
          label="동행인"
          value={formData.companions}
          onChange={(companions) => setFormData({ ...formData, companions })}
          placeholder="동행인을 선택하세요"
          modalTitle="동행인 선택"
          fetchItems={fetchCompanionTags}
          emptyMessage="등록된 동행인 태그가 없습니다."
        />

        {/* 스타일 */}
        <MultiSelectField
          label="스타일"
          value={formData.styles}
          onChange={(styles) => setFormData({ ...formData, styles })}
          placeholder="스타일을 선택하세요"
          modalTitle="스타일 선택"
          fetchItems={fetchStyleTags}
          emptyMessage="등록된 스타일 태그가 없습니다."
        />

        {/* 히어로 이미지 URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            히어로 이미지 URL
          </label>
          <input
            type="url"
            value={formData.hero_image_url}
            onChange={(e) => setFormData({ ...formData, hero_image_url: e.target.value })}
            placeholder="https://..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 소개글 */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              소개글 (Rich Text)
            </label>
            <button
              type="button"
              onClick={handleGenerateIntro}
              disabled={isGeneratingIntro}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-green-600 to-teal-600 text-white text-xs hover:from-green-700 hover:to-teal-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md"
            >
              <Wand2 className="h-3.5 w-3.5" />
              {isGeneratingIntro ? 'AI 생성 중...' : 'AI로 작성'}
            </button>
          </div>
          <textarea
            value={formData.intro_rich_ko}
            onChange={(e) => setFormData({ ...formData, intro_rich_ko: e.target.value })}
            placeholder="토픽 페이지 소개글... (또는 AI로 자동 생성)"
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            도시, 동행인, 스타일 정보를 입력한 후 'AI로 작성' 버튼을 누르면 자동으로 소개글이 생성됩니다.
          </p>
        </div>

        {/* 해시태그 (자동 생성) */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            해시태그 (자동 생성)
          </label>
          <div className="px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg">
            {formData.hashtags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {formData.hashtags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-3 py-1 bg-white border border-gray-300 text-gray-700 rounded-full text-sm"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">
                도시, 동행인, 스타일을 선택하면 자동으로 해시태그가 생성됩니다.
              </p>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-1">
            위에서 입력한 도시와 태그들이 자동으로 해시태그로 표시됩니다.
          </p>
        </div>

        {/* 상태 & 배포 & 발행일 */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              상태
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">임시저장</option>
              <option value="published">발행됨</option>
              <option value="archived">보관됨</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              배포 여부
            </label>
            <div className="flex items-center h-10">
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.publish}
                  onChange={(e) => setFormData({ ...formData, publish: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                <span className="ms-3 text-sm font-medium text-gray-900">
                  {formData.publish ? '배포됨' : '미배포'}
                </span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              발행일
            </label>
            <input
              type="datetime-local"
              value={formData.publish_at}
              onChange={(e) => setFormData({ ...formData, publish_at: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
      </div>

      {/* SEO 섹션 */}
      <div className="rounded-lg border bg-white p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900">SEO 설정</h2>
          <button
            type="button"
            onClick={handleGenerateSeo}
            disabled={isGeneratingSeo}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
          >
            <Sparkles className="h-4 w-4" />
            {isGeneratingSeo ? 'AI 생성 중...' : 'AI로 자동 생성'}
          </button>
        </div>

        {/* SEO 제목 & 설명 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              SEO 제목 (한글)
            </label>
            <input
              type="text"
              value={formData.seo_title_ko}
              onChange={(e) => setFormData({ ...formData, seo_title_ko: e.target.value })}
              placeholder="검색 결과에 표시될 제목"
              maxLength={60}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">최대 60자 권장</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Canonical URL
            </label>
            <input
              type="url"
              value={formData.seo_canonical_url}
              onChange={(e) => setFormData({ ...formData, seo_canonical_url: e.target.value })}
              placeholder="https://..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            SEO 설명 (한글)
          </label>
          <textarea
            value={formData.seo_description_ko}
            onChange={(e) => setFormData({ ...formData, seo_description_ko: e.target.value })}
            placeholder="검색 결과에 표시될 설명"
            maxLength={160}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <p className="text-xs text-gray-500 mt-1">최대 160자 권장</p>
        </div>

        {/* Meta Robots */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Meta Robots
            </label>
            <select
              value={formData.meta_robots}
              onChange={(e) => setFormData({ ...formData, meta_robots: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="index,follow">index,follow</option>
              <option value="noindex,nofollow">noindex,nofollow</option>
              <option value="index,nofollow">index,nofollow</option>
              <option value="noindex,follow">noindex,follow</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sitemap Priority
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={formData.sitemap_priority}
              onChange={(e) => setFormData({ ...formData, sitemap_priority: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">0.0 ~ 1.0</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sitemap Changefreq
            </label>
            <select
              value={formData.sitemap_changefreq}
              onChange={(e) => setFormData({ ...formData, sitemap_changefreq: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="always">always</option>
              <option value="hourly">hourly</option>
              <option value="daily">daily</option>
              <option value="weekly">weekly</option>
              <option value="monthly">monthly</option>
              <option value="yearly">yearly</option>
              <option value="never">never</option>
            </select>
          </div>
        </div>

        {/* Open Graph */}
        <div className="pt-4 border-t">
          <h3 className="text-md font-medium text-gray-800 mb-4">Open Graph (SNS 공유)</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OG 제목
                </label>
                <input
                  type="text"
                  value={formData.og_title}
                  onChange={(e) => setFormData({ ...formData, og_title: e.target.value })}
                  placeholder="SNS 공유 시 표시될 제목"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  OG 이미지 URL
                </label>
                <input
                  type="url"
                  value={formData.og_image_url}
                  onChange={(e) => setFormData({ ...formData, og_image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                OG 설명
              </label>
              <textarea
                value={formData.og_description}
                onChange={(e) => setFormData({ ...formData, og_description: e.target.value })}
                placeholder="SNS 공유 시 표시될 설명"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Twitter Card */}
        <div className="pt-4 border-t">
          <h3 className="text-md font-medium text-gray-800 mb-4">Twitter Card</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twitter 제목
                </label>
                <input
                  type="text"
                  value={formData.twitter_title}
                  onChange={(e) => setFormData({ ...formData, twitter_title: e.target.value })}
                  placeholder="Twitter 공유 시 표시될 제목"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Twitter 이미지 URL
                </label>
                <input
                  type="url"
                  value={formData.twitter_image_url}
                  onChange={(e) => setFormData({ ...formData, twitter_image_url: e.target.value })}
                  placeholder="https://..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Twitter 설명
              </label>
              <textarea
                value={formData.twitter_description}
                onChange={(e) => setFormData({ ...formData, twitter_description: e.target.value })}
                placeholder="Twitter 공유 시 표시될 설명"
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Advanced SEO (JSON) */}
        <div className="pt-4 border-t">
          <h3 className="text-md font-medium text-gray-800 mb-4">고급 SEO 설정 (JSON)</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Hreflang (다국어 URL)
              </label>
              <textarea
                value={formData.seo_hreflang}
                onChange={(e) => setFormData({ ...formData, seo_hreflang: e.target.value })}
                placeholder='[{"lang": "ko", "url": "https://..."}, {"lang": "en", "url": "https://..."}]'
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">JSON 배열 형식</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Schema.org JSON-LD
              </label>
              <textarea
                value={formData.seo_schema_json}
                onChange={(e) => setFormData({ ...formData, seo_schema_json: e.target.value })}
                placeholder='{"@context": "https://schema.org", "@type": "Article", ...}'
                rows={5}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">JSON-LD 형식</p>
            </div>
          </div>
        </div>
      </div>

      {/* 저장 버튼 */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saveMutation.isPending}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="h-4 w-4" />
          {saveMutation.isPending ? '저장 중...' : isNew ? '생성하기' : '저장하기'}
        </button>
      </div>
    </form>
  )
}

