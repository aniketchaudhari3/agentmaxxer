import { useState, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useParams, useNavigate } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { MainContent } from "@/components/layout/MainContent"
import { ConversationContainer } from "@/components/chat/ConversationContainer"
import { MessageList } from "@/components/chat/MessageList"
import { Composer } from "@/components/composer/Composer"
import { AddProjectDialog } from "@/components/project/AddProjectDialog"
import { SettingsModal } from "@/components/settings/SettingsModal"
import { ChatUsage } from "@/components/chat/ChatUsage"
import { useAppStore } from "@/stores/app-store"
import { useKeyboard } from "@/hooks/use-keyboard"
import { useWebSocket } from "@/hooks/use-websocket"
import { Bot } from "lucide-react"

const ASCII = `                          __
  ____ _____ ____  ____  / /_____ ___  ____ __  ___  _____  _____
 / __ \`/ __ \`/ _ \\/ __ \\/ __/ __ \`__ \\/ __ \`/ |/_/ |/_/ _ \\/ ___/
/ /_/ / /_/ /  __/ / / / /_/ / / / / / /_/ />  <_>  </  __/ /
\\__,_/\\__, /\\___/_/ /_/\\__/_/ /_/ /_/\\__,_/_/|_/_/|_|\\___/_/
     /____/`

export function ChatPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [showAddProject, setShowAddProject] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showUsage, setShowUsage] = useState(false)
  const [settingsTab, setSettingsTab] = useState("agents")

  const apiOnline = useAppStore((s) => s.apiOnline)
  const setApiOnline = useAppStore((s) => s.setApiOnline)
  const projects = useAppStore((s) => s.projects)
  const activeProjectId = useAppStore((s) => s.activeProjectId)
  const setActiveProject = useAppStore((s) => s.setActiveProject)
  const setActiveSession = useAppStore((s) => s.setActiveSession)
  const loadProjects = useAppStore((s) => s.loadProjects)
  const loadSessions = useAppStore((s) => s.loadSessions)
  const addProject = useAppStore((s) => s.addProject)
  const sessions = useAppStore((s) => s.sessions)
  const activeSessionId = useAppStore((s) => s.activeSessionId)
  const createSession = useAppStore((s) => s.createSession)
  const deleteSession = useAppStore((s) => s.deleteSession)
  const events = useAppStore((s) => s.events)
  const userMessages = useAppStore((s) => s.userMessages)
  const isStreaming = useAppStore((s) => s.isStreaming)
  const loadProviders = useAppStore((s) => s.loadProviders)
  const sidebarCollapsed = useAppStore((s) => s.sidebarCollapsed)
  const toggleSidebar = useAppStore((s) => s.toggleSidebar)

  const hasMessages = events.length > 0 || userMessages.length > 0

  useEffect(() => {
    if (activeSessionId) {
      navigate(`/chat/${activeSessionId}`, { replace: true })
    }
  }, [activeSessionId, navigate])

  useEffect(() => {
    async function init() {
      const health = await fetch("/api/health").then(r => r.ok).catch(() => false)
      setApiOnline(health)
      if (health) {
        await Promise.all([loadProjects(), loadProviders()])
        if (sessionId) {
          await setActiveSession(sessionId)
        }
        await loadSessions()
      }
      setLoading(false)
    }
    init()
  }, [sessionId, setApiOnline, loadProjects, loadProviders, setActiveSession, loadSessions])

  const handleNewSession = useCallback(async () => {
    const session = await createSession(activeProjectId ?? undefined)
    if (session) {
      setActiveSession(session.id)
      navigate(`/chat/${session.id}`, { replace: true })
    }
  }, [activeProjectId, createSession, setActiveSession, navigate])

  const handleOpenSettings = useCallback((tab?: string) => {
    if (tab) { setSettingsTab(tab); setShowUsage(false) }
    setShowSettings(true)
  }, [])

  const handleSelectSession = useCallback(async (id: string) => {
    navigate(`/chat/${id}`, { replace: true })
    await setActiveSession(id)
  }, [navigate, setActiveSession])

  useWebSocket()

  useKeyboard({
    onCommandK: () => setShowSettings((s) => !s),
    onEscape: () => { setShowSettings(false); setShowAddProject(false); setShowUsage(false) },
    onNewSession: () => handleNewSession(),
    onToggleSidebar: () => toggleSidebar(),
  })

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <pre className="text-xs leading-tight text-red-500/70 mb-8 select-none">
            {ASCII}
          </pre>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-950 text-zinc-100">
      <AnimatePresence>
        <motion.div
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: sidebarCollapsed ? 48 : 256, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.15, ease: "easeInOut" }}
          className="overflow-hidden shrink-0 h-full"
        >
          <Sidebar
            sessions={sessions}
            activeSessionId={activeSessionId}
            onSelectSession={handleSelectSession}
            onNewSession={handleNewSession}
            onDeleteSession={(id) => deleteSession(id)}
            collapsed={sidebarCollapsed}
            onToggleCollapse={toggleSidebar}
            projects={projects}
            activeProjectId={activeProjectId}
            onOpenProject={() => setShowAddProject(true)}
            onOpenSettings={() => handleOpenSettings()}
          />
        </motion.div>
      </AnimatePresence>

      {hasMessages ? (
        <MainContent>
          <ConversationContainer>
            <MessageList events={events} userMessages={userMessages} isStreaming={isStreaming} />
          </ConversationContainer>
          <div className="mx-auto w-full max-w-3xl px-4 pb-2">
            <div className="flex items-center justify-center gap-2 px-4 py-1 text-xs text-zinc-600">
              {!apiOnline && <span className="text-amber-500">API offline</span>}
            </div>
            <Composer onOpenSettings={handleOpenSettings} onOpenUsage={() => setShowUsage(!showUsage)} />
          </div>
        </MainContent>
      ) : (
        <MainContent>
          <div className="flex flex-1 items-center justify-center">
            <div className="w-full max-w-3xl px-4">
              <div className="flex justify-center">
                <pre className="text-xs leading-tight text-red-500/70 mb-8 select-none">
                  {ASCII}
                </pre>
              </div>
              <Composer onOpenSettings={handleOpenSettings} onOpenUsage={() => setShowUsage(!showUsage)} />
            </div>
          </div>
          <div className="flex items-center justify-center gap-2 px-4 py-1 text-xs text-zinc-600">
            {!apiOnline && <span className="text-amber-500">API offline</span>}
          </div>
        </MainContent>
      )}

      {showUsage && activeSessionId && (
        <div className="fixed bottom-20 right-4 z-50">
          <ChatUsage />
        </div>
      )}

      <AddProjectDialog
        open={showAddProject}
        onOpenChange={setShowAddProject}
        onSubmit={async (name, path) => {
          const proj = await addProject(name, path)
          if (proj) {
            setActiveProject(proj.id)
            await loadSessions(proj.id)
          }
        }}
      />

      <SettingsModal
        open={showSettings}
        onOpenChange={setShowSettings}
        defaultTab={settingsTab}
      />
    </div>
  )
}
