import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Send, MessageCircle, AlertCircle, RefreshCw } from 'lucide-react'
import { bookingAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

interface ChatInterfaceProps {
  bookingId: number
  otherPartyName?: string
  onClose: () => void
}

interface Message {
  id?: number
  sender_id: number
  sender_name?: string
  message: string
  created_at?: string
}

export default function ChatInterface({ bookingId, otherPartyName = 'Other Party', onClose }: ChatInterfaceProps) {
  const { user } = useAuthStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'error'>('connecting')
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const socketRef = useRef<WebSocket | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // Fetch chat history
  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await bookingAPI.getChatHistory(bookingId)
        if (res.data.success) {
          setMessages(res.data.data)
        }
      } catch (err) {
        console.error('Failed to load chat history:', err)
      } finally {
        setIsLoadingHistory(false)
      }
    }
    loadHistory()
  }, [bookingId])

  // Setup WebSocket connection
  useEffect(() => {
    let active = true
    let socket: WebSocket | null = null
    let reconnectTimeout: number | undefined

    function connect() {
      if (!active) return

      setWsStatus('connecting')
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
      const wsProto = apiBase.startsWith('https') ? 'wss' : 'ws'
      const host = apiBase.replace(/^https?:\/\//, '')
      const wsUrl = `${wsProto}://${host}/ws/chat/${bookingId}`

      socket = new WebSocket(wsUrl)
      socketRef.current = socket

      socket.onopen = () => {
        if (!active) {
          socket?.close()
          return
        }
        setWsStatus('connected')
      }

      socket.onmessage = (event) => {
        if (!active) return
        try {
          const data = JSON.parse(event.data)
          const incomingMsg: Message = {
            sender_id: Number(data.sender_id),
            message: data.message,
            created_at: data.created_at || new Date().toISOString(),
          }

          setMessages((prev) => {
            // Avoid duplicate messages if WebSocket broadcasts what we just added locally or vice-versa
            const isDuplicate = prev.some(
              (m) =>
                m.sender_id === incomingMsg.sender_id &&
                m.message === incomingMsg.message &&
                Math.abs(new Date(m.created_at || 0).getTime() - new Date(incomingMsg.created_at || 0).getTime()) < 1000
            )
            if (isDuplicate) return prev
            return [...prev, incomingMsg]
          })
        } catch (e) {
          console.error('Error parsing WebSocket chat message:', e)
        }
      }

      socket.onerror = () => {
        if (!active) return
        setWsStatus('error')
      }

      socket.onclose = () => {
        if (!active) return
        setWsStatus('error')
        // Auto-reconnect after 5 seconds
        reconnectTimeout = window.setTimeout(connect, 5000)
      }
    }

    connect()

    return () => {
      active = false
      if (socket) {
        socket.close()
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout)
      }
    }
  }, [bookingId])

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => {
    if (!newMessage.trim() || !user || !socketRef.current || wsStatus !== 'connected') return

    const payload = {
      sender_id: user.id,
      message: newMessage.trim(),
    }

    // Optimistically add to messages
    const localMsg: Message = {
      sender_id: user.id,
      sender_name: user.name,
      message: payload.message,
      created_at: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, localMsg])

    try {
      socketRef.current.send(JSON.stringify(payload))
      setNewMessage('')
    } catch (e) {
      console.error('Failed to send WebSocket message:', e)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.95, y: 20 }}
        className="w-full max-w-md h-[550px] flex flex-col bg-slate-900/90 border border-white/10 rounded-3xl shadow-2xl backdrop-blur-md overflow-hidden text-slate-100"
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-white/5 bg-slate-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-400">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-sm text-white">{otherPartyName}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span
                  className={`w-2 h-2 rounded-full ${
                    wsStatus === 'connected'
                      ? 'bg-emerald-500 shadow-[0_0_8px_#10b981]'
                      : wsStatus === 'connecting'
                      ? 'bg-yellow-500 animate-pulse'
                      : 'bg-rose-500 shadow-[0_0_8px_#ef4444]'
                  }`}
                />
                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  {wsStatus === 'connected' ? 'Connected' : wsStatus === 'connecting' ? 'Connecting...' : 'Disconnected (Retrying)'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Message List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-900/20">
          {isLoadingHistory ? (
            <div className="h-full flex items-center justify-center">
              <RefreshCw className="w-6 h-6 text-indigo-500 animate-spin" />
            </div>
          ) : messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center px-6">
              <MessageCircle className="w-8 h-8 mb-2 opacity-40 text-indigo-400" />
              <p className="text-sm font-semibold">No messages yet</p>
              <p className="text-xs max-w-[240px] mt-1 text-slate-400/80">Start the conversation about this booking.</p>
            </div>
          ) : (
            messages.map((msg, index) => {
              const isSelf = msg.sender_id === user?.id
              return (
                <div key={index} className={`flex flex-col ${isSelf ? 'items-end' : 'items-start'}`}>
                  {/* Sender name if not self */}
                  {!isSelf && (
                    <span className="text-[10px] font-semibold text-slate-400 mb-1 ml-2">
                      {msg.sender_name || otherPartyName}
                    </span>
                  )}
                  <div
                    className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm ${
                      isSelf
                        ? 'bg-indigo-600 text-white rounded-tr-none'
                        : 'bg-white/5 border border-white/5 text-slate-200 rounded-tl-none'
                    }`}
                  >
                    <p className="leading-relaxed break-words">{msg.message}</p>
                  </div>
                  {/* Timestamp */}
                  <span className="text-[9px] text-slate-500 font-medium mt-1 mx-1.5">
                    {msg.created_at ? new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Status Warning if disconnected */}
        {wsStatus !== 'connected' && (
          <div className="px-4 py-2 bg-rose-500/10 border-t border-b border-rose-500/20 text-rose-400 text-xs flex items-center gap-2 shrink-0">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>Chat is offline. Attempting to reconnect...</span>
          </div>
        )}

        {/* Input Bar */}
        <div className="p-4 border-t border-white/5 bg-slate-950/40 flex items-center gap-2 shrink-0">
          <input
            type="text"
            placeholder="Type your message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyDown={handleKeyPress}
            disabled={wsStatus !== 'connected'}
            className="flex-1 px-4 py-3 bg-slate-900 border border-white/10 rounded-2xl text-sm text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim() || wsStatus !== 'connected'}
            className="p-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/30 text-white rounded-2xl transition-all shadow-md shadow-indigo-600/20 disabled:shadow-none shrink-0"
          >
            <Send className="w-4.5 h-4.5" />
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
