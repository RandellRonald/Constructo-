import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Building2, User, Mail, Lock, Eye, EyeOff, ArrowLeft, Phone } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { authAPI } from '../../services/api'

const registerSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().regex(/^\+?[1-9]\d{9,14}$/, 'Invalid phone number'),
  email: z.string().email('Invalid email address'),
  password: z.string()
    .min(8, 'Minimum 8 characters')
    .regex(/[A-Z]/, 'Must contain uppercase')
    .regex(/[a-z]/, 'Must contain lowercase')
    .regex(/\d/, 'Must contain a number')
    .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Must contain special character'),
  confirm_password: z.string(),
  terms: z.boolean().refine(v => v, 'You must accept the terms'),
}).refine(data => data.password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
})

type RegisterForm = z.infer<typeof registerSchema>

export default function CustomerRegister() {
  const navigate = useNavigate()
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [step, setStep] = useState<'form' | 'otp'>('form')
  const [phone, setPhone] = useState('')
  const [otpCode, setOtpCode] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
  })

  const onSubmit = async (data: RegisterForm) => {
    setIsLoading(true)
    setError('')
    try {
      const res = await authAPI.register({
        name: data.name,
        email: data.email,
        phone: data.phone,
        password: data.password,
        confirm_password: data.confirm_password,
        role: 'customer',
      })
      if (res.data.success) {
        setPhone(data.phone)
        // Send OTP
        await authAPI.sendOTP({ phone: data.phone, purpose: 'registration' })
        setStep('otp')
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOTP = async () => {
    setIsLoading(true)
    setError('')
    try {
      await authAPI.verifyOTP({ phone, otp_code: otpCode, purpose: 'registration' })
      navigate('/customer/login')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Verification failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface p-4">
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
        </div>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
          <div className="glass-card p-8 text-center">
            <div className="w-16 h-16 rounded-2xl gradient-primary flex items-center justify-center mx-auto mb-6">
              <Phone className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Verify Your Phone</h2>
            <p className="text-text-secondary text-sm mb-8">We sent a 6-digit code to {phone}</p>

            {error && (
              <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm mb-6">{error}</div>
            )}

            <div className="flex justify-center gap-2 mb-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <input
                  key={i}
                  type="text"
                  maxLength={1}
                  value={otpCode[i] || ''}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '')
                    const newOtp = otpCode.split('')
                    newOtp[i] = val
                    setOtpCode(newOtp.join(''))
                    if (val && e.target.nextElementSibling) {
                      (e.target.nextElementSibling as HTMLInputElement).focus()
                    }
                  }}
                  className="w-12 h-14 text-center text-xl font-bold rounded-xl bg-white/60 border border-border focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none transition-all"
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOTP}
              disabled={otpCode.length !== 6 || isLoading}
              className="w-full py-3.5 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center"
            >
              {isLoading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Verify'}
            </button>

            <button className="mt-4 text-sm text-secondary font-medium hover:underline">Resend OTP</button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 py-12">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-secondary/5 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-md">
        <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary text-sm font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="glass-card p-8">
          <div className="flex items-center gap-2 mb-8">
            <div className="w-10 h-10 rounded-xl gradient-primary flex items-center justify-center">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg block leading-tight">Constructo</span>
              <span className="text-xs text-text-muted">Create Account</span>
            </div>
          </div>

          <h1 className="text-2xl font-bold mb-1">Create your account</h1>
          <p className="text-text-secondary text-sm mb-8">Start booking site services today</p>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm mb-6">
              {error}
            </motion.div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">Full Name</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input {...register('name')} placeholder="Enter your full name" className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 border border-border focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm transition-all" />
              </div>
              {errors.name && <p className="text-danger text-xs mt-1">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Phone Number</label>
              <div className="relative">
                <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input {...register('phone')} placeholder="+91 XXXXX XXXXX" className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 border border-border focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm transition-all" />
              </div>
              {errors.phone && <p className="text-danger text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input {...register('email')} type="email" placeholder="name@example.com" className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 border border-border focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm transition-all" />
              </div>
              {errors.email && <p className="text-danger text-xs mt-1">{errors.email.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input {...register('password')} type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" className="w-full pl-11 pr-11 py-3 rounded-xl bg-white/60 border border-border focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm transition-all" />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted hover:text-primary">
                  {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                </button>
              </div>
              {errors.password && <p className="text-danger text-xs mt-1">{errors.password.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input {...register('confirm_password')} type="password" placeholder="Confirm your password" className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 border border-border focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm transition-all" />
              </div>
              {errors.confirm_password && <p className="text-danger text-xs mt-1">{errors.confirm_password.message}</p>}
            </div>

            <label className="flex items-start gap-3 cursor-pointer">
              <input {...register('terms')} type="checkbox" className="mt-1 w-4 h-4 rounded border-border text-secondary focus:ring-secondary" />
              <span className="text-xs text-text-secondary">I agree to Constructo's <a href="#" className="text-secondary hover:underline">Terms of Service</a> and <a href="#" className="text-secondary hover:underline">Privacy Policy</a></span>
            </label>
            {errors.terms && <p className="text-danger text-xs">{errors.terms.message}</p>}

            <button type="submit" disabled={isLoading} className="w-full py-3.5 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2">
              {isLoading ? <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Create Account'}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            Already have an account? <Link to="/customer/login" className="text-secondary font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
