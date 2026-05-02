import { create } from "zustand"
import type { AgentEvent, ProviderStatus, Project, Session, DailySummary, ProviderStat } from "@/types"

const API = "/api"

async function apiGet(path: string) {
  try {
    const res = await fetch(`${API}${path}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function apiPost(path: string, body: unknown) {
  try {
    const res = await fetch(`${API}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

async function apiDelete(path: string) {
  try {
    const res = await fetch(`${API}${path}`, { method: "DELETE" })
    return res.ok
  } catch {
    return false
  }
}

export type Mode = "auto" | "free" | "paid"

export interface AppState {
  projects: Project[]
  activeProjectId: string | null
  setActiveProject: (id: string | null) => void
  loadProjects: () => Promise<void>
  addProject: (name: string, path: string) => Promise<Project | null>
  removeProject: (id: string) => Promise<void>

  sessions: Session[]
  activeSessionId: string | null
  setActiveSession: (id: string | null) => Promise<void>
  loadSessions: (projectId?: string) => Promise<void>
  createSession: (projectId?: string) => Promise<Session | null>
  deleteSession: (id: string) => Promise<void>

  events: AgentEvent[]
  userMessages: string[]
  isStreaming: boolean
  appendEvent: (event: AgentEvent) => void
  addUserMessage: (content: string) => void
  clearMessages: () => void

  providers: ProviderStatus[]
  activeProviderId: string | null
  setActiveProviderId: (id: string | null) => void
  loadProviders: () => Promise<void>

  selectedModel: string | null
  setSelectedModel: (id: string | null) => void

  enabledProviders: string[]
  toggleProvider: (id: string) => void

  mode: Mode
  setMode: (mode: Mode) => void

  isExecuting: boolean
  submitTask: (task: string) => Promise<void>
  cancelExecution: () => void

  apiOnline: boolean
  setApiOnline: (online: boolean) => void

  sidebarCollapsed: boolean
  toggleSidebar: () => void

  dailySummary: DailySummary | null
  providerStats: Record<string, ProviderStat>
  loadUsage: () => Promise<void>

  abortController: AbortController | null
}

export const useAppStore = create<AppState>((set, get) => ({
  projects: [],
  activeProjectId: null,
  setActiveProject: (id) => { set({ activeProjectId: id }) },
  loadProjects: async () => {
    const data = await apiGet("/projects")
    if (data?.projects) set({ projects: data.projects })
  },
  addProject: async (name, path) => {
    const data = await apiPost("/projects", { name, path })
    if (data?.id) {
      await get().loadProjects()
      return data
    }
    return null
  },
  removeProject: async (id) => {
    await apiDelete(`/projects/${id}`)
    const { activeProjectId } = get()
    if (activeProjectId === id) set({ activeProjectId: null, sessions: [], activeSessionId: null })
    await get().loadProjects()
  },

  sessions: [],
  activeSessionId: null,
  setActiveSession: async (id) => {
    set({ activeSessionId: id, events: [], userMessages: [] })
    if (id) {
      const data = await apiGet(`/sessions/${id}`)
      if (data?.events) {
        set({ events: data.events })
      }
      if (data?.messages) {
        const userMsgs = data.messages
          .filter((m: any) => m.role === "user")
          .map((m: any) => m.content)
        set({ userMessages: userMsgs })
      }
    }
  },
  loadSessions: async (projectId?) => {
    if (projectId) {
      const data = await apiGet(`/projects/${projectId}/sessions`)
      if (data?.sessions) set({ sessions: data.sessions })
    } else {
      const data = await apiGet("/sessions?global=true")
      if (data?.sessions) set({ sessions: data.sessions })
    }
  },
  createSession: async (projectId) => {
    const data = await apiPost("/sessions", { projectId })
    if (data?.id) {
      if (projectId) await get().loadSessions(projectId)
      return data
    }
    return null
  },
  deleteSession: async (id) => {
    await apiDelete(`/sessions/${id}`)
    const { activeSessionId, activeProjectId } = get()
    if (activeSessionId === id) set({ activeSessionId: null, events: [], userMessages: [] })
    if (activeProjectId) await get().loadSessions(activeProjectId)
  },

  events: [],
  userMessages: [],
  isStreaming: false,
  appendEvent: (event) => set((s) => ({ events: [...s.events, event] })),
  addUserMessage: (content) => set((s) => ({ userMessages: [...s.userMessages, content] })),
  clearMessages: () => set({ events: [], userMessages: [] }),

  providers: [],
  activeProviderId: null,
  setActiveProviderId: (id) => set({ activeProviderId: id, selectedModel: null }),
  loadProviders: async () => {
    const data = await apiGet("/providers")
    if (data?.providers) {
      const statuses: ProviderStatus[] = data.providers.map((p: any) => ({
        id: p.id,
        name: p.name,
        installed: p.status?.installed ?? false,
        version: p.status?.version,
        type: p.type,
        auth: p.status?.auth ?? false,
        healthy: true,
        models: p.models ?? [],
      }))
      set({ providers: statuses })
    }
  },

  selectedModel: null,
  setSelectedModel: (id) => set({ selectedModel: id }),

  enabledProviders: [],
  toggleProvider: (id) => set((s) => {
    const set = new Set(s.enabledProviders)
    if (set.has(id)) set.delete(id)
    else set.add(id)
    return { enabledProviders: [...set] }
  }),

  mode: "auto",
  setMode: (mode) => set({ mode }),

  isExecuting: false,
  submitTask: async (task) => {
    const { activeProviderId, mode, activeSessionId, addUserMessage, loadProviders, loadUsage } = get()

    addUserMessage(task)
    set({ isExecuting: true, isStreaming: true })

    const controller = new AbortController()
    set({ abortController: controller })

    let newSessionId: string | null = null

    try {
      const res = await fetch(`${API}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          messages: [{ role: "user", content: task }],
          stream: true,
          mode,
          model: activeProviderId ?? undefined,
          sessionId: activeSessionId ?? undefined,
        }),
      })

      if (!res.ok) throw new Error(`API error: ${res.status}`)
      const reader = res.body?.getReader()
      if (!reader) throw new Error("No response body")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const data = line.slice(6)
          if (data === "[DONE]") continue
          try {
            const parsed = JSON.parse(data)
            if (parsed.type === "done") {
              if (parsed.sessionId) newSessionId = parsed.sessionId
              continue
            }
            if (parsed.type === "error") {
              useAppStore.getState().appendEvent({
                id: "error-" + Date.now(),
                type: "error",
                content: parsed.content ?? parsed.message ?? "Unknown error",
                provider: parsed.provider ?? "system",
                sequence: 0,
                timestamp: Date.now(),
              })
              continue
            }
            useAppStore.getState().appendEvent(parsed)
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        useAppStore.getState().appendEvent({
          id: "error-" + Date.now(),
          type: "error",
          content: (err as Error).message,
          provider: "system",
          sequence: 0,
          timestamp: Date.now(),
        })
      }
    } finally {
      set({ isExecuting: false, isStreaming: false, abortController: null })
      if (newSessionId) {
        set({ activeSessionId: newSessionId })
        get().loadSessions()
      }
      loadProviders()
      loadUsage()
    }
  },
  cancelExecution: () => {
    const { abortController } = get()
    if (abortController) {
      abortController.abort()
      set({ abortController: null, isExecuting: false, isStreaming: false })
    }
  },

  apiOnline: false,
  setApiOnline: (online) => set({ apiOnline: online }),

  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),

  dailySummary: null,
  providerStats: {},
  loadUsage: async () => {
    const data = await apiGet("/usage")
    if (data?.totalRequests !== undefined) {
      set({ dailySummary: data })
    }
  },
  abortController: null,
}))
