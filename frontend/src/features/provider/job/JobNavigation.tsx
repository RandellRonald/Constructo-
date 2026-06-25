import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Navigation, MapPin, Phone, MessageCircle, Shield, Clock, CheckCircle2, ChevronRight } from 'lucide-react'
import ChatInterface from '../../chat/ChatInterface'

export default function JobNavigation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [jobState, setJobState] = useState<'en_route' | 'arrived' | 'in_progress' | 'completing'>('en_route')
  const [verificationCode, setVerificationCode] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [showChat, setShowChat] = useState(false)

  // Mock Job Data
  const job = {
    id: 101,
    booking_number: 'CON-8F39A1',
    customer_name: 'Rajesh Kumar',
    pickup_address: 'Kaloor, Ernakulam, Kerala',
    service_name: 'Earthmoving & Excavation',
    duration_hours: 4,
  }

  const handleArrive = async () => {
    // try { await api.post(`/bookings/${id}/arrived`) } catch(e){}
    setJobState('arrived')
  }

  const handleVerify = async () => {
    setVerifyError('')
    if (verificationCode.length !== 6) {
      setVerifyError('Enter 6-digit code')
      return
    }
    // try { await api.post(`/bookings/${id}/verify`, { code: verificationCode }) } catch(e){}
    setJobState('in_progress')
  }

  const handleComplete = () => {
    navigate(`/provider/job/${id}/complete`)
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      {/* Header */}
      <div className="glass-nav sticky top-0 z-30 px-4 py-3 shrink-0">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/provider/dashboard')} className="p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-bold text-sm">Job Navigation</p>
            <p className="text-text-muted text-xs">#{job.booking_number}</p>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 bg-primary-light relative">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-white/60">
            <Navigation className="w-12 h-12 mx-auto mb-2" />
            <p className="text-sm font-medium">Google Maps Navigation</p>
          </div>
        </div>
      </div>

      {/* Bottom Panel */}
      <div className="bg-surface rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] shrink-0 z-20 pb-8 relative">
        <div className="w-12 h-1.5 bg-border rounded-full mx-auto mt-3 mb-4" />
        
        <div className="px-6 space-y-5">
          {/* Customer Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-bold text-lg">{job.customer_name}</p>
              <p className="text-text-secondary text-sm flex items-center gap-1">
                <MapPin className="w-4 h-4 text-accent" /> {job.pickup_address}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowChat(true)}
                className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-text-secondary hover:bg-black/5 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent hover:bg-accent/20 transition-colors">
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="w-full h-px bg-border" />

          {/* Contextual Actions */}
          <AnimatePresence mode="wait">
            {jobState === 'en_route' && (
              <motion.div key="en_route" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-xs text-text-muted">Est. Arrival Time</p>
                    <p className="text-2xl font-black text-primary">12 min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-text-muted">Distance</p>
                    <p className="text-xl font-bold text-primary">3.2 km</p>
                  </div>
                </div>
                <button 
                  onClick={handleArrive}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-accent to-accent-dark shadow-lg shadow-accent/20 flex items-center justify-center gap-2 text-base"
                >
                  I have arrived <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {jobState === 'arrived' && (
              <motion.div key="arrived" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="text-center mb-4">
                  <Shield className="w-10 h-10 text-accent mx-auto mb-2" />
                  <p className="font-bold text-base mb-1">Verify Booking</p>
                  <p className="text-xs text-text-secondary">Ask the customer for their 6-digit PIN to start the job.</p>
                </div>
                
                <div className="flex justify-center gap-2 mb-2">
                  <input 
                    type="text" 
                    maxLength={6} 
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit PIN"
                    className="w-full max-w-[200px] text-center text-2xl font-bold tracking-[0.2em] py-3 rounded-xl border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none transition-all"
                  />
                </div>
                {verifyError && <p className="text-danger text-xs text-center mb-2">{verifyError}</p>}
                
                <button 
                  onClick={handleVerify}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-accent to-accent-dark shadow-lg flex items-center justify-center text-base"
                >
                  Verify & Start Work
                </button>
              </motion.div>
            )}

            {jobState === 'in_progress' && (
              <motion.div key="in_progress" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex items-center gap-4 mb-5 p-4 rounded-2xl bg-secondary/10 border border-secondary/20">
                  <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center">
                    <Clock className="w-6 h-6 text-white animate-pulse" />
                  </div>
                  <div>
                    <p className="font-bold text-secondary text-base">Job In Progress</p>
                    <p className="text-xs text-text-secondary">Booked for {job.duration_hours} hours</p>
                  </div>
                </div>
                
                <button 
                  onClick={handleComplete}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-danger hover:bg-danger/90 shadow-lg flex items-center justify-center gap-2 text-base transition-colors"
                >
                  <CheckCircle2 className="w-5 h-5" /> End Job & Complete
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showChat && id && (
          <ChatInterface
            bookingId={Number(id)}
            otherPartyName={job.customer_name}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
