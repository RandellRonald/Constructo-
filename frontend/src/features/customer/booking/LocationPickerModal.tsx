import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { X, Search, MapPin, Loader2, Navigation } from 'lucide-react'
import { bookingAPI } from '../../../services/api'

declare const google: any;

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (lat: number, lng: number, address: string) => void
  initialLat?: number | null
  initialLng?: number | null
  initialAddress?: string
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
  initialAddress = ''
}: LocationPickerModalProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  
  // State variables
  const [lat, setLat] = useState<number>(initialLat || 9.9816) // Default Kochi
  const [lng, setLng] = useState<number>(initialLng || 76.2999)
  const [address, setAddress] = useState<string>(initialAddress)
  const [searchQuery, setSearchQuery] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [googleMapsError, setGoogleMapsError] = useState(false)

  // Map instance references
  const googleMapInstance = useRef<any>(null)
  const markerInstance = useRef<any>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Sync initial coordinates
  useEffect(() => {
    if (isOpen) {
      if (initialLat && initialLng) {
        setLat(initialLat)
        setLng(initialLng)
      }
      if (initialAddress) {
        setAddress(initialAddress)
      } else if (initialLat && initialLng) {
        performReverseGeocode(initialLat, initialLng)
      }
    }
  }, [isOpen, initialLat, initialLng])

  // Load Google Maps script and init
  useEffect(() => {
    if (!isOpen) return

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
      script.src = `https://maps.googleapis.com/maps/api/js?key=${key}&libraries=places`
      script.async = true
      script.defer = true
      
      script.onload = () => {
        initMap()
      }
      script.onerror = () => {
        setGoogleMapsError(true)
        setMapLoaded(true) // Load simulated fallbacks
      }
      document.head.appendChild(script)
    } else {
      // Script exists but maybe loading
      const interval = setInterval(() => {
        if ((window as any).google && (window as any).google.maps) {
          clearInterval(interval)
          initMap()
        }
      }, 300)
    }
  }, [isOpen])

  const initMap = () => {
    if (!mapRef.current || !(window as any).google || !(window as any).google.maps) {
      setGoogleMapsError(true)
      setMapLoaded(true)
      return
    }

    try {
      const position = { lat, lng }
      const mapOptions: any = {
        center: position,
        zoom: 16,
        styles: [
          { elementType: 'geometry', stylers: [{ color: '#1e293b' }] },
          { elementType: 'labels.text.stroke', stylers: [{ color: '#1e293b' }] },
          { elementType: 'labels.text.fill', stylers: [{ color: '#94a3b8' }] },
          { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0f172a' }] },
          { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#334155' }] }
        ],
        disableDefaultUI: true,
        zoomControl: true,
      }

      const map = new (window as any).google.maps.Map(mapRef.current, mapOptions)
      googleMapInstance.current = map
      setMapLoaded(true)

      // Listen for drag end to select new center coordinates (Uber-Style Fixed Pin)
      map.addListener('dragend', () => {
        const center = map.getCenter()
        if (center) {
          const newLat = center.lat()
          const newLng = center.lng()
          setLat(newLat)
          setLng(newLng)
          performReverseGeocode(newLat, newLng)
        }
      })

      // Setup Places Autocomplete
      if (searchInputRef.current) {
        const autocomplete = new (window as any).google.maps.places.Autocomplete(searchInputRef.current, {
          types: ['geocode', 'establishment'],
          componentRestrictions: { country: 'in' } // Focus on India/Kerala
        })

        autocomplete.addListener('place_changed', () => {
          const place = autocomplete.getPlace()
          if (place.geometry && place.geometry.location) {
            const loc = place.geometry.location
            const newLat = loc.lat()
            const newLng = loc.lng()
            
            map.setCenter(loc)
            map.setZoom(16)
            setLat(newLat)
            setLng(newLng)
            setAddress(place.formatted_address || '')
            setSearchQuery(place.formatted_address || '')
          }
        })
      }
    } catch (e) {
      console.error('Error initializing map:', e)
      setGoogleMapsError(true)
      setMapLoaded(true)
    }
  }

  const performReverseGeocode = async (latitude: number, longitude: number) => {
    setIsGeocoding(true)
    try {
      const res = await bookingAPI.reverseGeocode(latitude, longitude)
      if (res.data.success) {
        setAddress(res.data.data.address)
      }
    } catch (err) {
      console.error('Reverse geocode error:', err)
      setAddress(`Site Coordinate (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`)
    } finally {
      setIsGeocoding(false)
    }
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser")
      return
    }
    
    setIsGeocoding(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const currentLat = pos.coords.latitude
        const currentLng = pos.coords.longitude
        
        setLat(currentLat)
        setLng(currentLng)
        
        if (googleMapInstance.current) {
          googleMapInstance.current.setCenter({ lat: currentLat, lng: currentLng })
          googleMapInstance.current.setZoom(16)
        }
        performReverseGeocode(currentLat, currentLng)
      },
      (err) => {
        console.error("GPS error:", err)
        alert("Failed to retrieve your current location. Please verify browser permissions.")
        setIsGeocoding(false)
      }
    )
  }

  const handleManualSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery) return

    setIsGeocoding(true)
    try {
      if ((window as any).google && (window as any).google.maps) {
        const geocoder = new (window as any).google.maps.Geocoder()
        geocoder.geocode({ address: searchQuery }, (results: any, status: any) => {
          if (status === 'OK' && results && results[0]) {
            const loc = results[0].geometry.location
            setLat(loc.lat())
            setLng(loc.lng())
            setAddress(results[0].formatted_address)
            if (googleMapInstance.current) {
              googleMapInstance.current.setCenter(loc)
              googleMapInstance.current.setZoom(16)
            }
          } else {
            alert('Location not found. Try search details.')
          }
          setIsGeocoding(false)
        })
      } else {
        // Simple mock search if offline/no key
        alert('Maps script is not loaded yet or offline. Standard coordinates used.')
        setIsGeocoding(false)
      }
    } catch (err) {
      console.error('Search error:', err)
      setIsGeocoding(false)
    }
  }

  const handleConfirm = () => {
    onConfirm(lat, lng, address || `MG Road, Kochi (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 30, scale: 0.95 }}
        className="glass-card w-full max-w-lg h-[90vh] max-h-[700px] flex flex-col relative overflow-hidden"
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between shrink-0">
          <h3 className="font-extrabold text-text">Select Pickup Location</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
            <X className="w-5 h-5 text-text-muted hover:text-primary" />
          </button>
        </div>

        {/* Map Body Section */}
        <div className="flex-1 relative bg-[#0f172a] overflow-hidden">
          {/* Simulated grid when maps is not loaded or error */}
          {(!mapLoaded || googleMapsError) && (
            <div className="absolute inset-0 bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center select-none">
              <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:24px_24px]" />
              <div className="z-10 space-y-3">
                <Navigation className="w-12 h-12 text-accent animate-pulse mx-auto" />
                <p className="font-bold text-text-secondary text-sm">Interactive Sandbox Map Grid</p>
                <p className="text-xs text-text-muted max-w-[300px] mx-auto">
                  Drag mapping is simulated in sandbox mode. You can click anywhere or use the search bar to simulate pin placement.
                </p>
                <button 
                  onClick={() => {
                    const randomLat = 9.9 + Math.random() * 0.1
                    const randomLng = 76.2 + Math.random() * 0.1
                    setLat(randomLat)
                    setLng(randomLng)
                    performReverseGeocode(randomLat, randomLng)
                  }}
                  className="px-3 py-1.5 rounded-lg bg-accent/25 hover:bg-accent/40 border border-accent text-accent text-xs font-semibold"
                >
                  Simulate Dragging Map
                </button>
              </div>
            </div>
          )}

          {/* Real Google Maps DIV */}
          <div 
            ref={mapRef} 
            className="w-full h-full" 
            style={{ display: googleMapsError ? 'none' : 'block' }}
          />

          {/* Search Box Overlay */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <form onSubmit={handleManualSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search address or landmark..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#1e293b]/90 border border-white/10 focus:border-secondary outline-none text-sm text-text shadow-lg placeholder:text-text-muted"
                />
              </div>
              <button 
                type="submit"
                className="px-4 py-2 rounded-xl bg-accent text-white font-bold text-sm shadow-lg hover:opacity-90 transition-opacity"
              >
                Search
              </button>
            </form>
          </div>

          {/* Uber-Style Fixed Center Pin (Only overlay when map loads successfully) */}
          {mapLoaded && (
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center">
              <div className="relative -top-5 flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-accent/25 border-2 border-accent flex items-center justify-center shadow-lg animate-bounce">
                  <MapPin className="w-5 h-5 text-accent fill-accent" />
                </div>
                <div className="w-1.5 h-1.5 rounded-full bg-accent/80 border border-white shadow-md mt-0.5" />
              </div>
            </div>
          )}

          {/* GPS Locator Button */}
          <button
            onClick={handleUseCurrentLocation}
            className="absolute bottom-4 right-4 z-10 p-3 rounded-full bg-[#1e293b] border border-white/10 hover:bg-[#334155] text-accent shadow-lg transition-colors"
            title="Use current GPS location"
          >
            <Navigation className="w-5 h-5 rotate-45" />
          </button>
        </div>

        {/* Bottom Sheet Details */}
        <div className="px-6 py-5 border-t border-white/10 bg-[#0f172a]/95 backdrop-blur-md shrink-0 space-y-4">
          <div>
            <span className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold block mb-1">Pickup Address</span>
            <div className="flex gap-2 items-start">
              <MapPin className="w-4 h-4 text-accent mt-0.5 shrink-0" />
              <p className="text-text font-bold text-sm leading-tight line-clamp-2">
                {isGeocoding ? (
                  <span className="text-text-muted italic flex items-center gap-1.5">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Resolving exact location...
                  </span>
                ) : (
                  address || 'Pin drop to select coordinates...'
                )}
              </p>
            </div>
            <span className="text-[9px] text-text-muted mt-1 block">
              GPS Coordinates: {lat.toFixed(6)}, {lng.toFixed(6)}
            </span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={isGeocoding || !address}
            className="w-full py-3.5 rounded-2xl font-bold text-white gradient-primary shadow-lg shadow-accent/25 hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 text-sm uppercase tracking-wider"
          >
            Confirm Pickup Location
          </button>
        </div>
      </motion.div>
    </div>
  )
}
