export interface User {
  id: string
  email: string
  role: 'admin' | 'user'
  created_at: string
  last_sign_in_at?: string
  email_confirmed_at?: string
  updated_at?: string
}

// AuthUser는 User와 동일하므로 별도 타입 제거하고 User 사용

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
  data?: User
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
