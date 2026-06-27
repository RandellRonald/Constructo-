import { useEffect, useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bell, X, Check, CircleAlert, CheckCircle2, ShieldCheck, CreditCard } from 'lucide-react'
import { notificationAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

interface Notification {
  id: number
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export default function NotificationsList({ isOpen, onClose }: { isOpen: boolean, onClose: () => void }) {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const wsRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!isOpen || !user) return

    fetchNotifications()

    // Connect WebSocket
    const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:8000'
    const wsProto = apiBase.startsWith('https') ? 'wss' : 'ws'
    const host = apiBase.replace(/^https?:\/\//, '')
    const wsUrl = `${wsProto}://${host}/ws/notifications/${user.id}`
    
    wsRef.current = new WebSocket(wsUrl)
    wsRef.current.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data)
        if (payload.type === 'notification' || payload.title) {
          setNotifications(prev => [payload, ...prev])
        }
      } catch (e) {
        console.error('WS Notification parse error', e)
      }
    }

    return () => {
      if (wsRef.current) wsRef.current.close()
    }
  }, [isOpen, user])

  const fetchNotifications = async () => {
    setLoading(true)
    try {
      const res = await notificationAPI.getAll()
      if (res.data.success) {
        setNotifications(res.data.data || [])
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkRead = async (id: number) => {
    try {
      await notificationAPI.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (e) {
      console.error(e)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (e) {
      console.error(e)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-40"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 bottom-0 w-80 bg-surface z-50 border-l border-white/10 shadow-2xl flex flex-col"
          >
            <div className="p-4 border-b border-white/5 flex items-center justify-between glass-nav">
              <div className="flex items-center gap-2">
                <Bell className="w-5 h-5 text-accent" />
                <h3 className="font-bold">Notifications</h3>
                {unreadCount > 0 && (
                  <span className="bg-danger text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{unreadCount}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                {unreadCount > 0 && (
                  <button onClick={handleMarkAllRead} className="text-xs text-accent font-bold hover:underline">Mark all read</button>
                )}
                <button onClick={onClose} className="p-1.5 bg-white/5 rounded-lg hover:bg-white/10 transition-colors"><X className="w-4 h-4" /></button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {loading ? (
                <div className="text-center text-sm text-text-muted mt-10">Loading...</div>
              ) : notifications.length === 0 ? (
                <div className="text-center mt-20 flex flex-col items-center opacity-50">
                  <Bell className="w-10 h-10 mb-2 text-text-muted" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                notifications.map((notif, i) => (
                  <div key={notif.id || i} className={`p-4 rounded-xl border ${notif.is_read ? 'bg-white/5 border-white/5 opacity-75' : 'bg-accent/10 border-accent/20'}`}>
                    <div className="flex gap-3">
                      <div className="mt-1 shrink-0">
                        {notif.type === 'booking' ? <CheckCircle2 className="w-4 h-4 text-secondary" /> :
                         notif.type === 'payment' ? <CreditCard className="w-4 h-4 text-emerald-400" /> :
                         notif.type === 'system' ? <ShieldCheck className="w-4 h-4 text-accent" /> :
                         <CircleAlert className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-sm text-white mb-0.5">{notif.title}</p>
                        <p className="text-xs text-text-secondary leading-relaxed">{notif.message}</p>
                        <p className="text-[10px] text-text-muted mt-2 font-medium">
                          {notif.created_at ? new Date(notif.created_at).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                      {!notif.is_read && notif.id && (
                        <button onClick={() => handleMarkRead(notif.id)} className="shrink-0 text-accent hover:text-white transition-colors" title="Mark as read">
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
