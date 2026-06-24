import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Phone, MessageCircle, MapPin, Clock, Navigation, Shield, User, Star, Headphones } from 'lucide-react'
import { trackingAPI } from '../../../services/api'

export default function TrackingPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()
  const [trackingData, setTrackingData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (bookingId) loadTracking()
    // Poll every 15 seconds
    const interval = setInterval(() => { if (bookingId) loadTracking() }, 15000)
    return () => clearInterval(interval)
  }, [bookingId])

  const loadTracking = async () => {
    try {
      const res = await trackingAPI.getTracking(Number(bookingId))
      if (res.data.success) setTrackingData(res.data.data)
    } catch (err) {
      console.error('Tracking error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  const statusSteps = [
    { key: 'created', label: 'Booking Created', icon: Shield },
    { key: 'assigned', label: 'Provider Assigned', icon: User },
    { key: 'en_route', label: 'Provider En Route', icon: Navigation },
    { key: 'arrived', label: 'Provider Arrived', icon: MapPin },
    { key: 'verified', label: 'Verified', icon: Shield },
    { key: 'in_progress', label: 'Work In Progress', icon: Clock },
    { key: 'completed', label: 'Completed', icon: Star },
  ]

  const currentStatusIndex = statusSteps.findIndex(s => s.key === trackingData?.booking_status)

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 pt-20">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="skeleton h-64 rounded-2xl" />
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface pb-8">
      {/* Header */}
      <div className="glass-nav sticky top-0 z-30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/customer/dashboard')} className="p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-bold text-sm">Live Tracking</p>
            <p className="text-text-muted text-xs">Booking #{bookingId}</p>
          </div>
          <button className="p-2 rounded-xl hover:bg-black/5"><Headphones className="w-5 h-5 text-text-secondary" /></button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-6 space-y-4">
        {/* Map Placeholder */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="h-64 rounded-2xl bg-primary-light relative overflow-hidden">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white/60">
              <Navigation className="w-12 h-12 mx-auto mb-2 animate-pulse" />
              <p className="text-sm font-medium">Live Map</p>
              <p className="text-xs">Google Maps integration</p>
            </div>
          </div>
          {/* ETA Overlay */}
          <div className="absolute bottom-4 left-4 right-4 glass rounded-xl p-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-text-muted">Estimated Arrival</p>
              <p className="font-bold text-lg">12 min</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-text-muted">Distance</p>
              <p className="font-bold text-lg">3.2 km</p>
            </div>
          </div>
        </motion.div>

        {/* Provider Card */}
        {trackingData?.provider_location && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-xl">
                P
              </div>
              <div className="flex-1">
                <p className="font-bold">Provider Name</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                  <span className="text-sm font-medium">4.8</span>
                  <span className="text-text-muted text-xs">(127 reviews)</span>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white gradient-primary flex items-center justify-center gap-1.5">
                <Phone className="w-4 h-4" /> Call
              </button>
              <button className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-border hover:bg-black/5 flex items-center justify-center gap-1.5">
                <MessageCircle className="w-4 h-4" /> Chat
              </button>
            </div>
          </motion.div>
        )}

        {/* Verification Code */}
        {trackingData?.verification_code && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5 text-center border-2 border-secondary/20">
            <Shield className="w-8 h-8 text-secondary mx-auto mb-2" />
            <p className="text-sm text-text-secondary mb-1">Verification Code</p>
            <p className="text-3xl font-black tracking-[0.3em] text-secondary">{trackingData.verification_code}</p>
            <p className="text-xs text-text-muted mt-2">Share this code with the provider when they arrive</p>
          </motion.div>
        )}

        {/* Status Timeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h3 className="font-bold text-sm mb-4">Booking Status</h3>
          <div className="space-y-0">
            {statusSteps.map((step, i) => {
              const isCompleted = i <= currentStatusIndex
              const isCurrent = i === currentStatusIndex
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted ? 'gradient-primary' : isCurrent ? 'bg-secondary/20 border-2 border-secondary' : 'bg-gray-100'
                    }`}>
                      <step.icon className={`w-4 h-4 ${isCompleted ? 'text-white' : isCurrent ? 'text-secondary' : 'text-text-muted'}`} />
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={`w-0.5 h-6 my-1 ${isCompleted ? 'bg-secondary' : 'bg-border'}`} />
                    )}
                  </div>
                  <div className="pb-2">
                    <p className={`font-semibold text-sm ${isCompleted || isCurrent ? 'text-primary' : 'text-text-muted'}`}>{step.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Cancel Button */}
        <button className="w-full py-3 rounded-xl text-sm font-semibold text-danger border border-danger/20 hover:bg-danger/5 transition-all">
          Cancel Booking
        </button>
      </div>
    </div>
  )
}
