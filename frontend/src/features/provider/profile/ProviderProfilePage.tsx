import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, User, Mail, Phone, Star, MapPin,
  FileText, Shield, ChevronRight, LogOut, Camera, Edit3,
  Home, Calendar, Wallet, Wrench
} from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'

export default function ProviderProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)

  const handleLogout = () => {
    logout()
    navigate('/', { replace: true })
  }

  const menuItems = [
    {
      icon: User,
      label: 'Edit Profile',
      subtitle: 'Update business and personal details',
      color: 'bg-accent/10 text-accent',
      action: () => {},
    },
    {
      icon: Wrench,
      label: 'Service Areas',
      subtitle: 'Manage where you accept jobs',
      color: 'bg-secondary/10 text-secondary',
      action: () => {},
    },
    {
      icon: FileText,
      label: 'Documents',
      subtitle: 'License, insurance, and certifications',
      color: 'bg-warning/10 text-warning',
      action: () => {},
    },
    {
      icon: Star,
      label: 'My Reviews',
      subtitle: `${user?.average_rating || '—'} average rating`,
      color: 'bg-amber-100 text-amber-600',
      action: () => {},
    },
    {
      icon: Shield,
      label: 'Privacy & Security',
      subtitle: 'Password and account settings',
      color: 'bg-violet-100 text-violet-600',
      action: () => {},
    },
  ]

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
          <p className="font-bold text-sm flex-1">My Profile</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Profile Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card p-6"
        >
          <div className="flex items-center gap-4">
            <div className="relative">
              <div className="rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white text-2xl font-bold"
                   style={{ width: 72, height: 72 }}>
                {user?.profile_photo_url ? (
                  <img src={user.profile_photo_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  user?.business_name?.[0] || user?.name?.[0] || 'P'
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-accent text-white flex items-center justify-center shadow-lg">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg truncate">{user?.business_name || user?.name || 'Provider'}</h2>
                <button className="p-1 rounded-lg hover:bg-black/5">
                  <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                </button>
              </div>
              {user?.business_name && user?.name && (
                <p className="text-text-secondary text-sm">{user.name}</p>
              )}
              <div className="flex items-center gap-1.5 text-text-secondary text-sm mt-0.5">
                <Mail className="w-3.5 h-3.5" />
                <span className="truncate">{user?.email || 'email@example.com'}</span>
              </div>
              <div className="flex items-center gap-1.5 text-text-secondary text-sm mt-0.5">
                <Phone className="w-3.5 h-3.5" />
                <span>{user?.phone || '+91 XXXXX XXXXX'}</span>
              </div>
            </div>
          </div>

          {/* Rating & Stats */}
          <div className="mt-4 flex items-center gap-4 p-3 rounded-xl bg-accent/5 border border-accent/10">
            <div className="flex items-center gap-1.5">
              <Star className="w-5 h-5 text-warning fill-warning" />
              <span className="font-bold">{user?.average_rating || '—'}</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div>
              <span className="text-sm font-medium">{user?.total_reviews || 0}</span>
              <span className="text-text-muted text-xs ml-1">reviews</span>
            </div>
            <div className="w-px h-6 bg-border" />
            <div className="flex items-center gap-1 text-sm">
              <MapPin className="w-3.5 h-3.5 text-accent" />
              <span className="font-medium">{user?.district || 'Kerala'}</span>
            </div>
          </div>

          {/* Verification Status */}
          <div className="mt-3 flex gap-2">
            {user?.is_phone_verified && (
              <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-success/10 text-success">
                <Shield className="w-3.5 h-3.5" />
                <span className="text-xs font-semibold">Verified</span>
              </div>
            )}
            <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-secondary/10 text-secondary">
              <span className="text-xs font-semibold capitalize">{user?.status || 'Active'}</span>
            </div>
          </div>
        </motion.div>

        {/* Menu Items */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-0 overflow-hidden"
        >
          {menuItems.map((item, i) => (
            <button
              key={item.label}
              onClick={item.action}
              className={`w-full flex items-center gap-3 p-4 hover:bg-black/5 transition-colors text-left ${
                i < menuItems.length - 1 ? 'border-b border-border/50' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.color}`}>
                <item.icon className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{item.label}</p>
                <p className="text-text-muted text-xs">{item.subtitle}</p>
              </div>
              <ChevronRight className="w-4 h-4 text-text-muted" />
            </button>
          ))}
        </motion.div>

        {/* Logout */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <button
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-danger font-semibold border border-danger/20 hover:bg-danger/5 transition-colors"
          >
            <LogOut className="w-4.5 h-4.5" /> Log Out
          </button>
        </motion.div>

        <p className="text-text-muted text-xs text-center pb-4">Constructo v1.0.0</p>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setShowLogoutConfirm(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative z-10 glass-card p-6 max-w-sm w-full text-center"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7 text-danger" />
            </div>
            <h3 className="text-lg font-bold mb-1">Log Out?</h3>
            <p className="text-text-secondary text-sm mb-6">Are you sure you want to log out of your account?</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className="flex-1 py-3 rounded-xl font-semibold border border-border hover:bg-black/5 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-3 rounded-xl font-semibold text-white bg-danger hover:bg-danger/90 transition-colors"
              >
                Log Out
              </button>
            </div>
          </motion.div>
        </div>
      )}

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
