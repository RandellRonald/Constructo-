import { useEffect, useState, useRef, useCallback } from 'react'
import { motion } from 'framer-motion'
import { X, Search, MapPin, Loader2, Navigation } from 'lucide-react'
import MapView from '../../../components/maps/MapView'
import { mapsAPI } from '../../../services/api'

interface LocationPickerModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (lat: number, lng: number, address: string) => void
  initialLat?: number | null
  initialLng?: number | null
  initialAddress?: string
}

interface SearchResult {
  address: string
  latitude: number
  longitude: number
}

export default function LocationPickerModal({
  isOpen,
  onClose,
  onConfirm,
  initialLat,
  initialLng,
  initialAddress = ''
}: LocationPickerModalProps) {
  const [lat, setLat] = useState<number>(initialLat || 9.9816)
  const [lng, setLng] = useState<number>(initialLng || 76.2999)
  const [address, setAddress] = useState<string>(initialAddress)
  const [searchQuery, setSearchQuery] = useState('')
  const [isGeocoding, setIsGeocoding] = useState(false)
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchTimeoutRef = useRef<number | undefined>(undefined)
  const mapViewRef = useRef<any>(null)

  // Sync initial coordinates when modal opens
  useEffect(() => {
    if (isOpen) {
      setLat(initialLat || 9.9816)
      setLng(initialLng || 76.2999)
      if (initialAddress) {
        setAddress(initialAddress)
      }
      setSearchResults([])
      setShowResults(false)
    }
  }, [isOpen, initialLat, initialLng, initialAddress])

  // Reverse geocode when map is dragged
  const handleDragEnd = useCallback(async (newLat: number, newLng: number) => {
    setLat(newLat)
    setLng(newLng)
    setIsGeocoding(true)
    try {
      const res = await mapsAPI.reverseGeocode(newLat, newLng)
      if (res.data.success && res.data.data?.address) {
        setAddress(res.data.data.address)
      } else {
        setAddress(`Site Coordinate (${newLat.toFixed(5)}, ${newLng.toFixed(5)})`)
      }
    } catch {
      setAddress(`Site Coordinate (${newLat.toFixed(5)}, ${newLng.toFixed(5)})`)
    } finally {
      setIsGeocoding(false)
    }
  }, [])

  // Debounced address search
  const handleSearchInput = useCallback((value: string) => {
    setSearchQuery(value)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)

    if (value.length < 3) {
      setSearchResults([])
      setShowResults(false)
      return
    }

    searchTimeoutRef.current = window.setTimeout(async () => {
      try {
        const res = await mapsAPI.searchAddress(value)
        if (res.data.success) {
          setSearchResults(res.data.data || [])
          setShowResults(true)
        }
      } catch {
        setSearchResults([])
      }
    }, 400)
  }, [])

  // Select a search result
  const handleSelectResult = useCallback((result: SearchResult) => {
    setLat(result.latitude)
    setLng(result.longitude)
    setAddress(result.address)
    setSearchQuery(result.address)
    setShowResults(false)

    // Fly map to result
    const map = mapViewRef.current?.getMap()
    if (map) {
      map.flyTo({ center: [result.longitude, result.latitude], zoom: 16, duration: 1000 })
    }
  }, [])

  // Manual search submit
  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery || searchQuery.length < 2) return

    setIsGeocoding(true)
    try {
      const res = await mapsAPI.searchAddress(searchQuery)
      if (res.data.success && res.data.data?.length > 0) {
        const first = res.data.data[0]
        setLat(first.latitude)
        setLng(first.longitude)
        setAddress(first.address)
        setSearchQuery(first.address)
        setShowResults(false)

        const map = mapViewRef.current?.getMap()
        if (map) {
          map.flyTo({ center: [first.longitude, first.latitude], zoom: 16, duration: 1000 })
        }
      } else {
        alert('Location not found. Try different search terms.')
      }
    } catch {
      alert('Location search failed. Please check your connection.')
    } finally {
      setIsGeocoding(false)
    }
  }

  // Use current GPS location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert("Geolocation is not supported by your browser")
      return
    }

    setIsGeocoding(true)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const currentLat = pos.coords.latitude
        const currentLng = pos.coords.longitude
        setLat(currentLat)
        setLng(currentLng)

        const map = mapViewRef.current?.getMap()
        if (map) {
          map.flyTo({ center: [currentLng, currentLat], zoom: 16, duration: 1000 })
        }

        try {
          const res = await mapsAPI.reverseGeocode(currentLat, currentLng)
          if (res.data.success && res.data.data?.address) {
            setAddress(res.data.data.address)
          } else {
            setAddress(`Current Location (${currentLat.toFixed(5)}, ${currentLng.toFixed(5)})`)
          }
        } catch {
          setAddress(`Current Location (${currentLat.toFixed(5)}, ${currentLng.toFixed(5)})`)
        } finally {
          setIsGeocoding(false)
        }
      },
      (err) => {
        console.error("GPS error:", err)
        alert("Failed to retrieve your current location. Please verify browser permissions.")
        setIsGeocoding(false)
      }
    )
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

        {/* Map */}
        <div className="flex-1 relative overflow-hidden">
          <MapView
            ref={mapViewRef}
            lat={lat}
            lng={lng}
            zoom={16}
            onDragEnd={handleDragEnd}
            showZoomControls
          />

          {/* Search Box Overlay */}
          <div className="absolute top-4 left-4 right-4 z-10">
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input
                  type="text"
                  placeholder="Search address or landmark..."
                  value={searchQuery}
                  onChange={(e) => handleSearchInput(e.target.value)}
                  onFocus={() => searchResults.length > 0 && setShowResults(true)}
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

            {/* Search Results Dropdown */}
            {showResults && searchResults.length > 0 && (
              <div className="mt-2 bg-[#1e293b]/95 backdrop-blur-md border border-white/10 rounded-xl shadow-2xl max-h-48 overflow-y-auto">
                {searchResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => handleSelectResult(result)}
                    className="w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-start gap-2.5 border-b border-white/5 last:border-b-0"
                  >
                    <MapPin className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                    <span className="text-xs text-text leading-tight line-clamp-2">{result.address}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Uber-Style Fixed Center Pin */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10 flex flex-col items-center">
            <div className="relative -top-5 flex flex-col items-center">
              <div className="w-10 h-10 rounded-full bg-accent/25 border-2 border-accent flex items-center justify-center shadow-lg animate-bounce">
                <MapPin className="w-5 h-5 text-accent fill-accent" />
              </div>
              <div className="w-1.5 h-1.5 rounded-full bg-accent/80 border border-white shadow-md mt-0.5" />
            </div>
          </div>

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
