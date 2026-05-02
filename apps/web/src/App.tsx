import { Routes, Route } from "react-router-dom"
import { ChatPage } from "@/pages/ChatPage"

export function App() {
  return (
    <Routes>
      <Route path="/" element={<ChatPage />} />
      <Route path="/chat/:sessionId" element={<ChatPage />} />
    </Routes>
  )
}
