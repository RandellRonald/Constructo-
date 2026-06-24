import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, User, Mail, Phone, MapPin, CreditCard,
  Bell, Shield, ChevronRight, LogOut, Camera, Edit3,
  Home, Calendar, Navigation
} from 'lucide-react'
import { useAuthStore } from '../../../stores/authStore'

export default function ProfilePage() {
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
      subtitle: 'Update your personal details',
      color: 'bg-secondary/10 text-secondary',
      action: () => {},
    },
    {
      icon: MapPin,
      label: 'Saved Locations',
      subtitle: 'Manage your saved addresses',
      color: 'bg-accent/10 text-accent',
      action: () => {},
    },
    {
      icon: CreditCard,
      label: 'Payment History',
      subtitle: 'View all transactions',
      color: 'bg-success/10 text-success',
      action: () => {},
    },
    {
      icon: Bell,
      label: 'Notification Settings',
      subtitle: 'Manage your alerts',
      color: 'bg-warning/10 text-warning',
      action: () => navigate('/customer/notifications'),
    },
    {
      icon: Shield,
      label: 'Privacy & Security',
      subtitle: 'Password, data, and permissions',
      color: 'bg-violet-100 text-violet-600',
      action: () => {},
    },
  ]

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
              <div className="w-18 h-18 rounded-full gradient-primary flex items-center justify-center text-white text-2xl font-bold"
                   style={{ width: 72, height: 72 }}>
                {user?.profile_photo_url ? (
                  <img src={user.profile_photo_url} alt={user.name} className="w-full h-full rounded-full object-cover" />
                ) : (
                  user?.name?.[0] || 'U'
                )}
              </div>
              <button className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-secondary text-white flex items-center justify-center shadow-lg">
                <Camera className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-lg truncate">{user?.name || 'User'}</h2>
                <button className="p-1 rounded-lg hover:bg-black/5">
                  <Edit3 className="w-3.5 h-3.5 text-text-muted" />
                </button>
              </div>
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

          {/* Verification Badge */}
          {user?.is_phone_verified && (
            <div className="mt-4 flex items-center gap-2 px-3 py-2 rounded-xl bg-success/10 text-success">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-semibold">Phone Verified</span>
            </div>
          )}
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
