import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Phone, MessageCircle, MapPin, Clock, Navigation, Shield, User, Star, Headphones, Compass, Loader2 } from 'lucide-react'
import { trackingAPI } from '../../../services/api'
import ChatInterface from '../../chat/ChatInterface'

declare const google: any;

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

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const customerMarker = useRef<any>(null)
  const providerMarker = useRef<any>(null)
  const directionsRendererInstance = useRef<any>(null)
  
  const [mapLoaded, setMapLoaded] = useState(false)
  const [googleMapsError, setGoogleMapsError] = useState(false)

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
            if (payload.booking_status) {
              setTrackingData((prev: any) => prev ? { ...prev, booking_status: payload.booking_status } : null)
            }
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

  // 3. Load Google Maps SDK
  useEffect(() => {
    if (isLoading || !trackingData) return

    // If already loaded
    if ((window as any).google && (window as any).google.maps) {
      initMap()
      return
    }

    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''
    const scriptId = 'google-maps-script'
    let script = document.getElementById(scriptId) as HTMLScriptElement

    if (!script) {
      script = document.createElement('script')
      script.id = scriptId
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}`
      script.async = true
      script.defer = true
      
      script.onload = () => initMap()
      script.onerror = () => {
        setGoogleMapsError(true)
        setMapLoaded(true)
      }
      document.head.appendChild(script)
    } else {
      const interval = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          clearInterval(interval)
          initMap()
        }
      }, 300)
    }
  }, [isLoading, trackingData])

  const initMap = () => {
    if (!mapContainerRef.current || !(window as any).google || !(window as any).google.maps || !trackingData) {
      setGoogleMapsError(true)
      setMapLoaded(true)
      return
    }

    try {
      const custLoc = {
        lat: trackingData.customer_location.latitude,
        lng: trackingData.customer_location.longitude
      }

      const mapOptions: any = {
        center: custLoc,
        zoom: 14,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] }
        ],
        disableDefaultUI: true,
        zoomControl: false
      }

      const map = new (window as any).google.maps.Map(mapContainerRef.current, mapOptions)
      mapInstance.current = map

      // Add Customer Marker
      customerMarker.current = new (window as any).google.maps.Marker({
        position: custLoc,
        map,
        title: "Your Location",
        icon: {
          path: (window as any).google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: "#10b981", // Emerald Green
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        }
      })

      // Directions renderer
      directionsRendererInstance.current = new (window as any).google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      })

      setMapLoaded(true)
    } catch (e) {
      console.error('Error initializing tracking map:', e)
      setGoogleMapsError(true)
      setMapLoaded(true)
    }
  }

  // 4. Update provider marker and route when coordinates change
  useEffect(() => {
    if (!mapLoaded || googleMapsError || !mapInstance.current || !providerLoc || !trackingData) return

    const maps = (window as any).google.maps
    const map = mapInstance.current
    const provPosition = { lat: providerLoc.lat, lng: providerLoc.lng }
    const custPosition = {
      lat: trackingData.customer_location.latitude,
      lng: trackingData.customer_location.longitude
    }

    // Upsert Provider Marker
    if (!providerMarker.current) {
      providerMarker.current = new maps.Marker({
        position: provPosition,
        map,
        title: "Provider Location",
        icon: {
          path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          rotation: providerLoc.heading || 0,
          fillColor: "#3b82f6", // Accent Blue
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        }
      })
    } else {
      providerMarker.current.setPosition(provPosition)
      const icon = providerMarker.current.getIcon() as any
      if (icon) {
        icon.rotation = providerLoc.heading || 0
        providerMarker.current.setIcon(icon)
      }
    }

    // Render Route
    if (directionsRendererInstance.current) {
      const directionsService = new maps.DirectionsService()
      directionsService.route(
        {
          origin: provPosition,
          destination: custPosition,
          travelMode: maps.TravelMode.DRIVING
        },
        (result: any, status: any) => {
          if (status === 'OK' && directionsRendererInstance.current) {
            directionsRendererInstance.current.setDirections(result)
          }
        }
      )
    }
  }, [mapLoaded, googleMapsError, providerLoc, trackingData])

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
        {/* Interactive Map View */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="h-72 rounded-3xl bg-[#0f172a] relative overflow-hidden shadow-lg border border-white/10"
        >
          {/* Simulated loading or error state fallback */}
          {(!mapLoaded || googleMapsError) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
              <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:20px_20px]" />
              <div className="z-10 space-y-2">
                <Compass className="w-10 h-10 text-accent animate-spin mx-auto" />
                <p className="text-sm font-bold text-text-secondary">Simulated Sandbox Live Map</p>
                <p className="text-[10px] text-text-muted max-w-[280px]">
                  {providerLoc 
                    ? `Provider GPS updates active: (${providerLoc.lat.toFixed(4)}, ${providerLoc.lng.toFixed(4)})`
                    : "Awaiting provider coordinates feed..."
                  }
                </p>
              </div>
            </div>
          )}

          {/* Map canvas */}
          <div 
            ref={mapContainerRef} 
            className="w-full h-full" 
            style={{ display: googleMapsError ? 'none' : 'block' }}
          />

          {/* ETA Overlay (Premium float bar) */}
          <div className="absolute bottom-4 left-4 right-4 bg-[#1e293b]/90 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between shadow-xl">
            <div>
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Estimated Arrival</p>
              <p className="font-extrabold text-xl text-accent">
                {eta !== null ? `${Math.round(eta)} min` : trackingData?.booking_status === 'arrived' ? 'Arrived' : '12 min'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Distance Remaining</p>
              <p className="font-extrabold text-xl text-text">
                {distance !== null ? `${distance.toFixed(1)} km` : '3.2 km'}
              </p>
            </div>
          </div>
        </motion.div>

        {/* Provider Card */}
        {trackingData?.provider_location && (
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
