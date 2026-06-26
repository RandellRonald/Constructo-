import { Navigation, Clock } from 'lucide-react'

interface NavigationMapProps {
  eta: number
  distance: number
  address: string
}

export default function NavigationMap({
  eta,
  distance,
  address
}: NavigationMapProps) {
  return (
    <div className="absolute top-4 left-4 right-4 bg-[#1e293b]/90 backdrop-blur-md rounded-2xl p-4 border border-white/10 flex items-center justify-between shadow-xl z-10">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-accent flex items-center justify-center">
          <Navigation className="w-5 h-5 text-white animate-pulse" />
        </div>
        <div>
          <p className="text-[10px] text-text-muted uppercase tracking-wider font-extrabold">Next Turn Route</p>
          <p className="text-xs font-bold text-text line-clamp-1">{address}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-accent">{Math.round(eta)} min</p>
        <p className="text-[10px] text-text-muted font-semibold">{distance.toFixed(1)} km left</p>
      </div>
    </div>
  )
}
