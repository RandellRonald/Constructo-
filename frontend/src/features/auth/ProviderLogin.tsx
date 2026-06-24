import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Mail, Lock, Eye, EyeOff, ArrowLeft, Phone, Wrench } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authAPI } from '../../services/api'
import { useAuthStore } from '../../stores/authStore'

const loginSchema = z.object({
  identifier: z.string().min(1, 'Email or phone is required'),
  password: z.string().min(1, 'Password is required'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function ProviderLogin() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await authAPI.login({ ...data, device_name: 'web' })
      if (res.data.success) {
        const { user, access_token, refresh_token } = res.data.data
        if (user.role !== 'provider') {
          setError('This account is not registered as a provider.')
          return
        }
        setAuth(user, access_token, refresh_token)
        navigate('/provider/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary text-sm font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="glass-card p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg block leading-tight">Constructo</span>
              <span className="text-xs text-text-muted">Provider Login</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-1">Provider Sign In</h1>
          <p className="text-text-secondary text-sm mb-8">Manage your bookings and business</p>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm mb-6">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Email or Phone</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input {...register('identifier')} type="text" placeholder="Enter email or phone" className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none text-sm transition-all" />
              </div>
              {errors.identifier && <p className="text-danger text-xs mt-1">{errors.identifier.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Enter your password" className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/60 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none text-sm transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary">
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div className="flex justify-end">
              <Link to="/provider/forgot-password" className="text-sm text-accent-dark font-medium hover:underline">Forgot Password?</Link>
            </div>

            <button type="submit" disabled={isLoading} className="w-full py-3.5 rounded-xl font-semibold text-white bg-gradient-to-r from-accent to-accent-dark hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center">
              {isLoading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Sign In'}
            </button>
          </form>

          <div className="flex items-center gap-4 my-6">
            <div className="flex-1 h-px bg-border" />
            <span className="text-text-muted text-xs">or</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          <button className="w-full py-3 rounded-xl font-semibold border border-border hover:bg-black/5 transition-all flex items-center justify-center gap-2 text-sm">
            <Phone className="w-4 h-4" /> Login with OTP
          </button>

          <p className="text-center text-sm text-text-secondary mt-6">
            New provider? <Link to="/provider/register" className="text-accent-dark font-semibold hover:underline">Register Now</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
