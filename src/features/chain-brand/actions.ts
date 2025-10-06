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
  const brandData: Partial<BrandFormData> = {
    name_kr: formData.get('name_kr') as string || null,
    name_en: formData.get('name_en') as string || null,
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

  const { data, error } = await query.select().single()

  if (error) {
    console.error('Error saving brand:', error)
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/chain-brand')
  return { success: true, data: data as BrandFormData }
}

export async function createBrand(formData: FormData): Promise<ActionResult<BrandFormData>> {
  const supabase = createServiceRoleClient()

  const brandData: Partial<BrandFormData> = {
    name_kr: formData.get('name_kr') as string || null,
    name_en: formData.get('name_en') as string || null,
    chain_id: formData.get('chain_id') ? Number(formData.get('chain_id')) : null,
  }

  const { data, error } = await supabase
    .from('hotel_brands')
    .insert(brandData)
    .select()
    .single()

  if (error) {
    console.error('Error creating brand:', error)
    return { success: false, error: error.message }
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

