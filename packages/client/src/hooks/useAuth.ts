import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import * as authApi from '../api/auth'

export function useAuth() {
  const { user, isAuthenticated, login: setLogin, logout: setLogout } = useAuthStore()
  const navigate = useNavigate()

  const register = useCallback(async (email: string, name: string, password: string) => {
    const data = await authApi.register({ email, name, password })
    setLogin(data.user, data.tokens.accessToken, data.tokens.refreshToken)
    navigate('/dashboard')
  }, [setLogin, navigate])

  const login = useCallback(async (email: string, password: string) => {
    const data = await authApi.login({ email, password })
    setLogin(data.user, data.tokens.accessToken, data.tokens.refreshToken)
    navigate('/dashboard')
  }, [setLogin, navigate])

  const logout = useCallback(() => {
    setLogout()
    navigate('/login')
  }, [setLogout, navigate])

  return { user, isAuthenticated, register, login, logout }
}
