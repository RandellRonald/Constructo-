import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Calendar, CreditCard, ShieldCheck, LogOut, Search,
  Filter, Ban, CheckCircle, AlertTriangle, Briefcase, Plus,
  Edit2, Eye, RefreshCw, X, Check, Globe, BarChart2, Map, Clock, Activity
} from 'lucide-react'
import { adminAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

interface Stats {
  total_users: number
  total_bookings: number
  total_revenue: number
  active_providers: number
}

interface User {
  id: number
  name: string
  email: string
  phone: string
  role: string
  status: string
  business_name?: string
  district?: string
  average_rating?: number
  created_at: string
}

interface Booking {
  id: number
  booking_number: string
  customer_name: string
  provider_name?: string
  service_name: string
  status: string
  estimated_price: number
  final_amount?: number
  pickup_address: string
  created_at: string
}

interface Payout {
  id: number
  provider_id: number
  provider_name: string
  business_name?: string
  amount: number
  status: string
  requested_at: string
  notes?: string
}

interface ServiceCategory {
  id: number
  name: string
  slug: string
  description?: string
  icon?: string
  base_hourly_rate: number
  overtime_hourly_rate: number
  emergency_fee: number
  reservation_fee: number
  is_active: boolean
}

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { logout, user } = useAuthStore()
  const [activeTab, setActiveTab] = useState<'stats' | 'users' | 'bookings' | 'payouts' | 'services' | 'analytics' | 'tracking'>('stats')

  // Data states
  const [stats, setStats] = useState<Stats | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [payouts, setPayouts] = useState<Payout[]>([])
  const [services, setServices] = useState<ServiceCategory[]>([])
  const [analyticsData, setAnalyticsData] = useState<any>(null)
  const [liveTrackingData, setLiveTrackingData] = useState<any[]>([])

  // Filters & Loading
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  // Modals / Editors
  const [selectedPayout, setSelectedPayout] = useState<Payout | null>(null)
  const [bankRef, setBankRef] = useState('')
  const [adminNotes, setAdminNotes] = useState('')

  const [editingService, setEditingService] = useState<ServiceCategory | null>(null)
  const [showAddService, setShowAddService] = useState(false)
  const [serviceForm, setServiceForm] = useState({
    name: '',
    slug: '',
    description: '',
    icon: '',
    base_hourly_rate: 0,
    overtime_hourly_rate: 0,
    emergency_fee: 0,
    reservation_fee: 200,
    is_active: true,
  })

  useEffect(() => {
    fetchTabContent()
  }, [activeTab, roleFilter, statusFilter])

  const fetchTabContent = async () => {
    setLoading(true)
    try {
      if (activeTab === 'stats') {
        const res = await adminAPI.getDashboard()
        if (res.data.success) setStats(res.data.data)
      } else if (activeTab === 'users') {
        const params: any = {}
        if (roleFilter) params.role = roleFilter
        if (statusFilter) params.status = statusFilter
        if (searchTerm) params.search = searchTerm
        const res = await adminAPI.getUsers(params)
        if (res.data.success) setUsers(res.data.data.users)
      } else if (activeTab === 'bookings') {
        const params: any = {}
        if (searchTerm) params.search = searchTerm
        const res = await adminAPI.getBookings(params)
        if (res.data.success) setBookings(res.data.data.bookings)
      } else if (activeTab === 'payouts') {
        const res = await adminAPI.getPayouts()
        if (res.data.success) setPayouts(res.data.data)
      } else if (activeTab === 'services') {
        const res = await adminAPI.getServices()
        if (res.data.success) setServices(res.data.data)
      } else if (activeTab === 'analytics') {
        const res = await adminAPI.getAnalytics()
        if (res.data.success) setAnalyticsData(res.data.data)
      } else if (activeTab === 'tracking') {
        const res = await adminAPI.getLiveTracking()
        if (res.data.success) setLiveTrackingData(res.data.data)
      }
    } catch (err) {
      console.error('Failed to fetch data:', err)
    } finally {
      setLoading(false)
    }
  };

  // Live tracking poll & movement simulation
  useEffect(() => {
    if (activeTab !== 'tracking') return

    // Fetch initial
    fetchTabContent()

    // Poll every 10s
    const pollInterval = setInterval(() => {
      adminAPI.getLiveTracking().then((res) => {
        if (res.data.success) setLiveTrackingData(res.data.data)
      })
    }, 10000)

    // Simulate provider drifts toward customer every 1.5 seconds
    const driftInterval = setInterval(() => {
      setLiveTrackingData((prevJobs) =>
        prevJobs.map((job) => {
          if (!job.provider_latitude || !job.provider_longitude) return job
          const destLat = job.pickup_latitude
          const destLng = job.pickup_longitude
          const currLat = job.provider_latitude
          const currLng = job.provider_longitude

          // Move 3% closer each drift tick
          const diffLat = destLat - currLat
          const diffLng = destLng - currLng
          
          if (Math.abs(diffLat) < 0.0001 && Math.abs(diffLng) < 0.0001) return job

          return {
            ...job,
            provider_latitude: currLat + diffLat * 0.03,
            provider_longitude: currLng + diffLng * 0.03,
          }
        })
      )
    }, 1500)

    return () => {
      clearInterval(pollInterval)
      clearInterval(driftInterval)
    }
  }, [activeTab])

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    fetchTabContent()
  }

  // Actions
  const handleToggleUserStatus = async (userId: number, currentStatus: string) => {
    const newStatus = currentStatus === 'suspended' ? 'active' : 'suspended'
    try {
      const res = await adminAPI.updateUserStatus(userId, newStatus)
      if (res.data.success) {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: newStatus } : u))
      }
    } catch (err) {
      alert('Failed to update user status')
    }
  }

  const handleProcessPayout = async (status: 'completed' | 'rejected') => {
    if (!selectedPayout) return
    try {
      const res = await adminAPI.approvePayout(selectedPayout.id, {
        status,
        bank_reference: bankRef,
        notes: adminNotes,
      })
      if (res.data.success) {
        setPayouts(prev => prev.filter(p => p.id !== selectedPayout.id))
        setSelectedPayout(null)
        setBankRef('')
        setAdminNotes('')
        fetchTabContent()
      }
    } catch (err) {
      alert('Failed to process payout')
    }
  }

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const res = await adminAPI.createService(serviceForm)
      if (res.data.success) {
        setShowAddService(false)
        setServiceForm({
          name: '',
          slug: '',
          description: '',
          icon: '',
          base_hourly_rate: 0,
          overtime_hourly_rate: 0,
          emergency_fee: 0,
          reservation_fee: 200,
          is_active: true,
        })
        fetchTabContent()
      }
    } catch (err) {
      alert('Failed to create service category')
    }
  }

  const handleUpdateService = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingService) return
    try {
      const res = await adminAPI.updateService(editingService.id, editingService as unknown as Record<string, unknown>)
      if (res.data.success) {
        setEditingService(null)
        fetchTabContent()
      }
    } catch (err) {
      alert('Failed to update service category')
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex">
      {/* Sidebar Navigation */}
      <aside className="w-64 bg-slate-900 border-r border-white/5 flex flex-col justify-between shrink-0">
        <div>
          {/* Brand header */}
          <div className="p-6 flex items-center gap-3 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-base block text-white leading-tight">Constructo</span>
              <span className="text-[10px] text-cyan-400 font-semibold tracking-wider uppercase">Portal Admin</span>
            </div>
          </div>

          {/* User profile */}
          <div className="p-4 bg-slate-900/50 m-3 rounded-2xl border border-white/5 flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm">
              A
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-xs truncate text-white">{user?.name || 'Administrator'}</p>
              <p className="text-[10px] text-slate-500 truncate">{user?.email || 'admin@constructo.in'}</p>
            </div>
          </div>

          {/* Menu items */}
          <nav className="p-4 space-y-1.5">
            <button
              onClick={() => setActiveTab('stats')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'stats' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Globe className="w-4 h-4" /> Platform Dashboard
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'users' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" /> Manage Users
            </button>
            <button
              onClick={() => setActiveTab('bookings')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'bookings' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" /> Service Bookings
            </button>
            <button
              onClick={() => setActiveTab('payouts')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'payouts' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <CreditCard className="w-4 h-4" /> Payout Requests
            </button>
            <button
              onClick={() => setActiveTab('services')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'services' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Briefcase className="w-4 h-4" /> Service Categories
            </button>
            <button
              onClick={() => setActiveTab('analytics')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'analytics' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <BarChart2 className="w-4 h-4" /> Operations Analytics
            </button>
            <button
              onClick={() => setActiveTab('tracking')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all ${
                activeTab === 'tracking' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
              }`}
            >
              <Map className="w-4 h-4" /> Live Tracking
            </button>
          </nav>
        </div>

        {/* Logout */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={() => {
              logout()
              navigate('/admin/login')
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <header className="h-16 border-b border-white/5 px-8 flex items-center justify-between bg-slate-900/40">
          <h2 className="text-lg font-bold tracking-tight text-white capitalize">
            {activeTab === 'stats' ? 'Platform Overview' : activeTab}
          </h2>
          <button
            onClick={fetchTabContent}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
            title="Refresh Data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
              <p className="text-slate-400 text-sm font-medium">Loading content...</p>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.25 }}
              >
                {/* ─── TAB: STATS ─── */}
                {activeTab === 'stats' && stats && (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                        <Users className="w-10 h-10 text-indigo-400 mb-4" />
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Users</p>
                        <h3 className="text-4xl font-extrabold text-white mt-2">{stats.total_users}</h3>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-bl-full" />
                      </div>
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                        <Calendar className="w-10 h-10 text-cyan-400 mb-4" />
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Bookings</p>
                        <h3 className="text-4xl font-extrabold text-white mt-2">{stats.total_bookings}</h3>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full" />
                      </div>
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                        <CreditCard className="w-10 h-10 text-emerald-400 mb-4" />
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Total Revenue</p>
                        <h3 className="text-4xl font-extrabold text-white mt-2">₹{stats.total_revenue.toLocaleString()}</h3>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full" />
                      </div>
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden">
                        <Briefcase className="w-10 h-10 text-violet-400 mb-4" />
                        <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Active Providers</p>
                        <h3 className="text-4xl font-extrabold text-white mt-2">{stats.active_providers}</h3>
                        <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-bl-full" />
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB: USERS ─── */}
                {activeTab === 'users' && (
                  <div className="space-y-6">
                    {/* Filters Bar */}
                    <form onSubmit={handleSearchSubmit} className="flex flex-wrap gap-4 items-center bg-slate-900 p-5 rounded-2xl border border-white/5">
                      <div className="flex-1 min-w-[240px] relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search users name, email, or phone..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:border-indigo-500 outline-none text-xs text-white"
                        />
                      </div>
                      <div className="flex gap-4">
                        <select
                          value={roleFilter}
                          onChange={(e) => setRoleFilter(e.target.value)}
                          className="px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 outline-none"
                        >
                          <option value="">All Roles</option>
                          <option value="customer">Customer</option>
                          <option value="provider">Provider</option>
                          <option value="admin">Admin</option>
                        </select>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value)}
                          className="px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 text-xs text-slate-300 outline-none"
                        >
                          <option value="">All Statuses</option>
                          <option value="active">Active</option>
                          <option value="suspended">Suspended</option>
                          <option value="pending_verification">Pending Verification</option>
                        </select>
                        <button
                          type="submit"
                          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold transition-all"
                        >
                          Filter
                        </button>
                      </div>
                    </form>

                    {/* Table */}
                    <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-900/60">
                              <th className="px-6 py-4">Name</th>
                              <th className="px-6 py-4">Contact Info</th>
                              <th className="px-6 py-4">Role</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Joined Date</th>
                              <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {users.map(u => (
                              <tr key={u.id} className="text-xs hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4">
                                  <div>
                                    <p className="font-semibold text-white">{u.name}</p>
                                    {u.business_name && (
                                      <p className="text-[10px] text-slate-500 mt-0.5">{u.business_name}</p>
                                    )}
                                  </div>
                                </td>
                                <td className="px-6 py-4">
                                  <p className="text-slate-300">{u.email}</p>
                                  <p className="text-slate-500 mt-0.5">{u.phone}</p>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    u.role === 'admin' ? 'bg-purple-500/10 text-purple-400' :
                                    u.role === 'provider' ? 'bg-cyan-500/10 text-cyan-400' : 'bg-slate-500/10 text-slate-400'
                                  }`}>
                                    {u.role}
                                  </span>
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    u.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' :
                                    u.status === 'suspended' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400'
                                  }`}>
                                    {u.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                  {new Date(u.created_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => handleToggleUserStatus(u.id, u.status)}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                                      u.status === 'suspended' ? 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25' : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
                                    }`}
                                  >
                                    {u.status === 'suspended' ? 'Activate' : 'Suspend'}
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB: BOOKINGS ─── */}
                {activeTab === 'bookings' && (
                  <div className="space-y-6">
                    {/* Search bar */}
                    <form onSubmit={handleSearchSubmit} className="flex gap-4 items-center bg-slate-900 p-5 rounded-2xl border border-white/5">
                      <div className="flex-1 relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Search bookings by number or address..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="w-full pl-11 pr-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 focus:border-indigo-500 outline-none text-xs text-white"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-semibold transition-all"
                      >
                        Search
                      </button>
                    </form>

                    <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-900/60">
                              <th className="px-6 py-4">Booking ID</th>
                              <th className="px-6 py-4">Customer</th>
                              <th className="px-6 py-4">Provider</th>
                              <th className="px-6 py-4">Service</th>
                              <th className="px-6 py-4">Amount</th>
                              <th className="px-6 py-4">Status</th>
                              <th className="px-6 py-4">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {bookings.map(b => (
                              <tr key={b.id} className="text-xs hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-bold text-white">
                                  {b.booking_number}
                                </td>
                                <td className="px-6 py-4 text-slate-300">
                                  {b.customer_name}
                                </td>
                                <td className="px-6 py-4">
                                  {b.provider_name ? (
                                    <span className="text-cyan-400 font-semibold">{b.provider_name}</span>
                                  ) : (
                                    <span className="text-slate-500 italic">Unassigned</span>
                                  )}
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                  {b.service_name}
                                </td>
                                <td className="px-6 py-4 text-white font-semibold">
                                  ₹{b.final_amount || b.estimated_price}
                                </td>
                                <td className="px-6 py-4">
                                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                    b.status === 'completed' ? 'bg-emerald-500/10 text-emerald-400' :
                                    b.status === 'cancelled' ? 'bg-red-500/10 text-red-400' :
                                    b.status === 'in_progress' ? 'bg-blue-500/10 text-blue-400' : 'bg-slate-500/10 text-slate-400'
                                  }`}>
                                    {b.status}
                                  </span>
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                  {new Date(b.created_at).toLocaleDateString()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB: PAYOUTS ─── */}
                {activeTab === 'payouts' && (
                  <div className="space-y-6">
                    <div className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-900/60">
                              <th className="px-6 py-4">Provider</th>
                              <th className="px-6 py-4">Business Name</th>
                              <th className="px-6 py-4">Requested Amount</th>
                              <th className="px-6 py-4">Notes</th>
                              <th className="px-6 py-4">Requested Date</th>
                              <th className="px-6 py-4 text-right">Action</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {payouts.map(p => (
                              <tr key={p.id} className="text-xs hover:bg-white/5 transition-colors">
                                <td className="px-6 py-4 font-semibold text-white">
                                  {p.provider_name}
                                </td>
                                <td className="px-6 py-4 text-slate-400">
                                  {p.business_name || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-emerald-400 font-bold">
                                  ₹{p.amount.toLocaleString()}
                                </td>
                                <td className="px-6 py-4 text-slate-300">
                                  {p.notes || 'N/A'}
                                </td>
                                <td className="px-6 py-4 text-slate-500">
                                  {new Date(p.requested_at).toLocaleDateString()}
                                </td>
                                <td className="px-6 py-4 text-right">
                                  <button
                                    onClick={() => setSelectedPayout(p)}
                                    className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-[10px] font-bold text-white transition-all"
                                  >
                                    Approve / Reject
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {payouts.length === 0 && (
                              <tr>
                                <td colSpan={6} className="text-center py-10 text-slate-500 font-medium">
                                  No pending payout requests
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Process Payout Modal */}
                    {selectedPayout && (
                      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative"
                        >
                          <button
                            onClick={() => setSelectedPayout(null)}
                            className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <h3 className="text-lg font-bold mb-1 text-white">Process Payout Request</h3>
                          <p className="text-xs text-slate-400 mb-6">
                            Requested by {selectedPayout.provider_name} for ₹{selectedPayout.amount}
                          </p>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold mb-1 text-slate-300">Bank Reference ID</label>
                              <input
                                type="text"
                                placeholder="Ref / UTR Number"
                                value={bankRef}
                                onChange={(e) => setBankRef(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1 text-slate-300">Admin Notes</label>
                              <textarea
                                rows={3}
                                placeholder="Processing notes..."
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                              />
                            </div>

                            <div className="flex gap-4 pt-4">
                              <button
                                onClick={() => handleProcessPayout('rejected')}
                                className="flex-1 py-3 rounded-xl bg-red-600/20 text-red-400 font-bold text-xs hover:bg-red-600/30 transition-all border border-red-500/20"
                              >
                                Reject Request
                              </button>
                              <button
                                onClick={() => handleProcessPayout('completed')}
                                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-xs hover:opacity-95 transition-all shadow-lg shadow-indigo-500/20"
                              >
                                Approve Payout
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB: SERVICES ─── */}
                {activeTab === 'services' && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-slate-900 p-5 rounded-2xl border border-white/5">
                      <p className="text-xs text-slate-400">Create or modify services provided on Constructo</p>
                      <button
                        onClick={() => setShowAddService(true)}
                        className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-xs font-bold transition-all text-white"
                      >
                        <Plus className="w-4 h-4" /> Add Category
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {services.map(c => (
                        <div key={c.id} className="bg-slate-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex flex-col justify-between">
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <span className="text-xl">{c.icon || '🛠️'}</span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${
                                c.is_active ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-500/10 text-slate-400'
                              }`}>
                                {c.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                            <h4 className="font-bold text-base text-white mb-1">{c.name}</h4>
                            <p className="text-slate-500 text-[10px] font-medium font-mono mb-3">Slug: {c.slug}</p>
                            <p className="text-slate-400 text-xs line-clamp-2 mb-6">{c.description || 'No description provided.'}</p>
                          </div>

                          <div className="border-t border-white/5 pt-4 space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Base Hourly</span>
                              <span className="text-white font-semibold">₹{c.base_hourly_rate}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-500">Reservation Fee</span>
                              <span className="text-white font-semibold">₹{c.reservation_fee}</span>
                            </div>
                            <button
                              onClick={() => setEditingService(c)}
                              className="w-full mt-4 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs font-semibold transition-all border border-white/5"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit Category
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Add Service Modal */}
                    {showAddService && (
                      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto"
                        >
                          <button
                            onClick={() => setShowAddService(false)}
                            className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <h3 className="text-lg font-bold mb-6 text-white">Create Service Category</h3>

                          <form onSubmit={handleCreateService} className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold mb-1.5 text-slate-300">Name</label>
                              <input
                                type="text"
                                required
                                value={serviceForm.name}
                                onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1.5 text-slate-300">Slug</label>
                              <input
                                type="text"
                                required
                                value={serviceForm.slug}
                                onChange={(e) => setServiceForm({ ...serviceForm, slug: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1.5 text-slate-300">Description</label>
                              <textarea
                                rows={2}
                                value={serviceForm.description}
                                onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold mb-1.5 text-slate-300">Base Hourly Rate (₹)</label>
                                <input
                                  type="number"
                                  required
                                  value={serviceForm.base_hourly_rate}
                                  onChange={(e) => setServiceForm({ ...serviceForm, base_hourly_rate: Number(e.target.value) })}
                                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold mb-1.5 text-slate-300">Reservation Fee (₹)</label>
                                <input
                                  type="number"
                                  required
                                  value={serviceForm.reservation_fee}
                                  onChange={(e) => setServiceForm({ ...serviceForm, reservation_fee: Number(e.target.value) })}
                                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-xs hover:opacity-95 transition-all shadow-lg shadow-indigo-500/20"
                            >
                              Create Category
                            </button>
                          </form>
                        </motion.div>
                      </div>
                    )}

                    {/* Edit Service Modal */}
                    {editingService && (
                      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <motion.div
                          initial={{ scale: 0.95, opacity: 0 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="bg-slate-900 border border-white/10 p-6 rounded-3xl w-full max-w-md shadow-2xl relative max-h-[90vh] overflow-y-auto"
                        >
                          <button
                            onClick={() => setEditingService(null)}
                            className="absolute top-4 right-4 p-2 rounded-lg bg-white/5 text-slate-400 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          <h3 className="text-lg font-bold mb-6 text-white">Edit Service Category</h3>

                          <form onSubmit={handleUpdateService} className="space-y-4">
                            <div>
                              <label className="block text-xs font-semibold mb-1.5 text-slate-300">Name</label>
                              <input
                                type="text"
                                required
                                value={editingService.name}
                                onChange={(e) => setEditingService({ ...editingService, name: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs font-semibold mb-1.5 text-slate-300">Description</label>
                              <textarea
                                rows={2}
                                value={editingService.description || ''}
                                onChange={(e) => setEditingService({ ...editingService, description: e.target.value })}
                                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <label className="block text-xs font-semibold mb-1.5 text-slate-300">Base Hourly Rate (₹)</label>
                                <input
                                  type="number"
                                  required
                                  value={editingService.base_hourly_rate}
                                  onChange={(e) => setEditingService({ ...editingService, base_hourly_rate: Number(e.target.value) })}
                                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold mb-1.5 text-slate-300">Reservation Fee (₹)</label>
                                <input
                                  type="number"
                                  required
                                  value={editingService.reservation_fee}
                                  onChange={(e) => setEditingService({ ...editingService, reservation_fee: Number(e.target.value) })}
                                  className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-white/10 outline-none text-xs text-white focus:border-indigo-500"
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-3 pt-2">
                              <input
                                type="checkbox"
                                id="is_active"
                                checked={editingService.is_active}
                                onChange={(e) => setEditingService({ ...editingService, is_active: e.target.checked })}
                                className="w-4 h-4 text-indigo-600 bg-slate-950 border-white/10 rounded focus:ring-indigo-500 focus:ring-2"
                              />
                              <label htmlFor="is_active" className="text-xs font-semibold text-slate-300">Category Active</label>
                            </div>

                            <button
                              type="submit"
                              className="w-full mt-4 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-bold text-xs hover:opacity-95 transition-all shadow-lg shadow-indigo-500/20"
                            >
                              Save Changes
                            </button>
                          </form>
                        </motion.div>
                      </div>
                    )}
                  </div>
                )}

                {/* ─── TAB: ANALYTICS ─── */}
                {activeTab === 'analytics' && analyticsData && (
                  <div className="space-y-8">
                    {/* Upper row: fulfilment cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                          <Activity className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg. Dispatch Time</p>
                          <h3 className="text-2xl font-bold text-white mt-1">{analyticsData.average_dispatch_minutes} minutes</h3>
                        </div>
                      </div>
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 relative overflow-hidden flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                          <Clock className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider">Avg. Completion Duration</p>
                          <h3 className="text-2xl font-bold text-white mt-1">{analyticsData.average_completion_hours} hours</h3>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                      {/* Revenue Trend SVG Line Chart */}
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                        <h3 className="text-sm font-bold text-white mb-6">Revenue Trend (Last 6 Months)</h3>
                        {analyticsData.revenue_trend?.length > 0 ? (
                          <div className="relative">
                            <svg viewBox="0 0 500 200" className="w-full h-auto overflow-visible">
                              <defs>
                                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.4" />
                                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                                </linearGradient>
                              </defs>
                              {/* Horizontal helper gridlines */}
                              {[0, 50, 100, 150].map((yVal) => (
                                <line key={yVal} x1="30" y1={yVal} x2="480" y2={yVal} stroke="rgba(255,255,255,0.05)" strokeDasharray="3,3" />
                              ))}
                              {(() => {
                                const revs = analyticsData.revenue_trend.map((d: any) => d.revenue)
                                const maxRev = Math.max(...revs, 1000)
                                const width = 430
                                const height = 140
                                const points = analyticsData.revenue_trend.map((d: any, i: number) => {
                                  const x = 40 + (i / (analyticsData.revenue_trend.length - 1 || 1)) * width
                                  const y = 160 - (d.revenue / maxRev) * height
                                  return { x, y, ...d }
                                })
                                const pathD = points.reduce((acc: string, p: any, i: number) => 
                                  i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, ''
                                )
                                const areaD = `${pathD} L ${points[points.length - 1].x} 170 L ${points[0].x} 170 Z`

                                return (
                                  <>
                                    <path d={areaD} fill="url(#chartGrad)" />
                                    <path d={pathD} fill="none" stroke="#6366f1" strokeWidth="3" />
                                    {points.map((p: any, i: number) => (
                                      <g key={i}>
                                        <circle cx={p.x} cy={p.y} r="5" fill="#06b6d4" stroke="#ffffff" strokeWidth="2" />
                                        {/* Label */}
                                        <text x={p.x} y={p.y - 10} fill="#94a3b8" fontSize="8" textAnchor="middle" fontWeight="bold">
                                          ₹{Math.round(p.revenue).toLocaleString()}
                                        </text>
                                        {/* X Axis Label */}
                                        <text x={p.x} y="185" fill="#64748b" fontSize="8" textAnchor="middle">
                                          {p.month}
                                        </text>
                                      </g>
                                    ))}
                                  </>
                                )
                              })()}
                            </svg>
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs text-center py-20">No revenue data available.</p>
                        )}
                      </div>

                      {/* Category Distribution SVG Bar Chart */}
                      <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                        <h3 className="text-sm font-bold text-white mb-6">Service Category Distribution</h3>
                        {analyticsData.category_distribution?.length > 0 ? (
                          <div className="space-y-4">
                            {(() => {
                              const counts = analyticsData.category_distribution.map((d: any) => d.bookings_count)
                              const maxCount = Math.max(...counts, 1)
                              return analyticsData.category_distribution.map((item: any, i: number) => {
                                const percentage = (item.bookings_count / maxCount) * 100
                                return (
                                  <div key={i} className="space-y-1">
                                    <div className="flex justify-between text-xs font-semibold">
                                      <span className="text-slate-300">{item.category}</span>
                                      <span className="text-cyan-400">{item.bookings_count} bookings</span>
                                    </div>
                                    <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                      <motion.div
                                        initial={{ width: 0 }}
                                        animate={{ width: `${percentage}%` }}
                                        transition={{ duration: 0.8, delay: i * 0.1 }}
                                        className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                                      />
                                    </div>
                                  </div>
                                )
                              })
                            })()}
                          </div>
                        ) : (
                          <p className="text-slate-500 text-xs text-center py-20">No booking distributions available.</p>
                        )}
                      </div>
                    </div>

                    {/* Top Providers list */}
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6">
                      <h3 className="text-sm font-bold text-white mb-6">Top Performing Providers</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 text-slate-400 uppercase tracking-wider font-semibold">
                              <th className="py-3 px-4">Provider</th>
                              <th className="py-3 px-4 text-center">Rating</th>
                              <th className="py-3 px-4">Reliability Score</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5">
                            {analyticsData.top_providers?.map((p: any) => (
                              <tr key={p.id} className="hover:bg-white/[0.01] transition-all">
                                <td className="py-3.5 px-4 font-bold text-slate-200">{p.name}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex items-center justify-center gap-1">
                                    <span className="font-bold text-warning">{p.average_rating || '5.0'}</span>
                                    <span className="text-warning">★</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4">
                                  <div className="flex items-center gap-3">
                                    <span className="font-semibold text-slate-300 min-w-[32px]">{Math.round(p.reliability_score || 100)}%</span>
                                    <div className="h-2 w-32 bg-slate-950 rounded-full overflow-hidden border border-white/5">
                                      <div
                                        style={{ width: `${p.reliability_score || 100}%` }}
                                        className={`h-full rounded-full ${
                                          (p.reliability_score || 100) >= 90
                                            ? 'bg-emerald-500'
                                            : (p.reliability_score || 100) >= 75
                                            ? 'bg-indigo-500'
                                            : 'bg-rose-500'
                                        }`}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {/* ─── TAB: LIVE TRACKING ─── */}
                {activeTab === 'tracking' && (
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left: Active Jobs Listing Panel */}
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 lg:col-span-1 flex flex-col max-h-[500px]">
                      <h3 className="text-sm font-bold text-white mb-4 shrink-0 flex items-center justify-between">
                        <span>Active Operations</span>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 font-semibold text-[10px] uppercase">
                          {liveTrackingData.length} Live
                        </span>
                      </h3>
                      
                      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                        {liveTrackingData.length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center py-20">
                            <Activity className="w-8 h-8 mb-2 text-indigo-500/30" />
                            <p className="font-semibold text-xs">No active service dispatches</p>
                          </div>
                        ) : (
                          liveTrackingData.map((job) => (
                            <div key={job.id} className="p-4 rounded-2xl bg-slate-950 border border-white/5 hover:border-indigo-500/30 transition-all text-xs space-y-2">
                              <div className="flex justify-between items-start">
                                <div>
                                  <p className="font-bold text-white">#{job.booking_number}</p>
                                  <p className="text-slate-400 font-medium text-[10px] mt-0.5">{job.service_name}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded font-bold text-[9px] uppercase ${
                                  job.status === 'in_progress' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-cyan-500/10 text-cyan-400'
                                }`}>
                                  {job.status}
                                </span>
                              </div>
                              <div className="border-t border-white/5 pt-2 space-y-1 text-slate-400 font-medium text-[10px]">
                                <p><span className="text-slate-500">Customer:</span> {job.customer_name}</p>
                                <p><span className="text-slate-500">Provider:</span> {job.provider_name} ({job.provider_phone || 'N/A'})</p>
                                <p className="truncate"><span className="text-slate-500">Location:</span> {job.pickup_address}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Right: Custom Radar Map (SVG visualization) */}
                    <div className="bg-slate-900 border border-white/5 rounded-3xl p-6 lg:col-span-2 flex flex-col h-[500px]">
                      <h3 className="text-sm font-bold text-white mb-2 shrink-0">Live Platform Dispatch Map</h3>
                      <p className="text-[10px] text-slate-500 font-medium mb-4 shrink-0">Visualizing active provider navigation to customers across Ernakulam district (Simulated movement live)</p>
                      
                      <div className="flex-1 bg-slate-950 rounded-2xl relative overflow-hidden border border-white/5 flex items-center justify-center">
                        {/* Futuristic scan grid */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:24px_24px]" />
                        <div className="absolute top-0 left-0 w-full h-0.5 bg-indigo-500/20 animate-pulse shadow-[0_0_15px_#6366f1]" style={{ animationDuration: '3s', animationIterationCount: 'infinite' }} />

                        <svg className="w-full h-full p-6 relative z-10 overflow-visible" viewBox="0 0 600 400">
                          {liveTrackingData.length === 0 ? (
                            <text x="300" y="200" textAnchor="middle" fill="#64748b" fontSize="12" fontWeight="bold">
                              No active GPS operations to track
                            </text>
                          ) : (
                            <>
                              {/* Draw Kerala district context lines (stylized circles and grid center) */}
                              <circle cx="300" cy="200" r="180" fill="none" stroke="rgba(99,102,241,0.03)" strokeWidth="1" />
                              <circle cx="300" cy="200" r="100" fill="none" stroke="rgba(99,102,241,0.03)" strokeWidth="1" />
                              <line x1="300" y1="20" x2="300" y2="380" stroke="rgba(99,102,241,0.03)" strokeWidth="1" />
                              <line x1="20" y1="200" x2="580" y2="200" stroke="rgba(99,102,241,0.03)" strokeWidth="1" />

                              {(() => {
                                // Latitude: 9.85 to 10.05, Longitude: 76.15 to 76.35
                                const minLat = 9.85
                                const maxLat = 10.05
                                const minLng = 76.15
                                const maxLng = 76.35

                                const mapCoords = (lat: number, lng: number) => {
                                  const y = 350 - ((lat - minLat) / (maxLat - minLat)) * 300
                                  const x = 50 + ((lng - minLng) / (maxLng - minLng)) * 500
                                  return { x, y }
                                }

                                return liveTrackingData.map((job) => {
                                  const cust = mapCoords(job.pickup_latitude, job.pickup_longitude)
                                  const prov = (job.provider_latitude && job.provider_longitude)
                                    ? mapCoords(job.provider_latitude, job.provider_longitude)
                                    : cust

                                  return (
                                    <g key={job.id}>
                                      {/* Connection Line */}
                                      {job.provider_latitude && (
                                        <line
                                          x1={prov.x}
                                          y1={prov.y}
                                          x2={cust.x}
                                          y2={cust.y}
                                          stroke="#6366f1"
                                          strokeWidth="2"
                                          strokeDasharray="4,4"
                                          className="stroke-[url(#dashGradient)]"
                                        />
                                      )}

                                      {/* Customer Dot (Cyan) */}
                                      <g>
                                        <circle cx={cust.x} cy={cust.y} r="8" fill="#06b6d4" fillOpacity="0.2" className="animate-ping" style={{ animationDuration: '2s' }} />
                                        <circle cx={cust.x} cy={cust.y} r="5" fill="#06b6d4" stroke="#ffffff" strokeWidth="1.5" />
                                        <text x={cust.x + 8} y={cust.y + 3} fill="#06b6d4" fontSize="8" fontWeight="bold">
                                          Cust #{job.booking_number.substring(4)}
                                        </text>
                                      </g>

                                      {/* Provider Dot (Indigo) if assigned */}
                                      {job.provider_latitude && (
                                        <g>
                                          <circle cx={prov.x} cy={prov.y} r="8" fill="#6366f1" fillOpacity="0.2" className="animate-ping" style={{ animationDuration: '3s' }} />
                                          <circle cx={prov.x} cy={prov.y} r="5" fill="#6366f1" stroke="#ffffff" strokeWidth="1.5" />
                                          <text x={prov.x - 8} y={prov.y - 8} fill="#818cf8" fontSize="8" fontWeight="bold" textAnchor="end">
                                            Prov {job.provider_name}
                                          </text>
                                        </g>
                                      )}
                                    </g>
                                  )
                                })
                              })()}
                            </>
                          )}
                        </svg>
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </main>
    </div>
  )
}
