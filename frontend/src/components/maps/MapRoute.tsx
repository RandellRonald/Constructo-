import { useEffect, useRef } from 'react'
import { useMapInstance } from './MapView'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

interface MapRouteProps {
  /** Origin latitude */
  originLat: number
  /** Origin longitude */
  originLng: number
  /** Destination latitude */
  destLat: number
  /** Destination longitude */
  destLng: number
  /** Route line color (default blue) */
  color?: string
  /** Route line width (default 5) */
  width?: number
  /** Callback with route info once resolved */
  onRouteInfo?: (distanceKm: number, durationMin: number) => void
  /** Unique source id suffix (for multiple routes on one map) */
  id?: string
}

/**
 * Draws an OSRM-powered driving route polyline on a MapLibre map.
 * Fetches the route from the backend /api/v1/maps/route endpoint
 * and renders it as a GeoJSON line layer.
 */
export default function MapRoute({
  originLat,
  originLng,
  destLat,
  destLng,
  color = '#3b82f6',
  width = 5,
  onRouteInfo,
  id = 'route',
}: MapRouteProps) {
  const map = useMapInstance()
  const sourceId = `maproute-source-${id}`
  const layerId = `mapRoute-layer-${id}`
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (!map) return

    // Add empty source + layer on mount
    if (!map.getSource(sourceId)) {
      map.addSource(sourceId, {
        type: 'geojson',
        data: { type: 'Feature', geometry: { type: 'LineString', coordinates: [] }, properties: {} },
      })
    }
    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: 'line',
        source: sourceId,
        layout: {
          'line-join': 'round',
          'line-cap': 'round',
        },
        paint: {
          'line-color': color,
          'line-width': width,
          'line-opacity': 0.8,
        },
      })
    }

    return () => {
      // Cleanup on unmount
      if (map.getLayer(layerId)) map.removeLayer(layerId)
      if (map.getSource(sourceId)) map.removeSource(sourceId)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map])

  // Fetch and render route when coordinates change
  useEffect(() => {
    if (!map || !map.getSource(sourceId)) return

    // Cancel previous request
    if (abortRef.current) abortRef.current.abort()
    const controller = new AbortController()
    abortRef.current = controller

    const fetchRoute = async () => {
      try {
        const params = new URLSearchParams({
          origin_lat: String(originLat),
          origin_lon: String(originLng),
          dest_lat: String(destLat),
          dest_lon: String(destLng),
        })
        const res = await fetch(`${API_BASE}/api/v1/maps/route?${params}`, {
          signal: controller.signal,
        })
        const json = await res.json()

        if (json.success && json.data) {
          const { coordinates, distance_km, duration_min } = json.data

          // OSRM returns coords as [lat, lon] from our backend — convert to [lng, lat] for GeoJSON
          const geoCoords = coordinates.map((c: number[]) => [c[1], c[0]])

          const source = map.getSource(sourceId) as maplibregl.GeoJSONSource
          if (source) {
            source.setData({
              type: 'Feature',
              geometry: {
                type: 'LineString',
                coordinates: geoCoords,
              },
              properties: {},
            })
          }

          onRouteInfo?.(distance_km, duration_min)
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error('MapRoute: failed to fetch route', err)
        }
      }
    }

    fetchRoute()

    return () => {
      controller.abort()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, originLat, originLng, destLat, destLng])

  return null
}
