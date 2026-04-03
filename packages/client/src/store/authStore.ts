import { create } from 'zustand'
import type { User } from '@comeet/shared'

interface AuthState {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  setUser: (user: User) => void
  setTokens: (accessToken: string, refreshToken: string) => void
  login: (user: User, accessToken: string, refreshToken: string) => void
  logout: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  accessToken: null,
  isAuthenticated: false,

  setUser: (user) => set({ user }),

  setTokens: (accessToken) => set({ accessToken }),

  login: (user, accessToken) =>
    set({ user, accessToken, isAuthenticated: true }),

  logout: () =>
    set({ user: null, accessToken: null, isAuthenticated: false })
}))
