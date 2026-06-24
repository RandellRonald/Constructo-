import { useNavigate, useLocation } from 'react-router-dom'
import {
  Home, Calendar, Navigation, Bell, User, Wallet,
} from 'lucide-react'

type NavVariant = 'customer' | 'provider'

interface BottomNavProps {
  variant: NavVariant
}

const customerItems = [
  { icon: Home, label: 'Home', path: '/customer/dashboard' },
  { icon: Calendar, label: 'Bookings', path: '/customer/bookings' },
  { icon: Navigation, label: 'Track', path: '/customer/tracking' },
  { icon: Bell, label: 'Alerts', path: '/customer/notifications' },
  { icon: User, label: 'Profile', path: '/customer/profile' },
]

const providerItems = [
  { icon: Home, label: 'Home', path: '/provider/dashboard' },
  { icon: Calendar, label: 'Jobs', path: '/provider/jobs' },
  { icon: Wallet, label: 'Wallet', path: '/provider/wallet' },
  { icon: User, label: 'Profile', path: '/provider/profile' },
]

export default function BottomNav({ variant }: BottomNavProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const items = variant === 'customer' ? customerItems : providerItems
  const activeColor = variant === 'customer' ? 'text-secondary' : 'text-accent'

  return (
    <div className="fixed bottom-0 left-0 right-0 glass-nav border-t border-border px-4 py-2 z-30">
      <div className="max-w-lg mx-auto flex items-center justify-around">
        {items.map(item => (
          <button
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl transition-all ${
              location.pathname === item.path ? activeColor : 'text-text-muted hover:text-primary'
            }`}
          >
            <item.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
