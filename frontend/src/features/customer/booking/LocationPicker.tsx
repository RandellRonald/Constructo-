import { MapPin, Navigation } from 'lucide-react'

interface LocationPickerProps {
  address: string
  isGeocoding: boolean
  onUseCurrentLocation: () => void
  onConfirm: () => void
}

export default function LocationPicker({
  address,
  isGeocoding,
  onUseCurrentLocation,
  onConfirm
}: LocationPickerProps) {
  return (
    <div className="absolute bottom-6 left-4 right-4 bg-slate-900/95 backdrop-blur-md rounded-2xl p-5 border border-white/10 shadow-2xl z-10 space-y-4">
      <div className="flex items-start gap-3">
        <MapPin className="w-5 h-5 text-secondary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Confirm Pickup Address</p>
          <p className="text-sm font-bold text-text leading-tight mt-0.5">
            {isGeocoding ? 'Locating site address...' : address || 'Move map to select location'}
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={onUseCurrentLocation}
          className="px-4 py-3 bg-white/5 border border-white/10 hover:bg-white/10 text-text rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors shrink-0"
        >
          <Navigation className="w-4 h-4 text-secondary" /> Current GPS
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isGeocoding || !address}
          className="flex-1 py-3 bg-gradient-to-r from-secondary to-secondary-dark hover:opacity-90 disabled:opacity-50 text-white rounded-xl font-extrabold text-xs shadow-lg shadow-secondary/20 transition-all uppercase tracking-wider"
        >
          Confirm Location
        </button>
      </div>
    </div>
  )
}
