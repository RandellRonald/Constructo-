import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Bell, CheckCheck, Calendar, Navigation,
  CreditCard, Star, Siren, Clock, Home, User,
  Package
} from 'lucide-react'
import { notificationAPI } from '../../../services/api'

interface Notification {
  id: number
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

const typeIcons: Record<string, typeof Bell> = {
  booking: Calendar,
  payment: CreditCard,
  tracking: Navigation,
  review: Star,
  emergency: Siren,
  system: Bell,
}

const typeColors: Record<string, string> = {
  booking: 'bg-secondary/10 text-secondary',
  payment: 'bg-success/10 text-success',
  tracking: 'bg-accent/10 text-accent',
  review: 'bg-warning/10 text-warning',
  emergency: 'bg-danger/10 text-danger',
  system: 'bg-primary/10 text-primary',
}

export default function NotificationsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [])

  const loadNotifications = async () => {
    try {
      const res = await notificationAPI.getAll()
      if (res.data.success) {
        setNotifications(res.data.data?.notifications || res.data.data || [])
      }
    } catch (err) {
      console.error('Failed to load notifications:', err)
      // Show empty state gracefully
      setNotifications([])
    } finally {
      setIsLoading(false)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      await notificationAPI.markAllRead()
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch (err) {
      console.error('Failed to mark all read:', err)
    }
  }

  const handleMarkRead = async (id: number) => {
    try {
      await notificationAPI.markRead(id)
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch (err) {
      console.error('Failed to mark read:', err)
    }
  }

  const unreadCount = notifications.filter(n => !n.is_read).length

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'Just now'
    if (diffMin < 60) return `${diffMin}m ago`
    const diffHrs = Math.floor(diffMin / 60)
    if (diffHrs < 24) return `${diffHrs}h ago`
    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  // Group notifications
  const today = new Date().toDateString()
  const todayNotifs = notifications.filter(n => new Date(n.created_at).toDateString() === today)
  const earlierNotifs = notifications.filter(n => new Date(n.created_at).toDateString() !== today)

  const bottomNav = [
    { icon: Home, label: 'Home', path: '/customer/dashboard' },
    { icon: Calendar, label: 'Bookings', path: '/customer/bookings' },
    { icon: Navigation, label: 'Track', path: '/customer/tracking' },
    { icon: Bell, label: 'Alerts', path: '/customer/notifications' },
    { icon: User, label: 'Profile', path: '/customer/profile' },
  ]

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="glass-nav sticky top-0 z-30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/customer/dashboard')} className="p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-bold text-sm">Notifications</p>
            {unreadCount > 0 && (
              <p className="text-text-muted text-xs">{unreadCount} unread</p>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium text-secondary hover:bg-secondary/5 transition-colors"
            >
              <CheckCheck className="w-3.5 h-3.5" /> Mark all read
            </button>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="skeleton h-20 rounded-2xl" />
            ))}
          </div>
        ) : notifications.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-secondary" />
            </div>
            <p className="font-semibold mb-1">All caught up!</p>
            <p className="text-text-muted text-sm">You'll be notified about bookings, payments, and updates.</p>
          </motion.div>
        ) : (
          <>
            {/* Today */}
            {todayNotifs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Today</p>
                <div className="space-y-2">
                  {todayNotifs.map((n, i) => {
                    const Icon = typeIcons[n.type] || Bell
                    const colorClass = typeColors[n.type] || typeColors.system
                    return (
                      <motion.button
                        key={n.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => handleMarkRead(n.id)}
                        className={`w-full glass-card p-4 flex items-start gap-3 text-left transition-all ${!n.is_read ? 'border-l-4 border-l-secondary' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                          <p className="text-text-muted text-xs mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                        <span className="text-text-muted text-[10px] shrink-0 mt-0.5">
                          {formatTime(n.created_at)}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Earlier */}
            {earlierNotifs.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-text-muted uppercase tracking-wider mb-2">Earlier</p>
                <div className="space-y-2">
                  {earlierNotifs.map((n, i) => {
                    const Icon = typeIcons[n.type] || Bell
                    const colorClass = typeColors[n.type] || typeColors.system
                    return (
                      <motion.button
                        key={n.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.03 }}
                        onClick={() => handleMarkRead(n.id)}
                        className={`w-full glass-card p-4 flex items-start gap-3 text-left transition-all ${!n.is_read ? 'border-l-4 border-l-secondary' : ''}`}
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${colorClass}`}>
                          <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${!n.is_read ? 'font-bold' : 'font-medium'}`}>{n.title}</p>
                          <p className="text-text-muted text-xs mt-0.5 line-clamp-2">{n.message}</p>
                        </div>
                        <span className="text-text-muted text-[10px] shrink-0 mt-0.5">
                          {formatTime(n.created_at)}
                        </span>
                      </motion.button>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass-nav border-t border-border px-4 py-2 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {bottomNav.map(item => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
                location.pathname === item.path ? 'text-secondary' : 'text-text-muted hover:text-primary'
              }`}
            >
              <item.icon className="w-5 h-5" />
              <span className="text-[10px] font-medium">{item.label}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
