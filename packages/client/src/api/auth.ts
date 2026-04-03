import { api } from './client'
import type { AuthResponse, RegisterRequest, LoginRequest } from '@comeet/shared'

export async function register(data: RegisterRequest): Promise<AuthResponse> {
  const res = await api.post('/auth/register', data)
  return res.data
}

export async function login(data: LoginRequest): Promise<AuthResponse> {
  const res = await api.post('/auth/login', data)
  return res.data
}

export async function refreshTokens(): Promise<{ accessToken: string; refreshToken: string }> {
  const res = await api.post('/auth/refresh')
  return res.data.tokens
}

export async function getMe(): Promise<{ user: any }> {
  const res = await api.get('/auth/me')
  return res.data
}
