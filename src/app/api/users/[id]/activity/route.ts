import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

interface ActivityItem {
  id: string
  user_id: string
  action: string
  metadata: unknown | null
  created_at: string
}

type ActivityResponse =
  | {
      success: true
      data: ActivityItem[]
      meta?: { count?: number }
    }
  | {
      success: false
      error: string
      code?: string
      details?: unknown
    }

export async function GET(_req: Request, context: unknown) {
  const { params } = (context as { params?: { id?: string } }) ?? {}
  const userId = typeof params?.id === 'string' ? params.id : ''
  if (!userId || typeof userId !== 'string') {
    return NextResponse.json<ActivityResponse>(
      { success: false, error: 'Invalid user id' },
      { status: 400 }
    )
  }

  const supabase = createServiceRoleClient()

  try {
    const { data, error } = await supabase
      .from('user_activity_logs')
      .select('id, user_id, action, metadata, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      // 테이블 미존재(42P01) 또는 권한 관련 오류도 사용자에게는 빈 배열로 응답
      const code = (error as { code?: string }).code || ''
      const message = (error as { message?: string }).message || 'Failed to load activity logs'
      if (code === '42P01') {
        return NextResponse.json<ActivityResponse>({ success: true, data: [], meta: { count: 0 } }, { status: 200 })
      }
      return NextResponse.json<ActivityResponse>(
        { success: false, error: '활동 이력을 불러오지 못했습니다.', code, details: message },
        { status: 500 }
      )
    }

    const safeData: ActivityItem[] = Array.isArray(data)
      ? data.map((row) => ({
          id: String((row as { id?: unknown }).id ?? ''),
          user_id: String((row as { user_id?: unknown }).user_id ?? ''),
          action: String((row as { action?: unknown }).action ?? ''),
          metadata: (row as { metadata?: unknown }).metadata ?? null,
          created_at: String((row as { created_at?: unknown }).created_at ?? ''),
        }))
      : []

    return NextResponse.json<ActivityResponse>({ success: true, data: safeData, meta: { count: safeData.length } })
  } catch (error) {
    return NextResponse.json<ActivityResponse>(
      { success: false, error: '서버 오류가 발생했습니다.', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    )
  }
}


