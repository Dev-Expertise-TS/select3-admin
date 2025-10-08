import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET } from '@/lib/media-naming'

// 타임아웃 설정 (5분)
export const maxDuration = 300

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { dryRun = false } = body

    const supabase = createServiceRoleClient()

    // 1. Storage에서 모든 파일 목록 조회
    const allFiles: Array<{ name: string; path: string; size: number; metadata?: Record<string, unknown> }> = []
    
    console.log('[sync-storage-to-db] Storage 스캔 시작...')
    
    // 폴더 스캔 함수
    const scanFolder = async (prefix: string) => {
      const { data: folders, error: foldersError } = await supabase.storage
        .from(MEDIA_BUCKET)
        .list(prefix, { limit: 1000 })

      if (foldersError) {
        console.error(`[sync-storage-to-db] ${prefix} 폴더 조회 오류:`, foldersError)
        return
      }

      if (!folders || folders.length === 0) {
        console.log(`[sync-storage-to-db] ${prefix} 폴더가 비어있습니다.`)
        return
      }

      console.log(`[sync-storage-to-db] ${prefix} 폴더: ${folders.length}개 항목 발견`)

      // 배치로 처리 (10개씩)
      const SCAN_BATCH_SIZE = 10
      for (let i = 0; i < folders.length; i += SCAN_BATCH_SIZE) {
        const batch = folders.slice(i, i + SCAN_BATCH_SIZE)
        console.log(`[sync-storage-to-db] ${prefix} 스캔 진행: ${i + 1}-${Math.min(i + SCAN_BATCH_SIZE, folders.length)}/${folders.length}`)

        // 배치 내 폴더들을 병렬로 처리
        const batchPromises = batch.map(async (folder) => {
          if (!folder.name) return []

          const { data: files, error: filesError } = await supabase.storage
            .from(MEDIA_BUCKET)
            .list(`${prefix}/${folder.name}`, { limit: 1000 })

          if (filesError || !files) return []

          return files
            .filter(file => file.name && file.id && !file.name.startsWith('.'))
            .map(file => ({
              name: file.name,
              path: `${prefix}/${folder.name}/${file.name}`,
              size: (file.metadata as any)?.size || 0,
              metadata: file.metadata as Record<string, unknown>
            }))
        })

        const batchResults = await Promise.all(batchPromises)
        batchResults.forEach(files => allFiles.push(...files))
      }

      console.log(`[sync-storage-to-db] ${prefix} 스캔 완료: ${allFiles.length}개 파일`)
    }

    // public 폴더 스캔
    await scanFolder('public')

    // original 폴더 스캔
    await scanFolder('original')

    console.log(`[sync-storage-to-db] 전체 스캔 완료: 총 ${allFiles.length}개 파일 발견`)
    
    if (allFiles.length > 0) {
      console.log('[sync-storage-to-db] 샘플 파일:', allFiles.slice(0, 3))
    }

    // 2. 각 파일에서 sabre_id와 slug 추출
    const records = []
    const errors = []

    console.log(`[sync-storage-to-db] ${allFiles.length}개 파일 파싱 시작...`)

    for (const file of allFiles) {
      try {
        // 경로에서 slug 추출: public/park-hyatt-seoul/... 또는 original/park-hyatt-seoul/...
        const pathParts = file.path.split('/')
        const slug = pathParts[1] // public 또는 original 다음이 slug

        // 파일명에서 sabre_id 추출
        // 패턴 예시:
        // 1. {sabreId}-{timestamp}.{ext} → 602874-1234567890.jpg
        // 2. {slug}__{sabreId}__{seq}__original.{ext} → park-hyatt-seoul__602874__1__original.jpg
        // 3. {slug}_{sabreId}_{seq}_{width}w.{ext} → shangri-la-tokyo_48732_01_1600w.avif
        let sabreId = null
        let imageSeq: number | null = null
        
        // 패턴 1: {sabreId}-{timestamp}.{ext}
        const pattern1 = /^(\d+)-\d+\./
        const match1 = file.name.match(pattern1)
        if (match1) {
          sabreId = match1[1]
        }
        
        // 패턴 2: {slug}__{sabreId}__{seq}__original.{ext}
        const pattern2 = /__(\d+)__(\d+)__/
        const match2 = file.name.match(pattern2)
        if (match2 && !sabreId) {
          sabreId = match2[1]
          imageSeq = parseInt(match2[2], 10)
        }
        
        // 패턴 3: {slug}_{sabreId}_{seq}_{width}w.{ext}
        const pattern3 = /_(\d+)_(\d+)_\d+w\./
        const match3 = file.name.match(pattern3)
        if (match3 && !sabreId) {
          sabreId = match3[1]
          imageSeq = parseInt(match3[2], 10)
        }

        if (!sabreId) {
          console.warn(`[sync-storage-to-db] sabre_id 추출 실패: ${file.name}`)
          errors.push(`파일명에서 sabre_id 추출 실패: ${file.name}`)
          continue
        }

        // Public URL 생성
        const { data: publicUrlData } = supabase.storage
          .from(MEDIA_BUCKET)
          .getPublicUrl(file.path)

        // 파일 타입 추정
        const ext = file.name.split('.').pop()?.toLowerCase()
        let fileType = 'image/jpeg'
        if (ext === 'png') fileType = 'image/png'
        else if (ext === 'webp') fileType = 'image/webp'
        else if (ext === 'avif') fileType = 'image/avif'
        else if (ext === 'gif') fileType = 'image/gif'

        const record = {
          sabre_id: sabreId,
          file_name: file.name,
          file_path: file.path,
          storage_path: file.path,
          public_url: publicUrlData.publicUrl,
          file_type: fileType,
          file_size: file.size,
          slug: slug,
          image_seq: imageSeq,
          original_url: null,
        }

        records.push(record)
      } catch (error) {
        console.error(`[sync-storage-to-db] 파일 처리 오류 (${file.name}):`, error)
        errors.push(`파일 처리 오류 (${file.name}): ${error instanceof Error ? error.message : '알 수 없는 오류'}`)
      }
    }

    console.log(`[sync-storage-to-db] ${records.length}개 레코드 준비 완료`)
    console.log(`[sync-storage-to-db] ${errors.length}개 파싱 오류 발생`)
    
    if (records.length === 0) {
      return NextResponse.json({
        success: false,
        error: '처리 가능한 파일이 없습니다.',
        data: {
          totalFiles: allFiles.length,
          parseErrors: errors,
        }
      })
    }

    if (dryRun) {
      // Dry run: 실제 삽입하지 않고 결과만 반환
      console.log('[sync-storage-to-db] Dry run 완료')
      return NextResponse.json({
        success: true,
        dryRun: true,
        data: {
          totalFiles: allFiles.length,
          recordsToCreate: records.length,
          recordsProcessed: records.length,
          insertedCount: 0,
          skippedCount: 0,
          errorCount: errors.length,
          parseErrors: errors.length > 0 ? errors : undefined,
          sampleRecords: records.slice(0, 10),
        },
        message: `Dry run 완료: ${records.length}개 레코드 생성 예정`,
      })
    }

    // 3. 기존 레코드와 중복 확인 후 배치 Upsert
    let insertedCount = 0
    let updatedCount = 0
    let skippedCount = 0
    const insertErrors: Array<{ sabre_id: string; file_name: string; error: string }> = []

    console.log(`[sync-storage-to-db] ${records.length}개 레코드 Upsert 시작...`)

    // 배치 크기 설정 (한 번에 100개씩 처리)
    const BATCH_SIZE = 100
    const batches = []
    for (let i = 0; i < records.length; i += BATCH_SIZE) {
      batches.push(records.slice(i, i + BATCH_SIZE))
    }

    console.log(`[sync-storage-to-db] ${batches.length}개 배치로 나누어 처리`)

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
      const batch = batches[batchIndex]
      console.log(`[sync-storage-to-db] 배치 ${batchIndex + 1}/${batches.length} 처리 중... (${batch.length}개 레코드)`)

      // 배치 내 각 레코드 처리
      for (const record of batch) {
        // Upsert: 중복 시 업데이트, 없으면 삽입
        // sabre_id + file_path 조합이 unique key라고 가정
        const { data: existing } = await supabase
          .from('select_hotel_media')
          .select('id')
          .eq('sabre_id', record.sabre_id)
          .eq('file_path', record.file_path)
          .maybeSingle()

        if (existing) {
          // 기존 레코드가 있으면 업데이트
          const { error: updateError } = await supabase
            .from('select_hotel_media')
            .update({
              file_name: record.file_name,
              storage_path: record.storage_path,
              public_url: record.public_url,
              file_type: record.file_type,
              file_size: record.file_size,
              slug: record.slug,
              image_seq: record.image_seq,
              original_url: record.original_url,
            })
            .eq('id', existing.id)

          if (updateError) {
            console.error(`[sync-storage-to-db] 레코드 업데이트 오류 [sabre_id: ${record.sabre_id}] (${record.file_name}):`, updateError)
            insertErrors.push({
              sabre_id: record.sabre_id,
              file_name: record.file_name,
              error: `업데이트 실패: ${updateError.message}`
            })
          } else {
            updatedCount++
          }
        } else {
          // 새 레코드 삽입
          const { error: insertError } = await supabase
            .from('select_hotel_media')
            .insert(record)

          if (insertError) {
            console.error(`[sync-storage-to-db] 레코드 삽입 오류 [sabre_id: ${record.sabre_id}] (${record.file_name}):`, insertError)
            insertErrors.push({
              sabre_id: record.sabre_id,
              file_name: record.file_name,
              error: insertError.message
            })
          } else {
            insertedCount++
          }
        }
      }

      console.log(`[sync-storage-to-db] 배치 ${batchIndex + 1} 완료: 삽입 ${insertedCount}개, 업데이트 ${updatedCount}개, 오류 ${insertErrors.length}개`)
    }

    console.log(`[sync-storage-to-db] 전체 완료: 삽입 ${insertedCount}개, 업데이트 ${updatedCount}개, 오류: ${insertErrors.length}개`)

    return NextResponse.json({
      success: true,
      data: {
        totalFiles: allFiles.length,
        recordsProcessed: records.length,
        insertedCount,
        updatedCount,
        skippedCount,
        errorCount: insertErrors.length,
        errors: insertErrors.length > 0 ? insertErrors : undefined,
        parseErrors: errors.length > 0 ? errors : undefined,
      },
      message: `동기화 완료: ${insertedCount}개 생성, ${updatedCount}개 업데이트`,
    })
  } catch (e) {
    console.error('[sync-storage-to-db] exception:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error', details: String(e) },
      { status: 500 }
    )
  }
}

