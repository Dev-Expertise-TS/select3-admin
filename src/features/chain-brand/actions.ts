'use server'

import { createServiceRoleClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type ChainFormData = {
  chain_id?: number
  name_kr?: string | null
  name_en?: string | null
  slug?: string | null
}

export type BrandFormData = {
  brand_id?: number
  name_kr?: string | null
  name_en?: string | null
  chain_id?: number | null
}

export type ActionResult<T = unknown> = {
  success: boolean
  data?: T
  error?: string
}

// Chain Actions
export async function saveChain(formData: FormData): Promise<ActionResult<ChainFormData>> {
  const supabase = createServiceRoleClient()

  const chainId = formData.get('chain_id') ? Number(formData.get('chain_id')) : undefined
  const chainData: Partial<ChainFormData> = {
    name_kr: formData.get('name_kr') as string || null,
    name_en: formData.get('name_en') as string || null,
    slug: formData.get('slug') as string || null,
  }

  let query;
  if (chainId) {
    query = supabase
      .from('hotel_chains')
      .update(chainData)
      .eq('chain_id', chainId)
  } else {
    query = supabase.from('hotel_chains').insert(chainData)
  }

  const { data, error } = await query.select().single()

  if (error) {
    console.error('Error saving chain:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/chain-brand')
  return { success: true, data: data as ChainFormData }
}

export async function createChain(formData: FormData): Promise<ActionResult<ChainFormData>> {
  const supabase = createServiceRoleClient()

  const chainData: Partial<ChainFormData> = {
    name_kr: formData.get('name_kr') as string || null,
    name_en: formData.get('name_en') as string || null,
    slug: formData.get('slug') as string || null,
  }

  const { data, error } = await supabase
    .from('hotel_chains')
    .insert(chainData)
    .select()
    .single()

  if (error) {
    console.error('Error creating chain:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/chain-brand')
  return { success: true, data: data as ChainFormData }
}

export async function deleteChain(chainId: number): Promise<ActionResult> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('hotel_chains')
    .delete()
    .eq('chain_id', chainId)

  if (error) {
    console.error('Error deleting chain:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/chain-brand')
  return { success: true }
}

// Brand Actions
export async function saveBrand(formData: FormData): Promise<ActionResult<BrandFormData>> {
  const supabase = createServiceRoleClient()

  const brandId = formData.get('brand_id') ? Number(formData.get('brand_id')) : undefined
  // Prefer canonical columns; fallback to legacy brand_name_* if DB schema differs
  const nameKr = (formData.get('name_kr') as string) ?? (formData.get('brand_name_kr') as string) ?? null
  const nameEn = (formData.get('name_en') as string) ?? (formData.get('brand_name_en') as string) ?? null
  const brandData: Record<string, unknown> = {
    name_kr: nameKr || null,
    name_en: nameEn || null,
    chain_id: formData.get('chain_id') ? Number(formData.get('chain_id')) : null,
  }

  let query;
  if (brandId) {
    query = supabase
      .from('hotel_brands')
      .update(brandData)
      .eq('brand_id', brandId)
  } else {
    query = supabase.from('hotel_brands').insert(brandData)
  }

  const { data: initialData, error } = await query.select().single()
  let data = initialData

  if (error) {
    // Retry once with legacy column names if column mismatch occurs
    const message = String(error.message || '')
    const needsLegacy = message.includes("'name_en'") || message.includes("'name_kr'")
    if (needsLegacy) {
      const legacyBrandData: Record<string, unknown> = {
        brand_name_kr: nameKr || null,
        brand_name_en: nameEn || null,
        chain_id: formData.get('chain_id') ? Number(formData.get('chain_id')) : null,
      }
      if (brandId) {
        const retryResult = await supabase
          .from('hotel_brands')
          .update(legacyBrandData)
          .eq('brand_id', brandId)
          .select()
          .single()
        if (retryResult.error) {
          console.error('Error saving brand (legacy retry failed):', retryResult.error)
          return { success: false, error: retryResult.error.message }
        }
        data = retryResult.data
      } else {
        const retryResult = await supabase
          .from('hotel_brands')
          .insert(legacyBrandData)
          .select()
          .single()
        if (retryResult.error) {
          console.error('Error saving brand (legacy retry failed):', retryResult.error)
          return { success: false, error: retryResult.error.message }
        }
        data = retryResult.data
      }
    } else {
      console.error('Error saving brand:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/admin/chain-brand')
  return { success: true, data: data as BrandFormData }
}

export async function createBrand(formData: FormData): Promise<ActionResult<BrandFormData>> {
  const supabase = createServiceRoleClient()

  const nameKr = (formData.get('name_kr') as string) ?? (formData.get('brand_name_kr') as string) ?? null
  const nameEn = (formData.get('name_en') as string) ?? (formData.get('brand_name_en') as string) ?? null
  const brandData: Record<string, unknown> = {
    name_kr: nameKr || null,
    name_en: nameEn || null,
    chain_id: formData.get('chain_id') ? Number(formData.get('chain_id')) : null,
  }

  const { data: initialData, error } = await supabase
    .from('hotel_brands')
    .insert(brandData)
    .select()
    .single()
  let data = initialData

  if (error) {
    const message = String(error.message || '')
    const needsLegacy = message.includes("'name_en'") || message.includes("'name_kr'")
    if (needsLegacy) {
      const legacyBrandData: Record<string, unknown> = {
        brand_name_kr: nameKr || null,
        brand_name_en: nameEn || null,
        chain_id: formData.get('chain_id') ? Number(formData.get('chain_id')) : null,
      }
      const retryResult = await supabase
        .from('hotel_brands')
        .insert(legacyBrandData)
        .select()
        .single()
      if (retryResult.error) {
        console.error('Error creating brand (legacy retry failed):', retryResult.error)
        return { success: false, error: retryResult.error.message }
      }
      data = retryResult.data
    } else {
      console.error('Error creating brand:', error)
      return { success: false, error: error.message }
    }
  }

  revalidatePath('/admin/chain-brand')
  return { success: true, data: data as BrandFormData }
}

export async function deleteBrand(brandId: number): Promise<ActionResult> {
  const supabase = createServiceRoleClient()

  const { error } = await supabase
    .from('hotel_brands')
    .delete()
    .eq('brand_id', brandId)

  if (error) {
    console.error('Error deleting brand:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/chain-brand')
  return { success: true }
}

