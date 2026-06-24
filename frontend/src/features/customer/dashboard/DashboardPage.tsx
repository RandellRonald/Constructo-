import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell, User, Headphones, ArrowRight,
  Phone, MessageCircle, Shovel, HardHat, Truck, TreePine, Recycle,
  Siren, Home, Calendar, Navigation
} from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { customerAPI } from '../../../services/api'
import BottomNav from '../../../components/BottomNav'

export default function DashboardPage() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const res = await customerAPI.getDashboard()
      if (res.data.success) setDashboardData(res.data.data)
    } catch (err) {
      console.error('Failed to load dashboard:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const greeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Good Morning'
    if (hour < 17) return 'Good Afternoon'
    return 'Good Evening'
  }

  const services = [
    { icon: Shovel, name: 'Earthmoving', color: 'from-amber-500 to-amber-600' },
    { icon: HardHat, name: 'Crane', color: 'from-secondary to-secondary-dark' },
    { icon: Truck, name: 'Transport', color: 'from-accent to-accent-dark' },
    { icon: TreePine, name: 'Environmental', color: 'from-success to-emerald-600' },
    { icon: Recycle, name: 'Waste Mgmt', color: 'from-violet-500 to-purple-600' },
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 pt-6">
        <div className="max-w-lg mx-auto space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  const activeBooking = dashboardData?.active_booking

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="glass-nav sticky top-0 z-30 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold">
              {user?.name?.[0] || 'U'}
            </div>
            <div>
              <p className="text-xs text-text-muted">{greeting()}</p>
              <p className="font-bold text-sm">{user?.name || 'User'} 👋</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="relative p-2.5 rounded-xl hover:bg-black/5 transition-colors">
              <Bell className="w-5 h-5 text-text-secondary" />
              {(dashboardData?.unread_notifications || 0) > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-danger" />
              )}
            </button>
            <button className="p-2.5 rounded-xl hover:bg-black/5 transition-colors">
              <Headphones className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Quick Book Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-light p-6 text-white"
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-secondary/10 blur-3xl -mr-10 -mt-10" />
          <h2 className="text-lg font-bold mb-1 relative z-10">What service do you need today?</h2>
          <p className="text-white/60 text-sm mb-5 relative z-10">Book professional site services in minutes</p>
          <button
            onClick={() => navigate('/customer/book')}
            className="relative z-10 px-6 py-3 rounded-xl font-semibold text-primary bg-white hover:bg-white/90 transition-all flex items-center gap-2 text-sm"
          >
            Book a Service <ArrowRight className="w-4 h-4" />
          </button>
        </motion.div>

        {/* Service Categories */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <h3 className="font-bold text-sm mb-3">Services</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 scrollbar-hide">
            {services.map(s => (
              <button
                key={s.name}
                onClick={() => navigate('/customer/book')}
                className="flex flex-col items-center gap-2 min-w-[72px]"
              >
                <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center shadow-sm`}>
                  <s.icon className="w-6 h-6 text-white" />
                </div>
                <span className="text-xs font-medium text-text-secondary">{s.name}</span>
              </button>
            ))}
          </div>
        </motion.div>

        {/* Active Booking */}
        {activeBooking && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <h3 className="font-bold text-sm mb-3">Active Booking</h3>
            <div className="glass-card p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-sm">{activeBooking.booking_number}</p>
                  <p className="text-text-muted text-xs">{activeBooking.pickup_address?.slice(0, 40)}...</p>
                </div>
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[activeBooking.status] || 'bg-gray-100 text-gray-700'}`}>
                  {activeBooking.status?.replace('_', ' ')}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => navigate(`/customer/tracking/${activeBooking.id}`)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-semibold text-white gradient-primary flex items-center justify-center gap-1"
                >
                  <Navigation className="w-3.5 h-3.5" /> Track
                </button>
                <button className="py-2.5 px-4 rounded-xl text-xs font-semibold border border-border hover:bg-black/5 flex items-center gap-1">
                  <Phone className="w-3.5 h-3.5" /> Call
                </button>
                <button className="py-2.5 px-4 rounded-xl text-xs font-semibold border border-border hover:bg-black/5 flex items-center gap-1">
                  <MessageCircle className="w-3.5 h-3.5" /> Chat
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Emergency Booking */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="glass-card p-5 border-l-4 border-l-danger">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-xl bg-danger/10 flex items-center justify-center">
                <Siren className="w-5 h-5 text-danger" />
              </div>
              <div className="flex-1">
                <p className="font-bold text-sm">Need Immediate Assistance?</p>
                <p className="text-text-muted text-xs">Priority dispatch with emergency booking</p>
              </div>
              <button onClick={() => navigate('/customer/book')} className="px-4 py-2 rounded-lg text-xs font-semibold text-white bg-danger hover:bg-danger/90">
                Emergency
              </button>
            </div>
          </div>
        </motion.div>

        {/* Recent Bookings */}
        {(dashboardData?.recent_bookings?.length || 0) > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm">Recent Bookings</h3>
              <button className="text-xs text-secondary font-medium">View All</button>
            </div>
            <div className="space-y-2">
              {dashboardData.recent_bookings.slice(0, 3).map((b: any) => (
                <div key={b.id} className="glass-card p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                    <Calendar className="w-5 h-5 text-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{b.booking_number}</p>
                    <p className="text-text-muted text-xs">₹{b.estimated_price}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColors[b.status] || 'bg-gray-100'}`}>
                    {b.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Bottom Navigation */}
      <BottomNav variant="customer" />
    </div>
  )
}
