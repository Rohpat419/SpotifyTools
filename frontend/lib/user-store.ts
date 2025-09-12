"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface UserState {
  userId: string | null
  setUserId: (userId: string | null) => void
  clearUser: () => void
}

export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      userId: null,
      setUserId: (userId) => set({ userId }),
      clearUser: () => set({ userId: null }),
    }),
    {
      name: "spotify-user-storage",
    },
  ),
)
