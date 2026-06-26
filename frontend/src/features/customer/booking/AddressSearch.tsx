import { Search, Loader2 } from 'lucide-react'

interface AddressSearchProps {
  searchQuery: string
  setSearchQuery: (query: string) => void
  onSearchSubmit: (e: React.FormEvent) => void
  isGeocoding: boolean
  inputRef: React.RefObject<HTMLInputElement | null>
}

export default function AddressSearch({
  searchQuery,
  setSearchQuery,
  onSearchSubmit,
  isGeocoding,
  inputRef
}: AddressSearchProps) {
  return (
    <form onSubmit={onSearchSubmit} className="relative z-10">
      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
      <input
        ref={inputRef as any}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search pickup location or address..."
        className="w-full pl-11 pr-12 py-3 rounded-xl bg-white/90 border border-border focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm shadow-lg text-text"
      />
      {isGeocoding && (
        <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-secondary animate-spin" />
      )}
    </form>
  )
}
