import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { MEDIA_BUCKET, DIR_PUBLIC, DIR_ORIGINALS, normalizeSlug } from '@/lib/media-naming'

/**
 * public 파일명에서 originals 파일명 추출
 * public: {slug}_{sabreId}_{seq}_{width}w.{ext}
 * originals: {slug}_{sabreId}_{seq}.{ext}
 */
function extractOriginalFilename(publicFileName: string): string | null {
  // _{width}w 패턴 제거 (예: _1600w.avif -> .avif)
  const withoutWidth = publicFileName.replace(/_\d+w(?=\.)/, '')
  // 확장자 추출하여 확인
  const extMatch = withoutWidth.match(/\.([^.]+)$/)
  if (!extMatch) return null
  
  // originals는 일반적으로 jpg 또는 원본 확장자를 사용
  // 여기서는 _{width}w 제거한 파일명을 그대로 사용
  return withoutWidth
}

/**
 * originals 경로 구성
 */
function buildOriginalsPath(publicPath: string, publicFileName: string, originalFileName: string): string[] {
  const pathParts = publicPath.split('/')
  const paths: string[] = []
  
  // 경로 형식: public/{slug}/{filename}
  if (pathParts[0] === DIR_PUBLIC && pathParts.length >= 2) {
    const slug = pathParts[1]
    // originals/{slug}/{filename} 형식
    paths.push(`${DIR_ORIGINALS}/${slug}/${originalFileName}`)
    
    // 호텔 정보에서 sabreId 가져와서 hotel-images/{sabre_id}/originals/{filename} 형식도 시도
    // 파일명에서 sabreId 추출 시도
    const sabreMatch = publicFileName.match(/_(\d+)_\d{2}/)
    if (sabreMatch) {
      const sabreId = sabreMatch[1]
      paths.push(`hotel-images/${sabreId}/${DIR_ORIGINALS}/${originalFileName}`)
    }
  }
  
  return paths
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null)
    if (!body || typeof body !== 'object') {
      return NextResponse.json({ success: false, error: '잘못된 요청 본문입니다.' }, { status: 400 })
    }

    const { fromPath, toFilename } = body as { fromPath?: string; toFilename?: string }
    if (!fromPath || !toFilename) {
      return NextResponse.json({ success: false, error: 'fromPath, toFilename은 필수입니다.' }, { status: 400 })
    }

    // 같은 디렉토리 내에서만 이름 변경 허용
    const idx = fromPath.lastIndexOf('/')
    if (idx === -1) {
      return NextResponse.json({ success: false, error: '경로 형식이 잘못되었습니다.' }, { status: 400 })
    }

    const dir = fromPath.slice(0, idx) // e.g., public/slug
    const oldName = fromPath.slice(idx + 1)
    const pathParts = dir.split('/') // [public, slug]
    if (pathParts.length !== 2 || (pathParts[0] !== DIR_PUBLIC)) {
      // 파일명 변경은 public 폴더에서만 허용
      return NextResponse.json({ success: false, error: 'public 폴더에서만 파일명 변경이 가능합니다.' }, { status: 400 })
    }
    const slug = pathParts[1]

    // 확장자 동일성 체크 (콘텐츠 타입 문제 방지)
    const oldExt = oldName.split('.').pop()?.toLowerCase()
    const newExt = toFilename.split('.').pop()?.toLowerCase()
    if (!oldExt || !newExt || oldExt !== newExt) {
      return NextResponse.json({ success: false, error: '확장자가 동일해야 합니다.' }, { status: 400 })
    }

    // 간단한 파일명 가드 (디렉토리 침범 방지)
    if (toFilename.includes('/') || toFilename.includes('..')) {
      return NextResponse.json({ success: false, error: '파일명에 유효하지 않은 문자가 포함되어 있습니다.' }, { status: 400 })
    }

    const toPath = `${dir}/${toFilename}`

    // 파일명 규칙 검증 및 sabre/seq 추출
    // public: slug_sabre_seq_widthw.ext
    const rxPubStem = new RegExp(`^${slug}_(\\d+)_([0-9]{2})(?:_\\d+w)?\\.${oldExt}$`)
    const oldMatch = oldName.match(rxPubStem)
    if (!oldMatch) {
      return NextResponse.json({ success: false, error: '현재 파일명이 규격(slug_sabre_seq[_widthw].ext)과 일치하지 않습니다.' }, { status: 400 })
    }
    const sabreOld = oldMatch[1]
    const seqOld = oldMatch[2]

    // 새 파일명 검증 (public 형식: slug_sabre_seq_widthw.ext)
    const newMatch = toFilename.match(new RegExp(`^${slug}_(\\d+)_([0-9]{2})(?:_\\d+w)?\\.${newExt}$`))
    if (!newMatch) {
      return NextResponse.json({ success: false, error: `새 파일명은 ${slug}_sabre_seq[_widthw].ext 형식이어야 합니다.` }, { status: 400 })
    }
    const sabreNew = newMatch[1]
    const seqNew = newMatch[2]
    if (sabreOld !== sabreNew) {
      return NextResponse.json({ success: false, error: 'sabre_id는 변경할 수 없습니다.' }, { status: 400 })
    }

    const supabase = createServiceRoleClient()

    // 호텔 정보 조회 (sabreId 확인)
    const { data: hotel } = await supabase
      .from("select_hotels")
      .select("sabre_id, slug")
      .eq("sabre_id", sabreOld)
      .single()

    if (!hotel) {
      return NextResponse.json({ success: false, error: '호텔 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    // originals 파일명 추출 (public 파일명에서 _{width}w 제거)
    const oldOriginalFileName = extractOriginalFilename(oldName)
    const newOriginalFileName = extractOriginalFilename(toFilename)
    
    if (!oldOriginalFileName || !newOriginalFileName) {
      return NextResponse.json({ success: false, error: '파일명 형식이 올바르지 않습니다.' }, { status: 400 })
    }

    // originals 경로 구성
    const oldOriginalsPaths = buildOriginalsPath(fromPath, oldName, oldOriginalFileName)
    const newOriginalsPaths = buildOriginalsPath(toPath, toFilename, newOriginalFileName)

    // 중복 사전 검사: 동일 디렉터리에 toFilename 존재 여부 확인 (현재 파일 제외)
    // 파일명이 실제로 변경되는 경우만 중복 확인
    if (oldName !== toFilename) {
      const { data: existingList, error: listErr } = await supabase.storage
        .from(MEDIA_BUCKET)
        .list(dir, { limit: 1000 })
      
      if (!listErr && existingList) {
        // 디버깅: 현재 디렉터리의 파일 목록 확인
        console.log(`[파일명 변경] 디렉터리 ${dir}의 파일 목록:`, existingList.map(f => f.name))
        console.log(`[파일명 변경] 현재 파일: ${oldName}, 변경할 파일명: ${toFilename}`)
        
        // 정확히 같은 파일명이 있는지 확인 (현재 파일 제외)
        const duplicateFile = existingList.find((f) => {
          // 정확히 같은 파일명이면서, 현재 파일이 아닌 경우만 중복으로 판단
          return f.name === toFilename && f.name !== oldName
        })
        
        if (duplicateFile) {
          console.log(`[파일명 변경] 중복 발견: ${toFilename} (현재 파일: ${oldName}, 중복 파일: ${duplicateFile.name})`)
          
          // 추가 확인: 같은 seq 번호를 가진 파일인지 확인
          // 같은 seq를 가진 파일이지만 widthw 형식이 다른 경우는 허용
          const oldSeqMatch = oldName.match(new RegExp(`^${slug}_${sabreOld}_(\\d{2})`))
          const newSeqMatch = toFilename.match(new RegExp(`^${slug}_${sabreNew}_(\\d{2})`))
          const dupSeqMatch = duplicateFile.name.match(new RegExp(`^${slug}_${sabreNew}_(\\d{2})`))
          
          // seq 번호가 같고, widthw 형식만 다른 경우는 허용하지 않음 (정확히 같은 파일명이면 중복)
          if (oldSeqMatch && newSeqMatch && dupSeqMatch && 
              newSeqMatch[1] === dupSeqMatch[1] && 
              newSeqMatch[1] !== oldSeqMatch[1]) {
            // seq가 변경되는 경우이고, 새 seq로 이미 파일이 존재하면 중복
            console.log(`[파일명 변경] 같은 seq 번호의 파일이 이미 존재: seq=${newSeqMatch[1]}`)
            return NextResponse.json({ 
              success: false, 
              error: `동일한 파일명이 이미 존재합니다: ${toFilename}`, 
              code: 'DUPLICATE' 
            }, { status: 409 })
          } else if (duplicateFile.name === toFilename) {
            // 정확히 같은 파일명이면 중복
            return NextResponse.json({ 
              success: false, 
              error: `동일한 파일명이 이미 존재합니다: ${toFilename}`, 
              code: 'DUPLICATE' 
            }, { status: 409 })
          }
        } else {
          console.log(`[파일명 변경] 중복 없음 - 파일명 변경 가능: ${oldName} -> ${toFilename}`)
        }
      } else if (listErr) {
        console.warn(`[파일명 변경] 디렉터리 목록 조회 오류:`, listErr)
      }
    } else {
      console.log(`[파일명 변경] 파일명이 동일하므로 중복 확인 건너뜀: ${oldName}`)
    }

    // originals 폴더에서도 중복 확인 (현재 파일 제외)
    // originals 파일명이 실제로 변경되는 경우만 중복 확인
    if (oldOriginalFileName !== newOriginalFileName) {
      console.log(`[파일명 변경] Originals 파일명 변경: ${oldOriginalFileName} -> ${newOriginalFileName}`)
      console.log(`[파일명 변경] Originals 경로:`, { old: oldOriginalsPaths, new: newOriginalsPaths })
      
      for (let i = 0; i < newOriginalsPaths.length; i++) {
        const newOriginalsPath = newOriginalsPaths[i]
        const oldOriginalsPath = oldOriginalsPaths[i] || oldOriginalsPaths[0]
        
        const originalsDir = newOriginalsPath.substring(0, newOriginalsPath.lastIndexOf('/'))
        const originalsFileName = newOriginalsPath.substring(newOriginalsPath.lastIndexOf('/') + 1)
        const oldOriginalsFileName = oldOriginalsPath.substring(oldOriginalsPath.lastIndexOf('/') + 1)
        
        console.log(`[파일명 변경] Originals 디렉터리 확인: ${originalsDir}`)
        console.log(`[파일명 변경] Originals 파일명: 현재=${oldOriginalsFileName}, 변경할=${originalsFileName}`)
        
        const { data: originalsList, error: originalsListErr } = await supabase.storage
          .from(MEDIA_BUCKET)
          .list(originalsDir, { limit: 1000 })
        
        if (originalsListErr) {
          console.warn(`[파일명 변경] Originals 디렉터리 목록 조회 오류 (${originalsDir}):`, originalsListErr)
          // 디렉터리가 없을 수 있으므로 경고만 출력하고 계속 진행
          continue
        }
        
        if (originalsList) {
          console.log(`[파일명 변경] Originals 디렉터리 ${originalsDir}의 파일 목록:`, originalsList.map(f => f.name))
          
          // 실제로 originals 파일이 존재하는지 확인 (현재 파일 경로)
          const currentOriginalsFileExists = originalsList.some((f) => f.name === oldOriginalsFileName)
          
          console.log(`[파일명 변경] Originals 현재 파일 존재 여부: ${oldOriginalsFileName} = ${currentOriginalsFileExists}`)
          
          // 현재 파일이 아닌 경우만 중복 확인
          // 단, 현재 originals 파일이 존재하고 변경하려는 파일명과 같은 경우는 허용
          // (현재 파일의 이름을 변경하는 것이므로)
          const duplicateOriginalsFile = originalsList.find((f) => {
            // 정확히 같은 파일명이면서, 현재 파일이 아닌 경우만 중복
            const isDuplicate = f.name === originalsFileName && f.name !== oldOriginalsFileName
            
            // 하지만 현재 originals 파일이 존재하고, 이것이 실제로 변경하려는 파일이라면 허용
            // 예: originals에 `_06.jpg`가 있고, 이를 `_01.jpg`로 변경하려는데,
            // originals에 이미 `_01.jpg`가 있다면 중복
            // 하지만 originals에 `_06.jpg`가 없고 다른 public 파일의 `_01.jpg`만 있다면 허용하지 않음
            if (isDuplicate && currentOriginalsFileExists) {
              // 현재 파일이 존재하는데, 변경하려는 이름이 이미 존재하면 중복
              console.log(`[파일명 변경] Originals 현재 파일(${oldOriginalsFileName})이 존재하고, 변경하려는 이름(${originalsFileName})도 이미 존재함`)
              return true
            }
            
            return isDuplicate
          })
          
          if (duplicateOriginalsFile) {
            console.log(`[파일명 변경] Originals 중복 발견: ${originalsFileName} (현재 파일: ${oldOriginalsFileName}, 중복 파일: ${duplicateOriginalsFile.name})`)
            
            // 추가 확인: 같은 seq 번호를 가진 다른 public 파일의 originals인지 확인
            // 같은 seq를 가진 다른 파일의 originals라면 실제로 다른 파일임 (중복으로 차단해야 함)
            const newSeqMatch = originalsFileName.match(new RegExp(`^${slug}_${sabreNew}_(\\d{2})`))
            const dupSeqMatch = duplicateOriginalsFile.name.match(new RegExp(`^${slug}_${sabreNew}_(\\d{2})`))
            
            // Public 폴더에서 해당 seq를 가진 파일이 존재하는지 확인
            const seqToCheck = newSeqMatch ? newSeqMatch[1] : null
            let publicFileExists = false
            
            if (seqToCheck) {
              const { data: publicFiles } = await supabase.storage
                .from(MEDIA_BUCKET)
                .list(dir, { limit: 1000 })
              
              // 해당 seq를 가진 public 파일이 존재하는지 확인 (정확한 파일명이 아닌 seq 패턴으로)
              const seqPattern = new RegExp(`^${slug}_${sabreNew}_${seqToCheck}(?:_\\d+w)?\\.`)
              publicFileExists = publicFiles?.some(f => seqPattern.test(f.name)) || false
              
              console.log(`[파일명 변경] Public 폴더에서 seq ${seqToCheck}를 가진 파일 존재 여부: ${publicFileExists}`)
            }
            
            if (newSeqMatch && dupSeqMatch && newSeqMatch[1] === dupSeqMatch[1]) {
              // 같은 seq 번호를 가진 파일
              if (publicFileExists) {
                // Public 폴더에 해당 seq를 가진 파일이 존재하면, originals도 실제로 사용 중인 파일임 (중복)
                console.log(`[파일명 변경] 같은 seq(${newSeqMatch[1]})를 가진 다른 public 파일이 존재함 - 중복으로 판단`)
                return NextResponse.json({ 
                  success: false, 
                  error: `Originals 폴더에 동일한 파일명이 이미 존재합니다: ${originalsFileName}\n다른 이미지(seq ${newSeqMatch[1]})의 originals 파일과 이름이 충돌합니다.`, 
                  code: 'DUPLICATE' 
                }, { status: 409 })
              } else {
                // Public 폴더에 해당 seq를 가진 파일이 없으면, orphan된 originals 파일임 (무시하고 진행)
                console.log(`[파일명 변경] 같은 seq(${newSeqMatch[1]})를 가진 public 파일이 없음 - orphan된 originals 파일로 판단하고 계속 진행`)
              }
            } else if (!publicFileExists) {
              // Public 폴더에 해당 seq를 가진 파일이 없으면, orphan된 originals 파일일 수 있음
              console.log(`[파일명 변경] Public 폴더에 seq ${seqToCheck}를 가진 파일이 없음 - orphan된 originals 파일로 판단하고 계속 진행`)
            } else {
              // 같은 파일명이지만 다른 seq를 가진 경우 또는 public 파일이 존재하는 경우
              console.log(`[파일명 변경] 다른 파일과 이름 충돌: ${originalsFileName}`)
              return NextResponse.json({ 
                success: false, 
                error: `Originals 폴더에 동일한 파일명이 이미 존재합니다: ${originalsFileName}`, 
                code: 'DUPLICATE' 
              }, { status: 409 })
            }
          } else {
            console.log(`[파일명 변경] Originals 중복 없음 - 파일명 변경 가능: ${oldOriginalsFileName} -> ${originalsFileName}`)
          }
        }
      }
    } else {
      console.log(`[파일명 변경] Originals 파일명이 동일하므로 중복 확인 건너뜀: ${oldOriginalFileName}`)
    }

    const moveOrCopyFile = async (src: string, dst: string) => {
      const mv = await supabase.storage.from(MEDIA_BUCKET).move(src, dst)
      if (!mv.error) return
      // move 실패 시 복사 후 원본 삭제
      const dl = await supabase.storage.from(MEDIA_BUCKET).download(src)
      if (dl.error || !dl.data) throw new Error(`download failed: ${src}`)
      const up = await supabase.storage.from(MEDIA_BUCKET).upload(dst, dl.data, { upsert: false })
      if (up.error) throw new Error(`upload failed: ${dst}`)
      const rm = await supabase.storage.from(MEDIA_BUCKET).remove([src])
      if (rm.error) throw new Error(`remove failed: ${src}`)
    }

    // 1. Public 파일 이름 변경
    console.log(`[파일명 변경] Public: ${fromPath} -> ${toPath}`)
    await moveOrCopyFile(fromPath, toPath)

    // 2. Originals 파일 이름 변경 (여러 경로 시도)
    let originalsRenamed = false
    for (let i = 0; i < oldOriginalsPaths.length; i++) {
      const oldOriginalsPath = oldOriginalsPaths[i]
      const newOriginalsPath = newOriginalsPaths[i] || newOriginalsPaths[0]
      
      try {
        const { error } = await supabase.storage.from(MEDIA_BUCKET).move(oldOriginalsPath, newOriginalsPath)
        if (!error) {
          console.log(`[파일명 변경] Originals: ${oldOriginalsPath} -> ${newOriginalsPath}`)
          originalsRenamed = true
          break
        } else {
          // 404 에러는 파일이 없음을 의미하므로 무시
          const errorMessage = error.message || ''
          if (!errorMessage.includes('404') && !errorMessage.includes('not found')) {
            console.warn(`[파일명 변경] Originals 경로 시도 실패 (${oldOriginalsPath}):`, errorMessage)
          }
        }
      } catch (err) {
        console.warn(`[파일명 변경] Originals 경로 시도 실패 (${oldOriginalsPath}):`, err)
      }
    }

    if (!originalsRenamed) {
      console.log(`[파일명 변경] Originals 파일을 찾을 수 없음: ${oldOriginalsPaths.join(', ')}`)
    }

    // 3. select_hotel_media 테이블 업데이트
    // 기존 레코드 찾기 (sabre_id와 파일명으로 찾기)
    const oldFileName = oldName
    const newFileName = toFilename
    
    // sabre_id와 원본 파일명으로 레코드 찾기
    const { data: existingRecords } = await supabase
      .from('select_hotel_media')
      .select('*')
      .eq('sabre_id', sabreOld)
      .eq('file_name', oldFileName)

    // file_path나 storage_path로도 찾기 (파일명이 다른 경우 대비)
    const pathsToCheck = [fromPath, ...oldOriginalsPaths]
    const additionalRecords: any[] = []
    
    for (const path of pathsToCheck) {
      const { data: records } = await supabase
        .from('select_hotel_media')
        .select('*')
        .eq('sabre_id', sabreOld)
        .or(`file_path.eq.${path},storage_path.eq.${path}`)
      
      if (records && records.length > 0) {
        additionalRecords.push(...records)
      }
    }

    // 중복 제거 (id 기준)
    const allRecords = [...(existingRecords || []), ...additionalRecords]
    const uniqueRecords = Array.from(
      new Map(allRecords.map(record => [record.id, record])).values()
    )

    let dbUpdatedCount = 0
    if (uniqueRecords.length > 0) {
      // 각 레코드 업데이트
      for (const record of uniqueRecords) {
        const oldRecordPath = record.file_path || record.storage_path
        let newRecordPath: string | null = null
        let finalFileName = newFileName
        
        // 경로가 public이면 새 public 경로로
        if (oldRecordPath === fromPath || oldRecordPath === toPath || oldRecordPath.startsWith(`${DIR_PUBLIC}/${slug}/`)) {
          newRecordPath = toPath
          finalFileName = toFilename
        }
        // 경로가 originals이면 새 originals 경로로
        else if (oldRecordPath.startsWith(`${DIR_ORIGINALS}/${slug}/`) || oldRecordPath.includes(`/${DIR_ORIGINALS}/`)) {
          // originals 경로 찾기
          for (let i = 0; i < oldOriginalsPaths.length; i++) {
            if (oldRecordPath === oldOriginalsPaths[i] || oldRecordPath.includes(oldOriginalsPaths[i].substring(oldOriginalsPaths[i].lastIndexOf('/')))) {
              newRecordPath = newOriginalsPaths[i] || newOriginalsPaths[0]
              finalFileName = newOriginalFileName
              break
            }
          }
          // 매칭되지 않으면 기본 originals 경로 사용
          if (!newRecordPath && newOriginalsPaths.length > 0) {
            newRecordPath = newOriginalsPaths[0]
            finalFileName = newOriginalFileName
          }
        }

        if (!newRecordPath) {
          console.warn(`[파일명 변경] 레코드 경로를 찾을 수 없음 (ID: ${record.id}, 경로: ${oldRecordPath})`)
          continue
        }

        // Public URL 업데이트
        const { data: urlData } = supabase.storage
          .from(MEDIA_BUCKET)
          .getPublicUrl(newRecordPath)

        // 레코드 업데이트
        const { error: updateError } = await supabase
          .from('select_hotel_media')
          .update({
            file_name: finalFileName,
            file_path: newRecordPath,
            storage_path: newRecordPath,
            public_url: urlData.publicUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', record.id)

        if (updateError) {
          console.error(`[파일명 변경] DB 레코드 업데이트 오류 (ID: ${record.id}):`, updateError)
        } else {
          console.log(`[파일명 변경] DB 레코드 업데이트 완료: ${oldRecordPath} -> ${newRecordPath}`)
          dbUpdatedCount++
        }
      }
    } else {
      console.log(`[파일명 변경] DB 레코드를 찾을 수 없음 (sabre_id: ${sabreOld}, 파일명: ${oldFileName})`)
    }

    return NextResponse.json({ 
      success: true, 
      data: { 
        fromPath, 
        toPath,
        originalsRenamed,
        dbUpdated: dbUpdatedCount
      } 
    })
  } catch (error) {
    console.error('[hotel-images/rename] error', error)
    return NextResponse.json({ success: false, error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}