// GET: 현재 상태 확인
export async function GET(_req: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Storage 파일 수 확인
    let storageFileCount = 0
    
    const { data: publicFolders } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list('public', { limit: 1000 })

    if (publicFolders) {
      for (const folder of publicFolders) {
        if (folder.name && folder.id) {
          const { data: files } = await supabase.storage
            .from(MEDIA_BUCKET)
            .list(`public/${folder.name}`, { limit: 1000 })
          
          if (files) {
            storageFileCount += files.filter(f => f.name && !f.name.startsWith('.')).length
          }
        }
      }
    }

    const { data: originalFolders } = await supabase.storage
      .from(MEDIA_BUCKET)
      .list('original', { limit: 1000 })

    if (originalFolders) {
      for (const folder of originalFolders) {
        if (folder.name && folder.id) {
          const { data: files } = await supabase.storage
            .from(MEDIA_BUCKET)
            .list(`original/${folder.name}`, { limit: 1000 })
          
          if (files) {
            storageFileCount += files.filter(f => f.name && !f.name.startsWith('.')).length
          }
        }
      }
    }

    // DB 레코드 수 확인
    const { count: dbRecordCount, error: countError } = await supabase
      .from('select_hotel_media')
      .select('*', { count: 'exact', head: true })

    if (countError) {
      return NextResponse.json({
        success: false,
        error: `DB 레코드 수 조회 실패: ${countError.message}`,
      })
    }

    return NextResponse.json({
      success: true,
      data: {
        storageFileCount,
        dbRecordCount: dbRecordCount || 0,
        difference: storageFileCount - (dbRecordCount || 0),
        needsSync: storageFileCount > (dbRecordCount || 0),
      },
      message: `Storage: ${storageFileCount}개, DB: ${dbRecordCount || 0}개`,
    })
  } catch (e) {
    console.error('[sync-storage-to-db] GET exception:', e)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
