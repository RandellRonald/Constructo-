import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  ArrowLeft, Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight,
  IndianRupee, Calendar, Home, User, CreditCard, Clock,
  CheckCircle2
} from 'lucide-react'
import { providerAPI } from '../../../services/api'

export default function WalletPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [walletData, setWalletData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadWallet()
  }, [])

  const loadWallet = async () => {
    try {
      const res = await providerAPI.getWallet()
      if (res.data.success) {
        setWalletData(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load wallet:', err)
      // Fallback to empty state
      setWalletData({
        balance: 0,
        pending: 0,
        total_earned: 0,
        transactions: [],
      })
    } finally {
      setIsLoading(false)
    }
  }

  const balance = walletData?.balance || 0
  const pending = walletData?.pending || 0
  const totalEarned = walletData?.total_earned || 0
  const transactions = walletData?.transactions || []

  const transactionIcons: Record<string, typeof Wallet> = {
    earning: ArrowDownLeft,
    payout: ArrowUpRight,
    bonus: TrendingUp,
  }

  const transactionColors: Record<string, string> = {
    earning: 'bg-success/10 text-success',
    payout: 'bg-secondary/10 text-secondary',
    bonus: 'bg-warning/10 text-warning',
  }

  const bottomNav = [
    { icon: Home, label: 'Home', path: '/provider/dashboard' },
    { icon: Calendar, label: 'Jobs', path: '/provider/jobs' },
    { icon: Wallet, label: 'Wallet', path: '/provider/wallet' },
    { icon: User, label: 'Profile', path: '/provider/profile' },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 pt-20">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="skeleton h-40 rounded-2xl" />
          <div className="skeleton h-20 rounded-2xl" />
          <div className="skeleton h-64 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-24">
      {/* Header */}
      <div className="glass-nav sticky top-0 z-30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/provider/dashboard')} className="p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="font-bold text-sm flex-1">Wallet & Payouts</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-5">
        {/* Balance Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-primary-light p-6 text-white"
        >
          <div className="absolute top-0 right-0 w-40 h-40 rounded-full bg-accent/10 blur-3xl -mr-10 -mt-10" />
          <p className="text-white/60 text-xs font-medium mb-1 relative z-10">Available Balance</p>
          <p className="text-4xl font-black mb-4 relative z-10">₹{balance.toLocaleString()}</p>

          <div className="flex gap-4 relative z-10">
            <div>
              <p className="text-white/50 text-[10px] font-medium">Pending</p>
              <p className="text-lg font-bold">₹{pending.toLocaleString()}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-white/50 text-[10px] font-medium">Total Earned</p>
              <p className="text-lg font-bold">₹{totalEarned.toLocaleString()}</p>
            </div>
          </div>

          <button className="mt-5 w-full py-3 rounded-xl font-bold bg-white text-primary hover:bg-white/90 transition-colors flex items-center justify-center gap-2 relative z-10">
            <CreditCard className="w-4 h-4" /> Request Payout
          </button>
        </motion.div>

        {/* Quick Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-3 gap-3"
        >
          <div className="glass-card p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-success/10 flex items-center justify-center mx-auto mb-1.5">
              <CheckCircle2 className="w-4 h-4 text-success" />
            </div>
            <p className="text-lg font-bold">{transactions.filter((t: any) => t.type === 'earning').length}</p>
            <p className="text-text-muted text-[10px]">Earnings</p>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center mx-auto mb-1.5">
              <ArrowUpRight className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-lg font-bold">{transactions.filter((t: any) => t.type === 'payout').length}</p>
            <p className="text-text-muted text-[10px]">Payouts</p>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center mx-auto mb-1.5">
              <TrendingUp className="w-4 h-4 text-warning" />
            </div>
            <p className="text-lg font-bold">{transactions.filter((t: any) => t.type === 'bonus').length}</p>
            <p className="text-text-muted text-[10px]">Bonuses</p>
          </div>
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="font-bold text-sm mb-3">Recent Transactions</h3>
          {transactions.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-3">
                <Wallet className="w-7 h-7 text-accent" />
              </div>
              <p className="font-semibold text-sm mb-1">No transactions yet</p>
              <p className="text-text-muted text-xs">Your earnings and payouts will appear here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {transactions.map((t: any, i: number) => {
                const Icon = transactionIcons[t.type] || Wallet
                const colorClass = transactionColors[t.type] || 'bg-gray-100 text-gray-700'
                const isEarning = t.type === 'earning' || t.type === 'bonus'
                return (
                  <div key={t.id || i} className="glass-card p-4 flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colorClass}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{t.description || t.type}</p>
                      <p className="text-text-muted text-xs flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                      </p>
                    </div>
                    <span className={`font-bold text-sm ${isEarning ? 'text-success' : 'text-text-secondary'}`}>
                      {isEarning ? '+' : '-'}₹{Math.abs(t.amount || 0).toLocaleString()}
                    </span>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
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
