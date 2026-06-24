import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, CheckCircle2, AlertCircle, FileText, Clock, IndianRupee } from 'lucide-react'
import { completionAPI } from '../../../services/api'

export default function CompletionReview() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [summary, setSummary] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isConfirming, setIsConfirming] = useState(false)

  useEffect(() => {
    loadSummary()
  }, [id])

  const loadSummary = async () => {
    try {
      const res = await completionAPI.getSummary(id!)
      if (res.data.success) {
        setSummary(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load completion summary:', err)
      // Fallback mock for dev
      setSummary({
        booking_number: `CON-${id}`,
        duration_hours: 4,
        estimated_price: 10000,
        completion_notes: 'Job completed successfully.',
        overtime: null
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    setIsConfirming(true)
    try {
      await completionAPI.confirm(id!)
      navigate(`/customer/invoice/${id}`)
    } catch(e) {
      console.error(e)
    } finally {
      setIsConfirming(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 pt-20">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="skeleton h-32 rounded-2xl" />
          <div className="skeleton h-48 rounded-2xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="glass-nav sticky top-0 z-30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate('/customer/dashboard')} className="p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-bold text-sm">Job Completion</p>
            <p className="text-text-muted text-xs">#{summary.booking_number}</p>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-4">
          <div className="w-16 h-16 rounded-full bg-success/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-success" />
          </div>
          <h2 className="text-xl font-bold mb-1">Provider Marked Complete</h2>
          <p className="text-text-secondary text-sm">Review the job details to generate your final invoice.</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
          <div className="glass-card p-5">
            <h3 className="font-bold text-sm mb-3 border-b border-border pb-2">Work Summary</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-xs text-text-muted mb-1 flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> Booked Duration</p>
                <p className="font-semibold text-sm">{summary.duration_hours} hours</p>
              </div>

              {summary.overtime && (
                <div className="p-3 rounded-xl bg-warning/10 border border-warning/20">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-warning-dark mt-0.5" />
                    <div>
                      <p className="text-sm font-bold text-warning-dark">Overtime Incurred</p>
                      <p className="text-xs text-warning-dark/80 mt-1">Provider logged <span className="font-bold">{summary.overtime.actual_hours} hours</span> total.</p>
                      <div className="flex justify-between mt-2 text-xs font-semibold text-warning-dark">
                        <span>Extra Time: {summary.overtime.extra_hours}h</span>
                        <span>+ ₹{summary.overtime.overtime_amount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {summary.completion_notes && (
                <div>
                  <p className="text-xs text-text-muted mb-1 flex items-center gap-1"><FileText className="w-3.5 h-3.5" /> Provider Notes</p>
                  <p className="text-sm text-text-secondary italic">"{summary.completion_notes}"</p>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
          <button 
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full py-4 rounded-xl font-bold text-white gradient-primary shadow-lg flex items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            {isConfirming ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>Confirm & Generate Invoice <IndianRupee className="w-4 h-4" /></>
            )}
          </button>
          
          <button className="w-full mt-3 py-3 rounded-xl font-semibold text-danger border border-danger/20 hover:bg-danger/5 transition-colors text-sm">
            Dispute Hours
          </button>
        </motion.div>
      </div>
    </div>
  )
}
