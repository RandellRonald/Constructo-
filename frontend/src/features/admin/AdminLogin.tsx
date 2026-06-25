import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, Mail, Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react'
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

export default function AdminLogin() {
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
      const res = await authAPI.login({ ...data, device_name: 'admin_web' })
      if (res.data.success) {
        const { user, access_token, refresh_token } = res.data.data
        if (user.role !== 'admin') {
          setError('Access denied: User is not an administrator.')
          return
        }
        setAuth(user, access_token, refresh_token)
        navigate('/admin/dashboard')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Login failed. Please verify your credentials.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 text-slate-100 p-4 relative overflow-hidden">
      {/* Premium Dark Gradient Background decor */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-[600px] h-[600px] rounded-full bg-indigo-500/10 blur-[120px]" />
        <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] rounded-full bg-cyan-500/10 blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative w-full max-w-md"
      >
        <Link to="/" className="inline-flex items-center gap-2 text-slate-400 hover:text-slate-100 text-sm font-medium mb-6 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="glass-dark border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-xl block leading-tight tracking-tight text-white">Constructo</span>
              <span className="text-xs text-cyan-400 font-medium tracking-widest uppercase">Admin Panel</span>
            </div>
          </div>

          <h1 className="text-3xl font-extrabold text-white mb-2 tracking-tight">Admin Sign In</h1>
          <p className="text-slate-400 text-sm mb-8">Access the platform management controls</p>

          {error && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm mb-6"
            >
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Identifier */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Username or Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  {...register('identifier')}
                  type="text"
                  placeholder="admin@constructo.in"
                  className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-sm text-white transition-all placeholder:text-slate-600"
                />
              </div>
              {errors.identifier && (
                <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.identifier.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3.5 rounded-2xl bg-white/5 border border-white/10 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 outline-none text-sm text-white transition-all placeholder:text-slate-600"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-red-400 text-xs mt-1.5 ml-1">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-cyan-500 text-white font-semibold text-sm hover:opacity-95 active:scale-[0.99] transition-all disabled:opacity-50 disabled:pointer-events-none shadow-lg shadow-indigo-500/20 mt-8"
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Authenticating...
                </span>
              ) : 'Sign In to Panel'}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  )
}
