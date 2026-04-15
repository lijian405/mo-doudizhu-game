/**
 * 后台管理 API（需先登录，token 存 sessionStorage.adminToken）
 */

function getToken(): string | null {
  return sessionStorage.getItem('adminToken')
}

export function setAdminToken(token: string | null) {
  if (token) sessionStorage.setItem('adminToken', token)
  else sessionStorage.removeItem('adminToken')
}

async function adminFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  const token = getToken()
  if (token) headers.set('Authorization', `Bearer ${token}`)
  const res = await fetch(`/api/admin${path}`, { ...options, headers })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText)
  }
  return data as T
}

export interface AdminOnlinePlayer {
  id: string
  name: string
  roomId: string | null
}

export interface AdminRoomRow {
  id: string
  players: { id: string; name: string; isLandlord: boolean; score: number }[]
  status: string
  playerCount: number
  maxPlayers: number
  roomStatus: string
  source?: string
  dbStatus?: string
  dbPlayerCount?: number
  hasPassword?: boolean
}

export interface AdminParameter {
  id: number
  key_name: string
  value: string
  description: string
  created_at: string
  updated_at: string
}

export const adminApi = {
  login: (username: string, password: string) =>
    adminFetch<{ token: string }>('/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    }),

  logout: () => adminFetch<{ success: boolean }>('/logout', { method: 'POST' }),

  getOnlinePlayers: () =>
    adminFetch<{ players: AdminOnlinePlayer[] }>('/online-players'),

  kick: (connectionId: string) =>
    adminFetch<{ success: boolean }>(`/kick/${encodeURIComponent(connectionId)}`, {
      method: 'POST'
    }),

  getRooms: () => adminFetch<{ rooms: AdminRoomRow[] }>('/rooms'),

  deleteRoom: (roomId: string) =>
    adminFetch<{ success: boolean }>(`/rooms/${encodeURIComponent(roomId)}`, {
      method: 'DELETE'
    }),

  getCheatTarget: () =>
    adminFetch<{ cheatTargetPlayerName: string }>('/cheat-target'),

  setCheatTarget: (cheatTargetPlayerName: string) =>
    adminFetch<{ cheatTargetPlayerName: string }>('/cheat-target', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cheatTargetPlayerName })
    }),

  getParameters: () => adminFetch<{ parameters: AdminParameter[] }>('/parameters'),

  updateParameter: (key: string, value: string, description?: string) =>
    adminFetch<{ success: boolean }>(`/parameters/${encodeURIComponent(key)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value, description })
    })
}
