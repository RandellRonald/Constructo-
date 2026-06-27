import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Navigation, MapPin, Phone, MessageCircle, Shield, Clock, CheckCircle2, ChevronRight, AlertTriangle, Loader2 } from 'lucide-react'
import MapView from '../../../components/maps/MapView'
import MapMarker from '../../../components/maps/MapMarker'
import MapRoute from '../../../components/maps/MapRoute'
import { bookingAPI, providerAPI } from '../../../services/api'
import { useAuthStore } from '../../../stores/authStore'
import ChatInterface from '../../chat/ChatInterface'

export default function JobNavigation() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()

  // State variables
  const [booking, setBooking] = useState<any>(null)
  const [jobState, setJobState] = useState<'assigned' | 'en_route' | 'arrived' | 'in_progress' | 'completed' | 'cancelled'>('assigned')
  const [verificationCode, setVerificationCode] = useState('')
  const [verifyError, setVerifyError] = useState('')
  const [showChat, setShowChat] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  // GPS coordinates
  const [currentLat, setCurrentLat] = useState<number | null>(null)
  const [currentLng, setCurrentLng] = useState<number | null>(null)
  const [heading, setHeading] = useState<number>(0)
  const [speed, setSpeed] = useState<number>(0)
  const [eta, setEta] = useState<number>(12)
  const [distance, setDistance] = useState<number>(5.2)

  // WebSocket reference
  const wsRef = useRef<WebSocket | null>(null)

  // 1. Fetch booking details
  useEffect(() => {
    if (id) {
      loadBooking()
    }
  }, [id])

  const loadBooking = async () => {
    try {
      const res = await bookingAPI.getBooking(Number(id))
      if (res.data.success) {
        const data = res.data.data
        setBooking(data)
        setJobState(data.status)
      }
    } catch (err) {
      console.error('Failed to load booking:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Geolocation Watch & Transmitter (Every 10 seconds)
  useEffect(() => {
    if (isLoading || !booking || !id || !user) return

    // Start WebSocket tracking session
    const baseWs = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    const wsUrl = `${baseWs}/ws/tracking/${id}`

    const connectWS = () => {
      const ws = new WebSocket(wsUrl)
      wsRef.current = ws

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          // Handle automatic status update (e.g. auto arrival)
          if (payload.booking_id === Number(id) && payload.booking_status) {
            setJobState(payload.booking_status)
            if (payload.duration_min !== undefined) setEta(payload.duration_min)
            if (payload.distance_km !== undefined) setDistance(payload.distance_km)
          }
        } catch (err) {
          console.error("Error reading WebSocket tracking message:", err)
        }
      }

      ws.onclose = () => {
        setTimeout(connectWS, 5000)
      }
    }

    connectWS()

    // Setup geolocation watch/interval
    let watchId: number
    const sendLocationUpdate = (latitude: number, longitude: number, currentSpeed: number, currentHeading: number) => {
      // 1. Send via WebSocket if open
      if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: "tracking_update",
          booking_id: Number(id),
          provider_id: user.id,
          latitude,
          longitude,
          speed: currentSpeed || 0,
          heading: currentHeading || 0,
          timestamp: new Date().toISOString()
        }))
      }

      // 2. Fallback: POST to API endpoint
      providerAPI.updateJobStatus(Number(id), {
        status: jobState, // sends current state
        latitude,
        longitude,
        speed: currentSpeed || 0,
        heading: currentHeading || 0
      }).catch(e => console.error("REST location update fallback error:", e))
    }

    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const lat = pos.coords.latitude
          const lng = pos.coords.longitude
          const sp = pos.coords.speed || 0
          const hd = pos.coords.heading || 0

          setCurrentLat(lat)
          setCurrentLng(lng)
          setSpeed(sp)
          setHeading(hd)

          sendLocationUpdate(lat, lng, sp, hd)
        },
        (err) => {
          console.error("GPS watchPosition error:", err)
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      )
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
      if (wsRef.current) wsRef.current.close()
    }
  }, [isLoading, booking, id, user, jobState])

  // Status transitions
  const handleStartTransit = async () => {
    try {
      const res = await providerAPI.updateJobStatus(Number(id), { status: 'en_route' })
      if (res.data.success) {
        setJobState('en_route')
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Transit start failed")
    }
  }

  const handleArrive = async () => {
    try {
      const res = await providerAPI.updateJobStatus(Number(id), { status: 'arrived' })
      if (res.data.success) {
        setJobState('arrived')
      }
    } catch (err: any) {
      alert(err.response?.data?.detail || "Arrival status update failed")
    }
  }

  const handleVerify = async () => {
    setVerifyError('')
    if (verificationCode.length !== 6) {
      setVerifyError('Please enter the 6-digit code')
      return
    }
    try {
      const res = await providerAPI.updateJobStatus(Number(id), {
        status: 'verified',
        verification_code: verificationCode
      })
      if (res.data.success) {
        // Automatically start work after verification
        const startRes = await providerAPI.updateJobStatus(Number(id), { status: 'in_progress' })
        if (startRes.data.success) {
          setJobState('in_progress')
        }
      }
    } catch (err: any) {
      setVerifyError(err.response?.data?.detail || "Verification code is incorrect")
    }
  }

  const handleComplete = () => {
    navigate(`/provider/job/${id}/complete`)
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-accent animate-spin" />
      </div>
    )
  }

  const destLat = booking?.pickup_latitude || 9.9816
  const destLng = booking?.pickup_longitude || 76.2999
  const provLat = currentLat || destLat + 0.03
  const provLng = currentLng || destLng + 0.03

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
            <p className="text-text-muted text-xs">#{booking?.booking_number}</p>
          </div>
        </div>
      </div>

      {/* Map View */}
      <div className="flex-1 bg-[#0f172a] relative overflow-hidden">
        <MapView lat={destLat} lng={destLng} zoom={14}>
          {/* Destination (Customer) Marker */}
          <MapMarker lat={destLat} lng={destLng} variant="destination" title="Pickup Location" />

          {/* Provider (Self) Marker */}
          <MapMarker lat={provLat} lng={provLng} heading={heading} variant="provider" title="Your Location" />

          {/* Route */}
          <MapRoute
            originLat={provLat}
            originLng={provLng}
            destLat={destLat}
            destLng={destLng}
            onRouteInfo={(distKm, durMin) => {
              setDistance(distKm)
              setEta(durMin)
            }}
          />
        </MapView>
      </div>

      {/* Bottom Panel */}
      <div className="bg-surface rounded-t-3xl shadow-[0_-8px_30px_rgba(0,0,0,0.12)] shrink-0 z-20 pb-8 relative border-t border-white/5">
        <div className="w-12 h-1.5 bg-border rounded-full mx-auto mt-3 mb-4" />

        <div className="px-6 space-y-5">
          {/* Customer Info */}
          <div className="flex items-center justify-between">
            <div>
              <p className="font-extrabold text-lg">{booking?.customer?.name || 'Rahul Menon'}</p>
              <p className="text-text-secondary text-xs flex items-center gap-1.5 leading-tight line-clamp-2 max-w-[280px]">
                <MapPin className="w-4 h-4 text-accent shrink-0" /> {booking?.pickup_address}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowChat(true)}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center text-text-secondary hover:bg-white/10 transition-colors bg-white/5"
              >
                <MessageCircle className="w-5 h-5 text-accent" />
              </button>
              <a
                href={`tel:${booking?.customer?.phone || '+919999999999'}`}
                className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent hover:bg-accent/20 transition-colors"
              >
                <Phone className="w-5 h-5" />
              </a>
            </div>
          </div>

          <div className="w-full h-px bg-white/5" />

          {/* Contextual Actions */}
          <AnimatePresence mode="wait">
            {jobState === 'assigned' && (
              <motion.div key="assigned" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <p className="text-xs text-text-muted mb-3 font-medium text-center">Tap start transit when you begin traveling to site location.</p>
                <button
                  onClick={handleStartTransit}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-accent to-accent-dark shadow-lg shadow-accent/20 flex items-center justify-center gap-2 text-base uppercase tracking-wider"
                >
                  Start Transit <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {jobState === 'en_route' && (
              <motion.div key="en_route" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Est. Arrival Time</p>
                    <p className="text-2xl font-black text-accent">{Math.round(eta)} min</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Distance</p>
                    <p className="text-xl font-bold text-text">{distance.toFixed(1)} km</p>
                  </div>
                </div>
                <button
                  onClick={handleArrive}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-accent to-accent-dark shadow-lg shadow-accent/20 flex items-center justify-center gap-2 text-base uppercase tracking-wider"
                >
                  I have arrived <ChevronRight className="w-5 h-5" />
                </button>
              </motion.div>
            )}

            {jobState === 'arrived' && (
              <motion.div key="arrived" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
                <div className="text-center mb-4 space-y-1">
                  <Shield className="w-9 h-9 text-secondary mx-auto" />
                  <p className="font-extrabold text-base text-text">Verify Booking PIN</p>
                  <p className="text-xs text-text-muted">Ask the customer for the 6-digit verification code to start work.</p>
                </div>

                <div className="flex justify-center gap-2 mb-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 6-digit PIN"
                    className="w-full max-w-[220px] text-center text-2xl font-bold tracking-[0.2em] py-3 rounded-xl bg-white/5 border border-white/10 focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-text transition-all"
                  />
                </div>
                {verifyError && (
                  <div className="text-danger text-xs text-center mb-2 flex items-center justify-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{verifyError}</span>
                  </div>
                )}

                <button
                  onClick={handleVerify}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-gradient-to-r from-secondary to-secondary-dark shadow-lg flex items-center justify-center text-base uppercase tracking-wider"
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
                    <p className="text-xs text-text-secondary">Customer Booked for {booking?.duration_hours} hours</p>
                  </div>
                </div>

                <button
                  onClick={handleComplete}
                  className="w-full py-4 rounded-2xl font-bold text-white bg-danger hover:opacity-90 shadow-lg flex items-center justify-center gap-2 text-base transition-all uppercase tracking-wider"
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
            otherPartyName={booking?.customer?.name || "Customer"}
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
