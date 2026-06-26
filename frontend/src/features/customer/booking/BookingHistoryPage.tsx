import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Calendar, Navigation, Clock, IndianRupee,
  CheckCircle2, XCircle, Search, Home, Bell, User
} from 'lucide-react'
import { bookingAPI } from '../../../services/api'

type TabKey = 'active' | 'completed' | 'cancelled'

export default function BookingHistoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState<TabKey>('active')
  const [bookings, setBookings] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    loadBookings()
  }, [activeTab])

  const loadBookings = async () => {
    setIsLoading(true)
    try {
      const res = activeTab === 'active'
        ? await bookingAPI.getActive()
        : await bookingAPI.getHistory()
      if (res.data.success) {
        const rawData = res.data.data?.bookings || res.data.data || []
        let dataArray: any[] = []
        if (Array.isArray(rawData)) {
          dataArray = rawData
        } else if (rawData && typeof rawData === 'object') {
          dataArray = [rawData]
        }
        
        const filtered = activeTab === 'active'
          ? dataArray
          : dataArray.filter((b: any) =>
              activeTab === 'completed' ? b.status === 'completed' : b.status === 'cancelled'
            )
        setBookings(filtered)
      }
    } catch (err) {
      console.error('Failed to load bookings:', err)
      setBookings([])
    } finally {
      setIsLoading(false)
    }
  }

  const tabs: { key: TabKey; label: string; icon: typeof Calendar }[] = [
    { key: 'active', label: 'Active', icon: Navigation },
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
    { key: 'cancelled', label: 'Cancelled', icon: XCircle },
  ]

  const statusColors: Record<string, string> = {
    created: 'bg-blue-100 text-blue-700',
    searching: 'bg-amber-100 text-amber-700',
    assigned: 'bg-indigo-100 text-indigo-700',
    en_route: 'bg-cyan-100 text-cyan-700',
    arrived: 'bg-emerald-100 text-emerald-700',
    in_progress: 'bg-violet-100 text-violet-700',
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
  }

  const filteredBookings = bookings.filter(b =>
    !searchQuery || b.booking_number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
          <p className="font-bold text-sm flex-1">My Bookings</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search by booking number..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/60 border border-border focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm"
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-white/40 p-1 rounded-xl border border-border">
          {tabs.map(tab => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? 'gradient-primary text-white shadow-sm'
                  : 'text-text-secondary hover:bg-black/5'
              }`}
            >
              <tab.icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          ))}
        </div>

        {/* Booking List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-28 rounded-2xl" />
            ))}
          </div>
        ) : filteredBookings.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-secondary/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-secondary" />
            </div>
            <p className="font-semibold mb-1">No {activeTab} bookings</p>
            <p className="text-text-muted text-sm">Your {activeTab} bookings will appear here.</p>
            {activeTab === 'active' && (
              <button
                onClick={() => navigate('/customer/book')}
                className="mt-4 px-6 py-2.5 rounded-xl font-semibold text-white gradient-primary text-sm"
              >
                Book a Service
              </button>
            )}
          </motion.div>
        ) : (
          <div className="space-y-3">
            {filteredBookings.map((b: any, i: number) => (
              <motion.div
                key={b.id || i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-bold text-sm">{b.booking_number || `Booking #${b.id}`}</p>
                    <p className="text-text-muted text-xs mt-0.5">
                      {b.created_at ? new Date(b.created_at).toLocaleDateString() : 'Recent'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[b.status] || 'bg-gray-100 text-gray-700'}`}>
                    {b.status?.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs text-text-secondary mb-3">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    {b.duration_hours || '—'}h
                  </span>
                  <span className="flex items-center gap-1">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {b.estimated_price || b.total_amount || '—'}
                  </span>
                </div>

                <div className="flex gap-2">
                  {['assigned', 'en_route', 'arrived', 'in_progress'].includes(b.status) && (
                    <button
                      onClick={() => navigate(`/customer/tracking/${b.id}`)}
                      className="flex-1 py-2 rounded-xl text-xs font-semibold text-white gradient-primary flex items-center justify-center gap-1"
                    >
                      <Navigation className="w-3.5 h-3.5" /> Track
                    </button>
                  )}
                  {b.status === 'completed' && (
                    <>
                      <button
                        onClick={() => navigate(`/customer/invoice/${b.id}`)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold text-white gradient-primary flex items-center justify-center gap-1"
                      >
                        <IndianRupee className="w-3.5 h-3.5" /> Invoice
                      </button>
                      <button
                        onClick={() => navigate(`/customer/review/${b.id}`)}
                        className="flex-1 py-2 rounded-xl text-xs font-semibold border border-secondary text-secondary flex items-center justify-center gap-1"
                      >
                        Review
                      </button>
                    </>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
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
