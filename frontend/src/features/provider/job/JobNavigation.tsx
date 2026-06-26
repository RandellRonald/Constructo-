import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Navigation, MapPin, Phone, MessageCircle, Shield, Clock, CheckCircle2, ChevronRight, Compass, AlertTriangle, Loader2 } from 'lucide-react'
import { bookingAPI, providerAPI } from '../../../services/api'
import { useAuthStore } from '../../../stores/authStore'
import ChatInterface from '../../chat/ChatInterface'

declare const google: any;

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

  // Map references
  const mapContainerRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<any>(null)
  const providerMarker = useRef<any>(null)
  const destinationMarker = useRef<any>(null)
  const directionsRendererInstance = useRef<any>(null)
  
  const [mapLoaded, setMapLoaded] = useState(false)
  const [googleMapsError, setGoogleMapsError] = useState(false)

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

  // 3. Load Maps API
  useEffect(() => {
    if (isLoading || !booking) return

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
  }, [isLoading, booking])

  const initMap = () => {
    if (!mapContainerRef.current || !(window as any).google || !(window as any).google.maps || !booking) {
      setGoogleMapsError(true)
      setMapLoaded(true)
      return
    }

    try {
      const destLoc = {
        lat: booking.pickup_latitude,
        lng: booking.pickup_longitude
      }

      const mapOptions: any = {
        center: destLoc,
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

      // Destination Marker
      destinationMarker.current = new (window as any).google.maps.Marker({
        position: destLoc,
        map,
        title: "Pickup Location",
        icon: {
          path: (window as any).google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
          scale: 6,
          fillColor: "#10b981", // Green
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        }
      })

      // Route line
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
      console.error('Error initializing map:', e)
      setGoogleMapsError(true)
      setMapLoaded(true)
    }
  }

  // 4. Update route coordinates on maps
  useEffect(() => {
    if (!mapLoaded || googleMapsError || !mapInstance.current || !booking) return

    const maps = (window as any).google.maps
    const map = mapInstance.current
    const destPosition = { lat: booking.pickup_latitude, lng: booking.pickup_longitude }
    
    // Determine provider location
    const provLat = currentLat || booking.pickup_latitude + 0.03
    const provLng = currentLng || booking.pickup_longitude + 0.03
    const provPosition = { lat: provLat, lng: provLng }

    // Upsert provider marker
    if (!providerMarker.current) {
      providerMarker.current = new maps.Marker({
        position: provPosition,
        map,
        title: "Your Location",
        icon: {
          path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          rotation: heading || 0,
          fillColor: "#3b82f6", // Accent blue
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        }
      })
    } else {
      providerMarker.current.setPosition(provPosition)
      const icon = providerMarker.current.getIcon() as any
      if (icon) {
        icon.rotation = heading || 0
        providerMarker.current.setIcon(icon)
      }
    }

    // Directions service routing
    if (directionsRendererInstance.current) {
      const directionsService = new maps.DirectionsService()
      directionsService.route(
        {
          origin: provPosition,
          destination: destPosition,
          travelMode: maps.TravelMode.DRIVING
        },
        (result: any, status: any) => {
          if (status === 'OK' && directionsRendererInstance.current) {
            directionsRendererInstance.current.setDirections(result)
          }
        }
      )
    }
  }, [mapLoaded, googleMapsError, currentLat, currentLng, booking])

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
        {(!mapLoaded || googleMapsError) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none">
            <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:20px_20px]" />
            <div className="z-10 space-y-2">
              <Compass className="w-10 h-10 text-accent animate-spin mx-auto" />
              <p className="text-sm font-bold text-text-secondary">Simulated Sandbox Route Nav</p>
              <p className="text-[10px] text-text-muted max-w-[280px]">
                Navigating to: {booking?.pickup_address}<br />
                Coordinates: {booking?.pickup_latitude.toFixed(4)}, {booking?.pickup_longitude.toFixed(4)}
              </p>
            </div>
          </div>
        )}

        <div 
          ref={mapContainerRef} 
          className="w-full h-full"
          style={{ display: googleMapsError ? 'none' : 'block' }}
        />
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
