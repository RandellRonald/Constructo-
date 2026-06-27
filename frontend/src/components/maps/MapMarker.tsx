import { useEffect, useRef } from 'react'
import maplibregl from 'maplibre-gl'
import { useMapInstance } from './MapView'

interface MapMarkerProps {
  /** Latitude */
  lat: number
  /** Longitude */
  lng: number
  /** Heading in degrees (rotates the marker element) */
  heading?: number
  /** Variant controls visual style */
  variant?: 'customer' | 'provider' | 'destination'
  /** Optional title for accessibility */
  title?: string
  /** Whether to animate position changes */
  animate?: boolean
}

/**
 * Reusable map marker component for MapLibre GL.
 * Renders a styled HTML marker at the given coordinates.
 */
export default function MapMarker({
  lat,
  lng,
  heading = 0,
  variant = 'customer',
  title = '',
  animate = true,
}: MapMarkerProps) {
  const map = useMapInstance()
  const markerRef = useRef<maplibregl.Marker | null>(null)
  const elRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!map) return

    // Create marker element
    const el = document.createElement('div')
    el.title = title
    el.style.cursor = 'pointer'

    if (variant === 'customer' || variant === 'destination') {
      el.className = 'mapmarker-customer'
      el.innerHTML = `
        <div style="
          width: 32px; height: 32px; border-radius: 50%;
          background: ${variant === 'customer' ? '#10b981' : '#6366f1'};
          border: 2.5px solid #fff;
          box-shadow: 0 2px 8px rgba(0,0,0,0.35);
          display: flex; align-items: center; justify-content: center;
        ">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
      `
    } else {
      // Provider — navigation arrow
      el.className = 'mapmarker-provider'
      el.innerHTML = `
        <div style="
          width: 32px; height: 32px; border-radius: 50%;
          background: #3b82f6;
          border: 2.5px solid #fff;
          box-shadow: 0 2px 10px rgba(59,130,246,0.45);
          display: flex; align-items: center; justify-content: center;
          transform: rotate(${heading}deg);
          transition: transform 0.5s ease;
        " data-arrow>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="3 11 22 2 13 21 11 13 3 11"/>
          </svg>
        </div>
      `
    }

    elRef.current = el

    const marker = new maplibregl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map)

    markerRef.current = marker

    return () => {
      marker.remove()
      markerRef.current = null
      elRef.current = null
    }
    // Only create once per map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Update position when coords change
  useEffect(() => {
    if (markerRef.current) {
      markerRef.current.setLngLat([lng, lat])
    }
  }, [lat, lng])

  // Update heading for provider markers
  useEffect(() => {
    if (elRef.current && variant === 'provider') {
      const arrow = elRef.current.querySelector('[data-arrow]') as HTMLElement
      if (arrow) {
        arrow.style.transform = `rotate(${heading}deg)`
      }
    }
  }, [heading, variant])

  return null
}
