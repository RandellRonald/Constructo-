import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Camera, CheckCircle2, AlertCircle, X, Plus, Clock } from 'lucide-react'
import { providerAPI } from '../../../services/api'

export default function CompletionPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [actualHours, setActualHours] = useState('4') // Pre-fill with booked duration
  const [notes, setNotes] = useState('')
  const [photos, setPhotos] = useState<File[]>([])
  const [isLoading, setIsLoading] = useState(false)

  // Mock booked duration
  const bookedDuration = 4

  const isOvertime = parseFloat(actualHours || '0') > bookedDuration
  const extraHours = isOvertime ? parseFloat(actualHours) - bookedDuration : 0

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      await providerAPI.updateJobStatus(Number(id), {
        status: 'completed',
        actual_hours: parseFloat(actualHours),
        completion_notes: notes
      })
      navigate('/provider/dashboard') // Redirect back on success
    } catch(e) {
      console.error(e)
      alert('Failed to complete job. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="glass-nav sticky top-0 z-30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-bold text-sm">Complete Job</p>
            <p className="text-text-muted text-xs">Booking #{id}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold mb-1">Final Details</h2>
          <p className="text-text-secondary text-sm mb-6">Enter actual hours worked to generate invoice.</p>

          <div className="space-y-6">
            {/* Hours input */}
            <div>
              <label className="block text-sm font-semibold mb-2">Total Hours Worked</label>
              <div className="relative">
                <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                <input 
                  type="number" 
                  step="0.5"
                  min="0.5"
                  value={actualHours}
                  onChange={(e) => setActualHours(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none font-bold text-lg"
                />
              </div>
              
              {isOvertime && (
                <div className="mt-3 p-3 rounded-xl bg-warning/10 border border-warning/20 flex items-start gap-2 text-warning-dark">
                  <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-bold">Overtime Logged</p>
                    <p className="text-xs text-warning-dark/80">You logged {extraHours} hours more than booked. Overtime charges will apply to customer invoice.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Photos */}
            <div>
              <label className="block text-sm font-semibold mb-2">Completion Photos (Proof of work)</label>
              <div className="grid grid-cols-3 gap-2">
                {photos.map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-black/5 flex items-center justify-center relative">
                    <Camera className="w-6 h-6 text-text-muted" />
                    <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center">
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                {photos.length < 5 && (
                  <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-accent cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors">
                    <Plus className="w-6 h-6 text-text-muted" />
                    <span className="text-[10px] text-text-muted">Add Photo</span>
                    <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                      if (e.target.files) setPhotos([...photos, ...Array.from(e.target.files)])
                    }} />
                  </label>
                )}
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="block text-sm font-semibold mb-2">Completion Notes</label>
              <textarea 
                value={notes}
                onChange={e => setNotes(e.target.value)}
                placeholder="Any additional details about the job..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl bg-white/60 border border-border focus:border-accent focus:ring-2 focus:ring-accent/20 outline-none text-sm resize-none"
              />
            </div>
          </div>

          <button 
            onClick={handleSubmit}
            disabled={isLoading || !actualHours}
            className="w-full mt-8 py-4 rounded-xl font-bold text-white bg-gradient-to-r from-accent to-accent-dark hover:opacity-90 shadow-lg flex items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>Submit & Generate Invoice <CheckCircle2 className="w-5 h-5" /></>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
