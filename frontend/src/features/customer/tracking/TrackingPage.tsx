import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone, MessageCircle, MapPin, Clock, Navigation, Shield, User, Star, Headphones, Loader2 } from 'lucide-react'
import MapView from '../../../components/maps/MapView'
import MapMarker from '../../../components/maps/MapMarker'
import MapRoute from '../../../components/maps/MapRoute'
import { trackingAPI } from '../../../services/api'
import ChatInterface from '../../chat/ChatInterface'

export default function TrackingPage() {
  const { bookingId } = useParams()
  const navigate = useNavigate()

  // State variables
  const [trackingData, setTrackingData] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [showChat, setShowChat] = useState(false)
  const [providerLoc, setProviderLoc] = useState<{ lat: number; lng: number; heading?: number; speed?: number } | null>(null)
  const [eta, setEta] = useState<number | null>(null)
  const [distance, setDistance] = useState<number | null>(null)

  // 1. Initial tracking load
  useEffect(() => {
    if (bookingId) {
      loadTracking()
    }
  }, [bookingId])

  const loadTracking = async () => {
    try {
      const res = await trackingAPI.getTracking(Number(bookingId))
      if (res.data.success) {
        const data = res.data.data
        setTrackingData(data)
        if (data.provider_location) {
          setProviderLoc({
            lat: data.provider_location.latitude,
            lng: data.provider_location.longitude,
            heading: data.provider_location.heading,
            speed: data.provider_location.speed
          })
        }
      }
    } catch (err) {
      console.error('Tracking error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  // 2. Real-time WebSocket connection
  useEffect(() => {
    if (!bookingId) return

    const baseWs = import.meta.env.VITE_WS_URL || 'ws://localhost:8000'
    const wsUrl = `${baseWs}/ws/tracking/${bookingId}`
    let ws: WebSocket

    const connectWS = () => {
      ws = new WebSocket(wsUrl)

      ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data)
          if (payload.type === 'tracking_update') {
            setProviderLoc({
              lat: payload.latitude,
              lng: payload.longitude,
              heading: payload.heading,
              speed: payload.speed
            })
            if (payload.duration_min !== undefined) setEta(payload.duration_min)
            if (payload.distance_km !== undefined) setDistance(payload.distance_km)
            loadTracking()
          }
        } catch (err) {
          console.error('Error parsing tracking WS message:', err)
        }
      }

      ws.onclose = () => {
        setTimeout(connectWS, 4000) // reconnect
      }
    }

    connectWS()

    return () => {
      if (ws) ws.close()
    }
  }, [bookingId])

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

  const customerLat = trackingData?.customer_location?.latitude || 9.9816
  const customerLng = trackingData?.customer_location?.longitude || 76.2999

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
        {/* Interactive Map View */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="h-72 rounded-3xl bg-[#0f172a] relative overflow-hidden shadow-lg border border-white/10"
        >
          <MapView lat={customerLat} lng={customerLng} zoom={14}>
            {/* Customer Marker */}
            <MapMarker lat={customerLat} lng={customerLng} variant="customer" title="Your Location" />

            {/* Provider Marker */}
            {providerLoc && (
              <MapMarker
                lat={providerLoc.lat}
                lng={providerLoc.lng}
                heading={providerLoc.heading || 0}
                variant="provider"
                title="Provider Location"
              />
            )}

            {/* Route */}
            {providerLoc && (
              <MapRoute
                originLat={providerLoc.lat}
                originLng={providerLoc.lng}
                destLat={customerLat}
                destLng={customerLng}
                onRouteInfo={(distKm, durMin) => {
                  setDistance(distKm)
                  setEta(durMin)
                }}
              />
            )}
          </MapView>

          {/* ETA Overlay */}
          <div className="absolute bottom-4 left-4 right-4 bg-[#1e293b]/90 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between shadow-xl z-10">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Estimated Arrival</p>
              <p className="font-extrabold text-xl text-accent">
                {eta !== null ? `${Math.round(eta)} min` : trackingData?.booking_status === 'arrived' ? 'Arrived' : '—'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Distance Remaining</p>
              <p className="font-extrabold text-xl text-text">
                {distance !== null ? `${distance.toFixed(1)} km` : '—'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Provider Card */}
        {(trackingData?.provider_location || providerLoc || (trackingData?.booking_status && trackingData.booking_status !== 'created' && trackingData.booking_status !== 'searching')) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center text-white font-black text-xl">
                {trackingData.provider_name?.[0] || 'P'}
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-text">{trackingData.provider_name || 'Rajesh Kumar'}</p>
                <div className="flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-warning fill-warning" />
                  <span className="text-sm font-bold">{trackingData.provider_rating || '4.8'}</span>
                  <span className="text-text-muted text-xs">({trackingData.provider_reviews_count || '127'} reviews)</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <a
                href={`tel:${trackingData.provider_phone || '+919999999999'}`}
                className="flex-1 py-3 bg-gradient-to-r from-accent to-accent-dark hover:opacity-90 text-white rounded-xl font-bold text-sm shadow-lg shadow-accent/20 flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" /> Call Provider
              </a>
              <button
                onClick={() => setShowChat(true)}
                className="flex-1 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-text rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-colors"
              >
                <MessageCircle className="w-4 h-4 text-accent" /> Chat In-App
              </button>
            </div>
          </motion.div>
        )}

        {/* Verification Pin Code */}
        {trackingData?.verification_code && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="glass-card p-5 text-center border-2 border-secondary/20 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-24 h-24 bg-secondary/5 rounded-full blur-xl pointer-events-none" />
            <Shield className="w-8 h-8 text-secondary mx-auto mb-2" />
            <p className="text-xs text-text-muted font-bold uppercase tracking-wider mb-1">Secure Job Verification Code</p>
            <p className="text-4xl font-black tracking-[0.25em] text-secondary pl-[0.25em]">{trackingData.verification_code}</p>
            <p className="text-[10px] text-text-muted mt-2">Give this PIN code to the provider once they arrive at your site.</p>
          </motion.div>
        )}

        {/* Status Timeline */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
          <h3 className="font-extrabold text-sm mb-4">Site Progress Status</h3>
          <div className="space-y-0">
            {statusSteps.map((step, i) => {
              const isCompleted = i <= currentStatusIndex
              const isCurrent = i === currentStatusIndex
              return (
                <div key={step.key} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                      isCompleted ? 'bg-secondary' : isCurrent ? 'bg-secondary/20 border-2 border-secondary' : 'bg-white/5 border border-white/10'
                    }`}>
                      <step.icon className={`w-4 h-4 ${isCompleted ? 'text-white' : isCurrent ? 'text-secondary' : 'text-text-muted'}`} />
                    </div>
                    {i < statusSteps.length - 1 && (
                      <div className={`w-0.5 h-6 my-1 ${isCompleted ? 'bg-secondary' : 'bg-white/5'}`} />
                    )}
                  </div>
                  <div className="pb-2">
                    <p className={`font-bold text-sm ${isCompleted || isCurrent ? 'text-text' : 'text-text-muted'}`}>{step.label}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>

        {/* Support Call Back */}
        <button
          onClick={() => alert("Constructo Support helpline: 1800-456-7890")}
          className="w-full py-3 rounded-xl text-xs font-bold text-danger bg-danger/5 border border-danger/20 hover:bg-danger/10 transition-colors"
        >
          Cancel or Dispute Booking
        </button>
      </div>

      <AnimatePresence>
        {showChat && bookingId && (
          <ChatInterface
            bookingId={Number(bookingId)}
            otherPartyName="Provider"
            onClose={() => setShowChat(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
