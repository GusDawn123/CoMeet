import { api } from './client'

export async function getStats() {
  const res = await api.get('/admin/stats')
  return res.data.stats
}

export async function getUsers() {
  const res = await api.get('/admin/users')
  return res.data.users
}

export async function getUser(id: string) {
  const res = await api.get(`/admin/users/${id}`)
  return res.data.user
}

export async function getLogs(limit = 50) {
  const res = await api.get(`/admin/logs?limit=${limit}`)
  return res.data
}

export async function deleteUser(id: string) {
  const res = await api.delete(`/admin/users/${id}`)
  return res.data
}
