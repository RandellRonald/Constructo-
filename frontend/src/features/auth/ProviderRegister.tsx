import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Eye, EyeOff, Wrench, CheckCircle2 } from 'lucide-react'
import { authAPI } from '../../services/api'

const services = [
  { id: 'earthmoving', name: 'Earthmoving & Excavation', icon: '🚜' },
  { id: 'crane', name: 'Crane Services', icon: '🏗️' },
  { id: 'transport', name: 'Transportation & Haulage', icon: '🚛' },
  { id: 'environmental', name: 'Environmental Services', icon: '🌿' },
  { id: 'waste', name: 'Waste Management', icon: '♻️' },
]

const districts = [
  'Ernakulam', 'Thrissur', 'Kottayam', 'Kozhikode', 'Trivandrum',
  'Alappuzha', 'Idukki', 'Kannur', 'Kasaragod', 'Kollam',
  'Malappuram', 'Palakkad', 'Pathanamthitta', 'Wayanad',
]

export default function ProviderRegister() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [formData, setFormData] = useState<Record<string, any>>({
    business_name: '', name: '', phone: '', email: '',
    service_categories: [] as string[], district: '',
    password: '', confirm_password: '', terms: false,
  })

  const totalSteps = 5
  const stepLabels = ['Business', 'Contact', 'Services', 'Location', 'Account']

  const updateField = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleNext = () => {
    if (currentStep < totalSteps - 1) setCurrentStep(currentStep + 1)
  }

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep(currentStep - 1)
  }

  const handleSubmit = async () => {
    if (formData.password !== formData.confirm_password) {
      setError('Passwords do not match')
      return
    }
    setIsLoading(true)
    setError('')
    try {
      await authAPI.register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
        confirm_password: formData.confirm_password,
        role: 'provider',
        business_name: formData.business_name,
        district: formData.district,
        service_categories: JSON.stringify(formData.service_categories),
      })
      await authAPI.sendOTP({ phone: formData.phone, purpose: 'registration' })
      navigate('/provider/login')
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface p-4 py-12">
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full bg-accent/5 blur-3xl" />
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative w-full max-w-lg">
        <Link to="/" className="inline-flex items-center gap-2 text-text-secondary hover:text-primary text-sm font-medium mb-6">
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>

        <div className="glass-card p-8">
          {/* Header */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center">
              <Wrench className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg block leading-tight">Constructo</span>
              <span className="text-xs text-text-muted">Provider Registration</span>
            </div>
          </div>

          {/* Progress */}
          <div className="flex items-center gap-1 mb-8">
            {stepLabels.map((label, i) => (
              <div key={label} className="flex-1">
                <div className={`h-1.5 rounded-full transition-all ${i <= currentStep ? 'bg-gradient-to-r from-accent to-accent-dark' : 'bg-border'}`} />
                <p className={`text-[10px] mt-1 text-center font-medium ${i <= currentStep ? 'text-accent-dark' : 'text-text-muted'}`}>{label}</p>
              </div>
            ))}
          </div>

          {error && (
            <div className="p-3 rounded-xl bg-danger/10 border border-danger/20 text-danger text-sm mb-6">{error}</div>
          )}

          {/* Steps */}
          <AnimatePresence mode="wait">
            <motion.div key={currentStep} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
              {currentStep === 0 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold mb-1">Business Information</h2>
                  <p className="text-text-secondary text-sm mb-4">Tell us about your business</p>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Business Name</label>
                    <input value={formData.business_name} onChange={e => updateField('business_name', e.target.value)} placeholder="Enter business name" className="w-full px-4 py-3 rounded-xl bg-white/60 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Owner Name</label>
                    <input value={formData.name} onChange={e => updateField('name', e.target.value)} placeholder="Full name of owner" className="w-full px-4 py-3 rounded-xl bg-white/60 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none text-sm" />
                  </div>
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold mb-1">Contact Information</h2>
                  <p className="text-text-secondary text-sm mb-4">How can we reach you?</p>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Phone Number</label>
                    <input value={formData.phone} onChange={e => updateField('phone', e.target.value)} placeholder="+91 XXXXX XXXXX" className="w-full px-4 py-3 rounded-xl bg-white/60 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none text-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Email</label>
                    <input value={formData.email} onChange={e => updateField('email', e.target.value)} type="email" placeholder="business@example.com" className="w-full px-4 py-3 rounded-xl bg-white/60 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none text-sm" />
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold mb-1">Service Categories</h2>
                  <p className="text-text-secondary text-sm mb-4">What services do you offer?</p>
                  <div className="space-y-2">
                    {services.map(s => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => {
                          const cats = formData.service_categories as string[]
                          updateField('service_categories', cats.includes(s.id) ? cats.filter((c: string) => c !== s.id) : [...cats, s.id])
                        }}
                        className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left ${
                          (formData.service_categories as string[]).includes(s.id)
                            ? 'border-accent bg-accent/5'
                            : 'border-border hover:border-accent/30'
                        }`}
                      >
                        <span className="text-2xl">{s.icon}</span>
                        <span className="font-medium text-sm flex-1">{s.name}</span>
                        {(formData.service_categories as string[]).includes(s.id) && (
                          <CheckCircle2 className="w-5 h-5 text-accent" />
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 3 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold mb-1">Service Location</h2>
                  <p className="text-text-secondary text-sm mb-4">Where do you operate?</p>
                  <div className="grid grid-cols-2 gap-2">
                    {districts.map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => updateField('district', d)}
                        className={`p-3 rounded-xl border-2 text-sm font-medium transition-all ${
                          formData.district === d ? 'border-accent bg-accent/5 text-accent-dark' : 'border-border hover:border-accent/30'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {currentStep === 4 && (
                <div className="space-y-4">
                  <h2 className="text-xl font-bold mb-1">Create Account</h2>
                  <p className="text-text-secondary text-sm mb-4">Set your password to complete registration</p>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Password</label>
                    <div className="relative">
                      <input value={formData.password} onChange={e => updateField('password', e.target.value)} type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" className="w-full px-4 pr-11 py-3 rounded-xl bg-white/60 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none text-sm" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1.5">Confirm Password</label>
                    <input value={formData.confirm_password} onChange={e => updateField('confirm_password', e.target.value)} type="password" placeholder="Confirm your password" className="w-full px-4 py-3 rounded-xl bg-white/60 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none text-sm" />
                  </div>
                  <label className="flex items-start gap-3 cursor-pointer">
                    <input checked={formData.terms} onChange={e => updateField('terms', e.target.checked)} type="checkbox" className="mt-1 w-4 h-4 rounded" />
                    <span className="text-xs text-text-secondary">I agree to Constructo's Terms and Privacy Policy</span>
                  </label>
                </div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Navigation */}
          <div className="flex items-center justify-between mt-8">
            <button
              onClick={handleBack}
              disabled={currentStep === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-medium text-text-secondary hover:bg-black/5 disabled:opacity-30 transition-all"
            >
              Back
            </button>

            {currentStep < totalSteps - 1 ? (
              <button onClick={handleNext} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-dark hover:opacity-90 transition-all flex items-center gap-2">
                Next <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button onClick={handleSubmit} disabled={isLoading} className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-accent to-accent-dark hover:opacity-90 transition-all disabled:opacity-50 flex items-center gap-2">
                {isLoading ? <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /> : 'Create Account'}
              </button>
            )}
          </div>

          <p className="text-center text-sm text-text-secondary mt-6">
            Already registered? <Link to="/provider/login" className="text-accent-dark font-semibold hover:underline">Sign In</Link>
          </p>
        </div>
      </motion.div>
    </div>
  )
}
