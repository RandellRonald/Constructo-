import { Navigation, AlertTriangle } from 'lucide-react'

interface MapErrorFallbackProps {
  /** Additional context text to show below the main message */
  contextText?: string
  /** If true, shows a "sandbox simulation" style instead of error style */
  sandbox?: boolean
  /** Optional click handler for a simulate button (sandbox mode only) */
  onSimulate?: () => void
}

/**
 * Reusable fallback displayed when Google Maps fails to load.
 * Replaces the raw "This page can't load Google Maps correctly" dialog.
 * Two modes:
 *   - error (default): "Map configuration error. Please contact support."
 *   - sandbox: Interactive sandbox grid with simulate button
 */
export default function MapErrorFallback({
  contextText,
  sandbox = false,
  onSimulate
}: MapErrorFallbackProps) {
  return (
    <div className="absolute inset-0 bg-[#0f172a] flex flex-col items-center justify-center p-6 text-center select-none z-[5]">
      <div className="absolute inset-0 opacity-[0.08] bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] bg-[size:24px_24px]" />
      <div className="z-10 space-y-3">
        {sandbox ? (
          <>
            <Navigation className="w-12 h-12 text-accent animate-pulse mx-auto" />
            <p className="font-bold text-text-secondary text-sm">Interactive Sandbox Map Grid</p>
            <p className="text-xs text-text-muted max-w-[300px] mx-auto">
              {contextText || 'Drag mapping is simulated in sandbox mode. You can click anywhere or use the search bar to simulate pin placement.'}
            </p>
            {onSimulate && (
              <button
                onClick={onSimulate}
                className="px-3 py-1.5 rounded-lg bg-accent/25 hover:bg-accent/40 border border-accent text-accent text-xs font-semibold"
              >
                Simulate Dragging Map
              </button>
            )}
          </>
        ) : (
          <>
            <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7 text-danger" />
            </div>
            <p className="font-bold text-text text-sm">Map configuration error</p>
            <p className="text-xs text-text-muted max-w-[300px] mx-auto">
            {contextText || 'Unable to load map tiles. Please check your network connection or contact support.'}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
