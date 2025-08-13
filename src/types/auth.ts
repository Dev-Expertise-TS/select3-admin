export interface User {
  id: string
  email: string
  role: 'admin' | 'user'
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  updated_at?: string
}

export interface AuthUser {
  id: string
  email: string
  role: 'admin' | 'user'
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  updated_at?: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface SignUpCredentials {
  email: string
  password: string
  role?: 'admin' | 'user'
}

export interface AuthResponse {
  success: boolean
  data?: AuthUser
  error?: string
  code?: string
}

export interface UserListResponse {
  success: boolean
  data?: User[]
  error?: string
  meta?: {
    count: number
  }
}

export interface UserUpdateRequest {
  id: string
  email?: string
  role?: 'admin' | 'user'
  password?: string
}

export interface UserDeleteRequest {
  id: string
}
