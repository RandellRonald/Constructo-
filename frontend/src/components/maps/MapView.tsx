import { useEffect, useRef, useState, forwardRef, useImperativeHandle } from 'react'
import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'

/** Dark tile style — CartoDB Dark Matter (free, no API key required) */
const DARK_STYLE = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

export interface MapViewRef {
  getMap: () => maplibregl.Map | null
}

interface MapViewProps {
  /** Center latitude */
  lat: number
  /** Center longitude */
  lng: number
  /** Zoom level (default 14) */
  zoom?: number
  /** CSS class for the container */
  className?: string
  /** Called when map finishes a drag gesture */
  onDragEnd?: (lat: number, lng: number) => void
  /** Called when map first loads */
  onMapReady?: (map: maplibregl.Map) => void
  /** Whether to show zoom controls */
  showZoomControls?: boolean
  /** Whether to show GPS locate control */
  showGeolocate?: boolean
  /** Interactive (default true) */
  interactive?: boolean
  /** Children rendered as map overlays (markers, routes etc.) receive map via context */
  children?: React.ReactNode
}

/** React Context to share the MapLibre map instance with child components */
import { createContext, useContext } from 'react'

const MapContext = createContext<maplibregl.Map | null>(null)

export function useMapInstance(): maplibregl.Map | null {
  return useContext(MapContext)
}

/**
 * Core map component wrapping MapLibre GL JS.
 * Uses CartoDB Dark Matter tiles (free, no API key).
 */
const MapView = forwardRef<MapViewRef, MapViewProps>(function MapView(
  {
    lat,
    lng,
    zoom = 14,
    className = '',
    onDragEnd,
    onMapReady,
    showZoomControls = false,
    showGeolocate = false,
    interactive = true,
    children,
  },
  ref
) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<maplibregl.Map | null>(null)
  const [mapReady, setMapReady] = useState(false)

  useImperativeHandle(ref, () => ({
    getMap: () => mapRef.current,
  }))

  // Initialize map
  useEffect(() => {
    if (!containerRef.current) return

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: DARK_STYLE,
      center: [lng, lat],
      zoom,
      interactive,
      attributionControl: false,
    })

    // Compact attribution
    map.addControl(new maplibregl.AttributionControl({ compact: true }), 'bottom-right')

    if (showZoomControls) {
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), 'bottom-right')
    }

    if (showGeolocate) {
      map.addControl(
        new maplibregl.GeolocateControl({
          positionOptions: { enableHighAccuracy: true },
          trackUserLocation: false,
        }),
        'bottom-right'
      )
    }

    map.on('load', () => {
      mapRef.current = map
      setMapReady(true)
      onMapReady?.(map)
    })

    if (onDragEnd) {
      map.on('dragend', () => {
        const center = map.getCenter()
        onDragEnd(center.lat, center.lng)
      })
    }

    return () => {
      mapRef.current = null
      setMapReady(false)
      map.remove()
    }
    // Only re-init on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Fly to new position when lat/lng change (after mount)
  const initialMount = useRef(true)
  useEffect(() => {
    if (initialMount.current) {
      initialMount.current = false
      return
    }
    if (mapRef.current) {
      mapRef.current.flyTo({ center: [lng, lat], duration: 800 })
    }
  }, [lat, lng])

  return (
    <div ref={containerRef} className={`w-full h-full ${className}`}>
      {mapReady && mapRef.current && (
        <MapContext.Provider value={mapRef.current}>{children}</MapContext.Provider>
      )}
    </div>
  )
})

export default MapView
