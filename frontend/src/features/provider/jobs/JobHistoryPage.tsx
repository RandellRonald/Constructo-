import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Calendar, Clock, IndianRupee, MapPin,
  CheckCircle2, Home, Wallet, User, Filter
} from 'lucide-react'
import { providerAPI } from '../../../services/api'

type FilterKey = 'today' | 'week' | 'month' | 'all'

export default function JobHistoryPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [filter, setFilter] = useState<FilterKey>('today')
  const [jobs, setJobs] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadJobs()
  }, [filter])

  const loadJobs = async () => {
    setIsLoading(true)
    try {
      const res = await providerAPI.getJobHistory(filter)
      if (res.data.success) {
        setJobs(res.data.data?.jobs || res.data.data || [])
      }
    } catch (err) {
      console.error('Failed to load jobs:', err)
      setJobs([])
    } finally {
      setIsLoading(false)
    }
  }

  const filters: { key: FilterKey; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'week', label: 'This Week' },
    { key: 'month', label: 'This Month' },
    { key: 'all', label: 'All Time' },
  ]

  const statusColors: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    cancelled: 'bg-red-100 text-red-700',
    in_progress: 'bg-violet-100 text-violet-700',
  }

  const totalEarnings = jobs
    .filter((j: any) => j.status === 'completed')
    .reduce((sum: number, j: any) => sum + (j.provider_payout || j.estimated_price || 0), 0)

  const bottomNav = [
    { icon: Home, label: 'Home', path: '/provider/dashboard' },
    { icon: Calendar, label: 'Jobs', path: '/provider/jobs' },
    { icon: Wallet, label: 'Wallet', path: '/provider/wallet' },
    { icon: User, label: 'Profile', path: '/provider/profile' },
  ]

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="glass-nav sticky top-0 z-30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/provider/dashboard')} className="p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="font-bold text-sm flex-1">Job History</p>
          <Filter className="w-4.5 h-4.5 text-text-muted" />
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Filter Tabs */}
        <div className="flex gap-1 bg-white/40 p-1 rounded-xl border border-border">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`flex-1 py-2.5 rounded-lg text-xs font-semibold transition-all ${
                filter === f.key
                  ? 'bg-gradient-to-r from-accent to-accent-dark text-white shadow-sm'
                  : 'text-text-secondary hover:bg-black/5'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Earnings Summary */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 bg-gradient-to-br from-primary to-primary-light text-white border-0"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-white/60 text-xs font-medium mb-1">Total Earnings</p>
              <p className="text-2xl font-bold">₹{totalEarnings.toLocaleString()}</p>
            </div>
            <div className="text-right">
              <p className="text-white/60 text-xs font-medium mb-1">Jobs Completed</p>
              <p className="text-2xl font-bold">{jobs.filter((j: any) => j.status === 'completed').length}</p>
            </div>
          </div>
        </motion.div>

        {/* Job List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="skeleton h-24 rounded-2xl" />
            ))}
          </div>
        ) : jobs.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-accent" />
            </div>
            <p className="font-semibold mb-1">No jobs found</p>
            <p className="text-text-muted text-sm">Your completed jobs will appear here.</p>
          </motion.div>
        ) : (
          <div className="space-y-3">
            {jobs.map((job: any, i: number) => (
              <motion.div
                key={job.id || i}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                className="glass-card p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-bold text-sm">{job.booking_number || `Job #${job.id}`}</p>
                    <p className="text-text-muted text-xs flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" />
                      {job.pickup_address?.slice(0, 35) || 'Kerala'}
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[job.status] || 'bg-gray-100 text-gray-700'}`}>
                    {job.status?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-border/50">
                  <div className="flex items-center gap-3 text-xs text-text-secondary">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {job.actual_hours || job.duration_hours || '—'}h
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {job.completed_at ? new Date(job.completed_at).toLocaleDateString() : '—'}
                    </span>
                  </div>
                  <span className="font-bold text-sm text-accent flex items-center gap-0.5">
                    <IndianRupee className="w-3.5 h-3.5" />
                    {(job.provider_payout || job.estimated_price || 0).toLocaleString()}
                  </span>
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
