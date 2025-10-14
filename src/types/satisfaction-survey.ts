export interface SatisfactionSurvey {
  id?: number
  submitted_at: string | null
  booking_number: string | null
  sabre_id: number | null
  property_name_kr: string | null
  property_name_en: string | null
  review_text: string | null
  satisfaction: boolean | null
  early_check_in: boolean | null
  late_check_out: boolean | null
  room_upgrade: boolean | null
  pick: boolean | null
  created_at?: string
  updated_at?: string
}

export interface SatisfactionSurveyFormInput {
  id?: number
  submitted_at?: string | null
  booking_number?: string | null
  sabre_id?: number | null
  property_name_kr?: string | null
  property_name_en?: string | null
  review_text?: string | null
  satisfaction?: boolean | null
  early_check_in?: boolean | null
  late_check_out?: boolean | null
  room_upgrade?: boolean | null
  pick?: boolean | null
}

