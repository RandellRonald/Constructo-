import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, Wallet, TrendingUp, ArrowDownLeft, ArrowUpRight,
  Calendar, Home, User, CreditCard, Clock,
  CheckCircle2, X, Edit2, AlertCircle, Building, Check
} from 'lucide-react'
import { providerAPI } from '../../../services/api'

export default function WalletPage() {
  const navigate = useNavigate()
  const location = useLocation()
  
  // Data states
  const [walletData, setWalletData] = useState<any>(null)
  const [bankDetails, setBankDetails] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Modal states
  const [showBankModal, setShowBankModal] = useState(false)
  const [showPayoutModal, setShowPayoutModal] = useState(false)
  const [submittingPayout, setSubmittingPayout] = useState(false)
  const [submittingBank, setSubmittingBank] = useState(false)

  // Bank Form States
  const [bankName, setBankName] = useState('')
  const [bankAccountName, setBankAccountName] = useState('')
  const [bankAccountNumber, setBankAccountNumber] = useState('')
  const [bankIfsc, setBankIfsc] = useState('')
  const [bankError, setBankError] = useState('')

  // Payout Form States
  const [payoutAmount, setPayoutAmount] = useState('')
  const [payoutNotes, setPayoutNotes] = useState('')
  const [payoutError, setPayoutError] = useState('')
  const [payoutSuccess, setPayoutSuccess] = useState(false)

  useEffect(() => {
    loadAllData()
  }, [])

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      await Promise.all([loadWallet(), loadBankDetails()])
    } catch (err) {
      console.error('Failed to load wallet data:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadWallet = async () => {
    try {
      const res = await providerAPI.getWallet()
      if (res.data.success) {
        setWalletData(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load wallet details:', err)
      setWalletData({
        balance: 0,
        total_earnings: 0,
        total_paid_out: 0,
        pending_payout: 0,
        recent_earnings: [],
        payouts: [],
      })
    }
  }

  const loadBankDetails = async () => {
    try {
      const res = await providerAPI.getBankDetails()
      if (res.data.success) {
        const data = res.data.data
        setBankDetails(data)
        if (data?.bank_name) {
          setBankName(data.bank_name)
          setBankAccountName(data.bank_account_name || '')
          setBankAccountNumber(data.bank_account_number || '')
          setBankIfsc(data.bank_ifsc || '')
        }
      }
    } catch (err) {
      console.error('Failed to load bank details:', err)
    }
  }

  const handleBankSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBankError('')
    if (!bankName || !bankAccountName || !bankAccountNumber || !bankIfsc) {
      setBankError('All bank details are required.')
      return
    }
    setSubmittingBank(true)
    try {
      const res = await providerAPI.updateBankDetails({
        bank_name: bankName,
        bank_account_name: bankAccountName,
        bank_account_number: bankAccountNumber,
        bank_ifsc: bankIfsc,
      })
      if (res.data.success) {
        setBankDetails(res.data.data)
        setShowBankModal(false)
      } else {
        setBankError(res.data.message || 'Failed to update bank details.')
      }
    } catch (err: any) {
      setBankError(err.response?.data?.detail || 'Failed to update bank details.')
    } finally {
      setSubmittingBank(false)
    }
  }

  const handlePayoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setPayoutError('')
    const amount = parseFloat(payoutAmount)
    if (isNaN(amount) || amount <= 0) {
      setPayoutError('Please enter a valid amount greater than zero.')
      return
    }
    if (amount > (walletData?.balance || 0)) {
      setPayoutError(`Amount exceeds available balance of ₹${(walletData?.balance || 0).toLocaleString()}`)
      return
    }
    setSubmittingPayout(true)
    try {
      const res = await providerAPI.requestPayout({
        amount: amount,
        notes: payoutNotes,
      })
      if (res.data.success) {
        setPayoutSuccess(true)
        setPayoutAmount('')
        setPayoutNotes('')
        await loadWallet()
        setTimeout(() => {
          setShowPayoutModal(false)
          setPayoutSuccess(false)
        }, 1500)
      } else {
        setPayoutError(res.data.message || 'Payout request failed.')
      }
    } catch (err: any) {
      setPayoutError(err.response?.data?.detail || 'Payout request failed.')
    } finally {
      setSubmittingPayout(false)
    }
  }

  const balance = walletData?.balance || 0
  const pending = walletData?.pending_payout || 0
  const totalEarned = walletData?.total_earnings || 0
  
  // Format transactions list: combining earnings and payouts for UI display
  const earningsList = walletData?.recent_earnings || []
  const payoutsList = walletData?.payouts || []

  const transactions = [
    ...earningsList.map((e: any) => ({ ...e, type: 'earning', date: e.created_at })),
    ...payoutsList.map((p: any) => ({ ...p, type: 'payout', date: p.created_at, description: `Payout to Bank (${p.status})` })),
  ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime())

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

  const hasBankDetails = bankDetails?.bank_account_number && bankDetails?.bank_name

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
              <p className="text-white/50 text-[10px] font-medium">Pending Payouts</p>
              <p className="text-lg font-bold">₹{pending.toLocaleString()}</p>
            </div>
            <div className="w-px bg-white/20" />
            <div>
              <p className="text-white/50 text-[10px] font-medium">Total Earned</p>
              <p className="text-lg font-bold">₹{totalEarned.toLocaleString()}</p>
            </div>
          </div>

          <button 
            onClick={() => {
              if (!hasBankDetails) {
                setShowBankModal(true)
              } else {
                setPayoutAmount(balance.toString())
                setShowPayoutModal(true)
              }
            }}
            className="mt-5 w-full py-3 rounded-xl font-bold bg-white text-primary hover:bg-white/90 transition-colors flex items-center justify-center gap-2 relative z-10"
          >
            <CreditCard className="w-4 h-4" /> 
            {!hasBankDetails ? "Set Up Bank details to Withdraw" : "Withdraw Earnings"}
          </button>
        </motion.div>

        {/* Bank details info card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="glass-card p-4 flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[10px] text-text-muted">Settlement Bank Account</p>
              {hasBankDetails ? (
                <div>
                  <p className="text-xs font-bold">{bankDetails.bank_name}</p>
                  <p className="text-[10px] text-text-secondary">
                    {bankDetails.bank_account_name} • •••• {bankDetails.bank_account_number.slice(-4)}
                  </p>
                </div>
              ) : (
                <p className="text-xs font-semibold text-danger">No bank account set up yet</p>
              )}
            </div>
          </div>
          <button 
            onClick={() => setShowBankModal(true)}
            className="p-2 rounded-lg bg-black/5 hover:bg-black/10 text-text-secondary transition-colors"
          >
            <Edit2 className="w-4 h-4" />
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
            <p className="text-lg font-bold">{earningsList.length}</p>
            <p className="text-text-muted text-[10px]">Earnings</p>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-secondary/10 flex items-center justify-center mx-auto mb-1.5">
              <ArrowUpRight className="w-4 h-4 text-secondary" />
            </div>
            <p className="text-lg font-bold">{payoutsList.length}</p>
            <p className="text-text-muted text-[10px]">Payouts</p>
          </div>
          <div className="glass-card p-3 text-center">
            <div className="w-8 h-8 rounded-lg bg-warning/10 flex items-center justify-center mx-auto mb-1.5">
              <TrendingUp className="w-4 h-4 text-warning" />
            </div>
            <p className="text-lg font-bold">{earningsList.filter((e: any) => e.type === 'bonus').length}</p>
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
                        {t.date ? new Date(t.date).toLocaleDateString() : '—'}
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

      {/* ─── Bank details Setup Modal ─── */}
      <AnimatePresence>
        {showBankModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowBankModal(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 relative z-10 text-text max-h-[90vh] overflow-y-auto"
            >
              <button 
                onClick={() => setShowBankModal(false)} 
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/5"
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="font-bold text-base mb-1">Configure Bank Account</h3>
              <p className="text-xs text-text-muted mb-4">Enter bank details where earnings withdrawals should be transferred.</p>

              <form onSubmit={handleBankSubmit} className="space-y-4">
                {bankError && (
                  <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{bankError}</span>
                  </div>
                )}
                
                <div>
                  <label className="block text-xs font-bold mb-1">Bank Name</label>
                  <input 
                    type="text" 
                    placeholder="e.g. State Bank of India"
                    value={bankName}
                    onChange={e => setBankName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white/60 border border-border focus:border-accent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Account Holder Name</label>
                  <input 
                    type="text" 
                    placeholder="Account owner full name"
                    value={bankAccountName}
                    onChange={e => setBankAccountName(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white/60 border border-border focus:border-accent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">Account Number</label>
                  <input 
                    type="text" 
                    placeholder="Enter bank account number"
                    value={bankAccountNumber}
                    onChange={e => setBankAccountNumber(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white/60 border border-border focus:border-accent outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1">IFSC Code</label>
                  <input 
                    type="text" 
                    placeholder="e.g. SBIN0001234"
                    value={bankIfsc}
                    onChange={e => setBankIfsc(e.target.value.toUpperCase())}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-white/60 border border-border focus:border-accent outline-none"
                    required
                  />
                </div>

                <button 
                  type="submit" 
                  disabled={submittingBank}
                  className="w-full py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-bold transition-all text-sm mt-4 flex justify-center items-center"
                >
                  {submittingBank ? (
                    <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : "Save Bank Settings"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ─── Payout Request Modal ─── */}
      <AnimatePresence>
        {showPayoutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowPayoutModal(false)} />
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="glass-card w-full max-w-md p-6 relative z-10 text-text"
            >
              <button 
                onClick={() => setShowPayoutModal(false)} 
                className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-black/5"
                disabled={submittingPayout}
              >
                <X className="w-5 h-5" />
              </button>
              
              <h3 className="font-bold text-base mb-1">Request Earnings Withdrawal</h3>
              <p className="text-xs text-text-muted mb-4">Funds will be deposited to: <b>{bankDetails?.bank_name}</b></p>

              {payoutSuccess ? (
                <div className="py-8 text-center flex flex-col items-center">
                  <div className="w-12 h-12 rounded-full bg-success/20 flex items-center justify-center text-success mb-3 animate-bounce">
                    <Check className="w-6 h-6" />
                  </div>
                  <p className="font-bold text-sm">Payout Requested!</p>
                  <p className="text-xs text-text-muted">Settlement is being processed.</p>
                </div>
              ) : (
                <form onSubmit={handlePayoutSubmit} className="space-y-4">
                  {payoutError && (
                    <div className="p-3 rounded-lg bg-danger/10 border border-danger/20 text-danger text-xs flex gap-2">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{payoutError}</span>
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-xs font-bold mb-1">Withdrawal Amount (₹)</label>
                    <input 
                      type="number" 
                      max={balance}
                      min={1}
                      placeholder={`Max ₹${balance.toLocaleString()}`}
                      value={payoutAmount}
                      onChange={e => setPayoutAmount(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white/60 border border-border focus:border-accent outline-none font-bold"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold mb-1">Notes (Optional)</label>
                    <input 
                      type="text" 
                      placeholder="e.g. Weekly payout request"
                      value={payoutNotes}
                      onChange={e => setPayoutNotes(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg bg-white/60 border border-border focus:border-accent outline-none"
                    />
                  </div>

                  <button 
                    type="submit" 
                    disabled={submittingPayout || !payoutAmount}
                    className="w-full py-2.5 bg-accent hover:bg-accent-dark text-white rounded-xl font-bold transition-all text-sm mt-4 flex justify-center items-center"
                  >
                    {submittingPayout ? (
                      <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    ) : `Submit Withdrawal Request`}
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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

