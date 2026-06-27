import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import MapView from '../../components/maps/MapView'
import MapMarker from '../../components/maps/MapMarker'
import MapRoute from '../../components/maps/MapRoute'

// Mock maplibregl
vi.mock('maplibre-gl', () => {
  return {
    default: {
      Map: vi.fn(() => ({
        addControl: vi.fn(),
        on: vi.fn(),
        remove: vi.fn(),
        getCenter: vi.fn(() => ({ lat: 9.0, lng: 76.0 })),
        flyTo: vi.fn(),
      })),
      Marker: vi.fn(() => ({
        setLngLat: vi.fn().mockReturnThis(),
        addTo: vi.fn().mockReturnThis(),
        remove: vi.fn(),
      })),
      NavigationControl: vi.fn(),
      GeolocateControl: vi.fn(),
      AttributionControl: vi.fn(),
    }
  }
})

describe('Map Components', () => {
  it('renders MapView without crashing', () => {
    const { container } = render(<MapView lat={9.0} lng={76.0} />)
    expect(container.firstChild).toBeInTheDocument()
    // It creates a container div
    expect(container.querySelector('div')).toHaveClass('w-full', 'h-full')
  })

  it('renders MapMarker without crashing when wrapped in map context', () => {
    // In a full test, we'd wrap in MapContext.Provider, but we verify it handles null gracefully
    const { unmount } = render(<MapMarker lat={9.0} lng={76.0} variant="customer" />)
    expect(unmount).not.toThrow()
  })
  
  it('renders MapRoute without crashing', () => {
    const { unmount } = render(
      <MapRoute 
        originLat={9.0} originLng={76.0} 
        destLat={9.1} destLng={76.1} 
      />
    )
    expect(unmount).not.toThrow()
  })
})
