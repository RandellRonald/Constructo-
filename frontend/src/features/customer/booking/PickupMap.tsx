import { useEffect, useRef } from 'react'

declare const google: any;

interface PickupMapProps {
  lat: number
  lng: number
  onDragEnd: (lat: number, lng: number) => void
  googleMapsError: boolean
  mapLoaded: boolean
  onMapInstance: (map: any) => void
}

export default function PickupMap({
  lat,
  lng,
  onDragEnd,
  googleMapsError,
  mapLoaded,
  onMapInstance
}: PickupMapProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!mapLoaded || googleMapsError || !containerRef.current || !(window as any).google || !(window as any).google.maps) {
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

      const map = new (window as any).google.maps.Map(containerRef.current, mapOptions)
      onMapInstance(map)

      map.addListener('dragend', () => {
        const center = map.getCenter()
        if (center) {
          onDragEnd(center.lat(), center.lng())
        }
      })
    } catch (e) {
      console.error('Error initializing PickupMap:', e)
    }
  }, [mapLoaded, googleMapsError])

  if (googleMapsError) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center select-none bg-[#0f172a]">
        <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:20px_20px]" />
        <div className="z-10 space-y-2">
          <p className="text-sm font-bold text-text-secondary">Simulated Sandbox Map</p>
          <p className="text-[10px] text-text-muted max-w-[280px]">
            Selected coordinate: ({lat.toFixed(5)}, {lng.toFixed(5)})
          </p>
        </div>
      </div>
    )
  }

  return (
    <div ref={containerRef} className="w-full h-full relative" />
  )
}
