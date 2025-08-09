import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function createBasicBenefit(formData: FormData) {
  'use server'
  const supabase = createServiceRoleClient()
  const entries: [string, any][] = []
  for (const [key, value] of formData.entries()) {
    if (['pkField', 'pkValue', 'field', 'value'].includes(key)) continue
    if (typeof value === 'string') {
      const v = value.trim()
      if (v.length === 0) continue
      entries.push([key, v])
    }
  }
  if (entries.length === 0) return
  const insertData = Object.fromEntries(entries)
  await supabase.from('select_basic_benefits').insert(insertData)
  revalidatePath('/admin/basic-benefits')
}

export async function updateBasicBenefitCell(formData: FormData) {
  'use server'
  const pkField = (formData.get('pkField') as string)!
  const pkValue = (formData.get('pkValue') as string)!
  const field = (formData.get('field') as string)!
  const value = (formData.get('value') as string) ?? ''
  const supabase = createServiceRoleClient()
  await supabase.from('select_basic_benefits').update({ [field]: value === '' ? null : value }).eq(pkField, pkValue)
  revalidatePath('/admin/basic-benefits')
}

export async function updateBasicBenefitRow(formData: FormData) {
  'use server'
  const supabase = createServiceRoleClient()
  const pkField = (formData.get('pkField') as string)!
  const pkValue = (formData.get('pkValue') as string)!
  const updates: Record<string, any> = {}
  for (const [key, value] of formData.entries()) {
    if (key === 'pkField' || key === 'pkValue') continue
    if (typeof value === 'string') {
      updates[key] = value === '' ? null : value
    }
  }
  if (Object.keys(updates).length === 0) return
  await supabase.from('select_basic_benefits').update(updates).eq(pkField, pkValue)
  revalidatePath('/admin/basic-benefits')
}

export async function deleteBasicBenefit(formData: FormData) {
  'use server'
  const pkField = (formData.get('pkField') as string)!
  const pkValue = (formData.get('pkValue') as string)!
  const supabase = createServiceRoleClient()
  await supabase.from('select_basic_benefits').delete().eq(pkField, pkValue)
  revalidatePath('/admin/basic-benefits')
}

