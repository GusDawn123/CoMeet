export interface User {
  id: string
  email: string
  name: string
  isAdmin: boolean
  createdAt: string
  updatedAt: string
}

export interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  lastUsedAt: string | null
  expiresAt: string | null
  createdAt: string
  revokedAt: string | null
}

export interface JwtPayload {
  userId: string
  email: string
  type: 'access' | 'refresh'
}

export interface AuthTokens {
  accessToken: string
  refreshToken: string
}

export interface RegisterRequest {
  email: string
  name: string
  password: string
}

export interface LoginRequest {
  email: string
  password: string
}

export interface AuthResponse {
  user: User
  tokens: AuthTokens
}
