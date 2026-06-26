import { useEffect, useRef } from 'react'

declare const google: any;

interface ProviderMarkerProps {
  map: any
  lat: number
  lng: number
  heading: number
  mapLoaded: boolean
}

export default function ProviderMarker({
  map,
  lat,
  lng,
  heading,
  mapLoaded
}: ProviderMarkerProps) {
  const markerRef = useRef<any>(null)

  useEffect(() => {
    if (!mapLoaded || !map || !(window as any).google || !(window as any).google.maps) {
      return
    }

    const maps = (window as any).google.maps
    const position = { lat, lng }

    if (!markerRef.current) {
      markerRef.current = new maps.Marker({
        position,
        map,
        title: "Provider Location",
        icon: {
          path: maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 6,
          rotation: heading || 0,
          fillColor: "#3b82f6", // Blue
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2
        }
      })
    } else {
      markerRef.current.setPosition(position)
      const icon = markerRef.current.getIcon()
      if (icon) {
        icon.rotation = heading || 0
        markerRef.current.setIcon(icon)
      }
    }

    return () => {
      if (markerRef.current) {
        markerRef.current.setMap(null)
        markerRef.current = null
      }
    }
  }, [map, lat, lng, heading, mapLoaded])

  return null
}
