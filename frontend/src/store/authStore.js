import { create } from 'zustand'
import { api } from '../lib/api'

export const useAuthStore = create((set) => ({
  user:      null,
  isLoading: true,

  init: async () => {
    const token = localStorage.getItem('token')
    if (!token) { set({ isLoading: false }); return }
    try {
      const user = await api.getMe()
      set({ user, isLoading: false })
    } catch {
      localStorage.removeItem('token')
      set({ isLoading: false })
    }
  },

  setUser:  (user)  => set({ user }),
  logout: () => {
    localStorage.removeItem('token')
    set({ user: null })
  },
}))