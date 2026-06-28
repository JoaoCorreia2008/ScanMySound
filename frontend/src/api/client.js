import axios from 'axios'

const STORAGE_KEY = 'scanmysound:session'

function randomId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16)
  })
}

export function getSessionId() {
  if (typeof window === 'undefined') return null

  let id = window.localStorage.getItem(STORAGE_KEY)
  if (!id) {
    id = randomId()
    window.localStorage.setItem(STORAGE_KEY, id)
  }
  return id
}

export function clearSession() {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(STORAGE_KEY)
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const sessionId = getSessionId()
  if (sessionId) {
    config.headers = config.headers || {}
    config.headers['X-Session-Id'] = sessionId
  }
  return config
})

export default api
