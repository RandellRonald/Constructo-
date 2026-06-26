import { useEffect, useRef } from 'react'

declare const google: any;

interface RouteLayerProps {
  map: any
  originLat: number
  originLng: number
  destLat: number
  destLng: number
  mapLoaded: boolean
}

export default function RouteLayer({
  map,
  originLat,
  originLng,
  destLat,
  destLng,
  mapLoaded
}: RouteLayerProps) {
  const directionsRendererRef = useRef<any>(null)

  useEffect(() => {
    if (!mapLoaded || !map || !(window as any).google || !(window as any).google.maps) {
      return
    }

    const maps = (window as any).google.maps

    if (!directionsRendererRef.current) {
      directionsRendererRef.current = new maps.DirectionsRenderer({
        map,
        suppressMarkers: true,
        polylineOptions: {
          strokeColor: '#3b82f6',
          strokeWeight: 5,
          strokeOpacity: 0.8
        }
      })
    }

    const directionsService = new maps.DirectionsService()
    directionsService.route(
      {
        origin: { lat: originLat, lng: originLng },
        destination: { lat: destLat, lng: destLng },
        travelMode: maps.TravelMode.DRIVING
      },
      (result: any, status: any) => {
        if (status === 'OK' && directionsRendererRef.current) {
          directionsRendererRef.current.setDirections(result)
        }
      }
    )

    return () => {
      if (directionsRendererRef.current) {
        directionsRendererRef.current.setMap(null)
        directionsRendererRef.current = null
      }
    }
  }, [map, originLat, originLng, destLat, destLng, mapLoaded])

  return null
}
