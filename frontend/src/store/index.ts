"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AppState {
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  setSidebarCollapsed: (v: boolean) => void

  mobileSidebarOpen: boolean
  toggleMobileSidebar: () => void
  setMobileSidebarOpen: (v: boolean) => void

  activeSessionToken: string | null
  setSessionToken: (token: string | null) => void

  selectedModel: string
  setSelectedModel: (model: string) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setSidebarCollapsed: (v) => set({ sidebarCollapsed: v }),

      mobileSidebarOpen: false,
      toggleMobileSidebar: () => set((s) => ({ mobileSidebarOpen: !s.mobileSidebarOpen })),
      setMobileSidebarOpen: (v) => set({ mobileSidebarOpen: v }),

      activeSessionToken: null,
      setSessionToken: (token) => set({ activeSessionToken: token }),

      selectedModel: "llama3.2:3b",
      setSelectedModel: (model) => set({ selectedModel: model }),
    }),
    {
      name: "dvap-app-state",
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        selectedModel: state.selectedModel,
      }),
    }
  )
)
