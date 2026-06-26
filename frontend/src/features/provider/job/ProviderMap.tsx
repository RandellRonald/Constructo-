import { useEffect, useRef } from 'react'

declare const google: any;

interface ProviderMapProps {
  lat: number
  lng: number
  heading: number
  googleMapsError: boolean
  mapLoaded: boolean
  onMapInstance: (map: any) => void
}

export default function ProviderMap({
  lat,
  lng,
  heading,
  googleMapsError,
  mapLoaded,
  onMapInstance
}: ProviderMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapLoaded || googleMapsError || !containerRef.current || !(window as any).google || !(window as any).google.maps) {
      return
    }

    try {
      const position = { lat, lng }
      const mapOptions: any = {
        center: position,
        zoom: 15,
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

      const map = new (window as any).google.maps.Map(containerRef.current, mapOptions)
      onMapInstance(map)
    } catch (e) {
      console.error('Error initializing ProviderMap:', e)
    }
  }, [mapLoaded, googleMapsError])

  if (googleMapsError) {
    return null
  }

  return <div ref={containerRef} className="w-full h-full" />
}
