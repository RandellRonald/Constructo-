import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  Bell, User, Navigation, MapPin, Phone, MessageCircle, 
  Wallet, CheckCircle2, Siren, Home, Calendar, Clock,
  TrendingUp, CreditCard, ChevronRight
} from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'
import { providerAPI } from '../../../services/api'

export default function ProviderDashboard() {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [activeJob, setActiveJob] = useState<any>(null)
  const [stats, setStats] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const res = await providerAPI.getDashboard()
      if (res.data.success) {
        const data = res.data.data
        if (data?.active_job) setActiveJob(data.active_job)
        if (data?.stats) setStats(data.stats)
      }
    } catch (err) {
      console.error('Failed to load provider dashboard:', err)
      // Graceful fallback – show empty state
      setStats({ today_earnings: 0, completed_jobs: 0, rating: user?.average_rating || 0, total_reviews: user?.total_reviews || 0 })
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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 pt-6">
        <div className="max-w-lg mx-auto space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="skeleton h-32 rounded-2xl" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="glass-nav sticky top-0 z-30 px-4 py-4">
        <div className="max-w-lg mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-bold">
              {user?.business_name?.[0] || user?.name?.[0] || 'P'}
            </div>
            <div>
              <p className="text-xs text-text-muted">{greeting()}</p>
              <p className="font-bold text-sm truncate max-w-[150px]">{user?.business_name || user?.name || 'Provider'}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Online Status Toggle */}
            <div className="flex items-center gap-2 bg-white/60 px-3 py-1.5 rounded-full border border-border">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success"></span>
              </span>
              <span className="text-xs font-semibold">Online</span>
            </div>
            <button className="relative p-2.5 rounded-xl hover:bg-black/5 transition-colors">
              <Bell className="w-5 h-5 text-text-secondary" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        
        {/* Earnings Overview */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid grid-cols-2 gap-3">
          <div className="glass-card p-4 bg-gradient-to-br from-primary to-primary-light text-white border-0">
            <div className="flex items-center gap-2 mb-2 text-white/70">
              <Wallet className="w-4 h-4" />
              <span className="text-xs font-medium">Today's Earnings</span>
            </div>
            <p className="text-2xl font-bold mb-1">₹{stats?.today_earnings?.toLocaleString()}</p>
            <div className="flex items-center gap-1 text-[10px] text-success-light">
              <TrendingUp className="w-3 h-3" />
              <span>+12% from yesterday</span>
            </div>
          </div>
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-2 text-text-secondary">
              <CheckCircle2 className="w-4 h-4" />
              <span className="text-xs font-medium">Completed Jobs</span>
            </div>
            <p className="text-2xl font-bold mb-1">{stats?.completed_jobs}</p>
            <div className="flex items-center gap-1 text-[10px] text-text-muted">
              <span>Today</span>
            </div>
          </div>
        </motion.div>

        {/* Active Job (If any) */}
        {activeJob && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-accent"></span>
                </span>
                Active Job
              </h3>
              <span className="text-xs font-semibold text-accent">{activeJob.status.toUpperCase()}</span>
            </div>

            <div className={`glass-card p-5 border-l-4 ${activeJob.is_emergency ? 'border-l-danger' : 'border-l-accent'}`}>
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="font-bold text-sm mb-1">{activeJob.customer_name}</p>
                  <p className="text-text-secondary text-xs flex items-center gap-1">
                    <MapPin className="w-3.5 h-3.5" />
                    {activeJob.pickup_address}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-secondary text-sm">₹{activeJob.estimated_earnings}</p>
                  <p className="text-text-muted text-[10px]">Est. Payout</p>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <div className="px-2.5 py-1 rounded-full bg-black/5 text-[10px] font-semibold text-text-secondary">
                  {activeJob.service_name}
                </div>
                <div className="px-2.5 py-1 rounded-full bg-black/5 text-[10px] font-semibold text-text-secondary flex items-center gap-1">
                  <Clock className="w-3 h-3" /> {activeJob.duration_hours}h
                </div>
                {activeJob.is_emergency && (
                  <div className="px-2.5 py-1 rounded-full bg-danger/10 text-[10px] font-semibold text-danger flex items-center gap-1">
                    <Siren className="w-3 h-3" /> Emergency
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => navigate(`/provider/job/${activeJob.id}`)}
                  className="col-span-2 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-accent to-accent-dark shadow-lg flex items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" /> Start Navigation
                </button>
                <button className="py-2.5 rounded-xl font-semibold border border-border hover:bg-black/5 flex items-center justify-center gap-2 text-xs">
                  <Phone className="w-3.5 h-3.5" /> Call
                </button>
                <button className="py-2.5 rounded-xl font-semibold border border-border hover:bg-black/5 flex items-center justify-center gap-2 text-xs">
                  <MessageCircle className="w-3.5 h-3.5" /> Chat
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Incoming Requests (Placeholder) */}
        {!activeJob && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <h3 className="font-bold text-sm mb-3">Incoming Requests</h3>
            <div className="glass-card p-8 text-center border-dashed">
              <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                <Navigation className="w-8 h-8 text-accent animate-pulse" />
              </div>
              <p className="font-semibold text-sm mb-1">Looking for jobs nearby...</p>
              <p className="text-text-muted text-xs">Keep your app open to receive new booking requests in your area.</p>
            </div>
          </motion.div>
        )}

        {/* Wallet & Payouts */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <div className="glass-card p-0 overflow-hidden">
            <button className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <CreditCard className="w-5 h-5 text-secondary" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Wallet & Payouts</p>
                  <p className="text-text-muted text-xs">Manage your earnings</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </button>
            <div className="w-full h-px bg-border" />
            <button className="w-full flex items-center justify-between p-4 hover:bg-black/5 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-warning" />
                </div>
                <div className="text-left">
                  <p className="font-bold text-sm">Job History</p>
                  <p className="text-text-muted text-xs">View past bookings</p>
                </div>
              </div>
              <ChevronRight className="w-5 h-5 text-text-muted" />
            </button>
          </div>
        </motion.div>

      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 glass-nav border-t border-border px-4 py-2 z-30">
        <div className="max-w-lg mx-auto flex items-center justify-around">
          {[
            { icon: Home, label: 'Home', path: '/provider/dashboard' },
            { icon: Calendar, label: 'Jobs', path: '/provider/jobs' },
            { icon: Wallet, label: 'Wallet', path: '/provider/wallet' },
            { icon: User, label: 'Profile', path: '/provider/profile' },
          ].map(item => (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
                location.pathname === item.path ? 'text-accent' : 'text-text-muted hover:text-primary'
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
