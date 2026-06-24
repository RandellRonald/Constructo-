import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft, Download, Building2, Star, CreditCard } from 'lucide-react'
import { invoiceAPI } from '../../../services/api'

export default function InvoicePage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [invoice, setInvoice] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadInvoice()
  }, [id])

  const loadInvoice = async () => {
    try {
      const res = await invoiceAPI.getInvoice(id!)
      if (res.data.success) {
        setInvoice(res.data.data)
      }
    } catch (err) {
      console.error('Failed to load invoice:', err)
      // Fallback mock for dev
      setInvoice({
        invoice_number: `INV-${id}`,
        date: new Date().toISOString(),
        status: 'PENDING',
        subtotal: 0,
        tax_amount: 0,
        total_amount: 0,
        reservation_paid: 200,
        balance_due: 0,
        booking: {
          number: `CON-${id}`,
          service: 'Service',
          base_hours: 0,
          base_rate: 0,
          overtime_hours: 0,
          overtime_rate: 0
        }
      })
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface p-4 pt-20">
        <div className="max-w-lg mx-auto space-y-4">
          <div className="skeleton h-96 rounded-2xl" />
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
            <p className="font-bold text-sm">Invoice</p>
            <p className="text-text-muted text-xs">#{invoice.invoice_number}</p>
          </div>
          <button className="p-2 rounded-xl hover:bg-black/5 text-secondary">
            <Download className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        
        {/* Invoice Paper */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white rounded-2xl p-6 shadow-card border border-border">
          {/* Header */}
          <div className="flex justify-between items-start mb-8 pb-6 border-b border-gray-100">
            <div>
              <div className="flex items-center gap-1.5 mb-2">
                <div className="w-8 h-8 rounded-lg gradient-primary flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold">Constructo</span>
              </div>
              <p className="text-xs text-gray-500">Ernakulam, Kerala</p>
              <p className="text-xs text-gray-500">GSTIN: 32AABCXXXXX1Z5</p>
            </div>
            <div className="text-right">
              <h1 className="font-bold text-gray-300 text-xl tracking-widest mb-1">INVOICE</h1>
              <p className="text-xs font-semibold">#{invoice.invoice_number}</p>
              <p className="text-xs text-gray-500">{new Date(invoice.date).toLocaleDateString()}</p>
            </div>
          </div>

          {/* Line Items */}
          <div className="mb-8">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Description</h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{invoice.booking.service}</p>
                  <p className="text-xs text-gray-500">{invoice.booking.base_hours} hrs @ ₹{invoice.booking.base_rate}/hr</p>
                </div>
                <p className="text-sm font-semibold">₹{(invoice.booking.base_hours * invoice.booking.base_rate).toLocaleString()}</p>
              </div>

              {invoice.booking.overtime_hours > 0 && (
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">Overtime Charges</p>
                    <p className="text-xs text-gray-500">{invoice.booking.overtime_hours} hrs @ ₹{invoice.booking.overtime_rate}/hr</p>
                  </div>
                  <p className="text-sm font-semibold">₹{(invoice.booking.overtime_hours * invoice.booking.overtime_rate).toLocaleString()}</p>
                </div>
              )}
            </div>
          </div>

          {/* Totals */}
          <div className="border-t border-gray-100 pt-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">Subtotal</span>
              <span className="font-semibold">₹{invoice.subtotal.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">GST (18%)</span>
              <span className="font-semibold">₹{invoice.tax_amount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm text-success">
              <span>Less: Reservation Paid</span>
              <span>- ₹{invoice.reservation_paid.toLocaleString()}</span>
            </div>
            
            <div className="border-t border-gray-200 mt-4 pt-4 flex justify-between items-center">
              <span className="font-bold text-gray-800">Balance Due</span>
              <span className="font-black text-xl text-primary">₹{invoice.balance_due.toLocaleString()}</span>
            </div>
          </div>
        </motion.div>

        {/* Action Buttons */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="space-y-3">
          <button className="w-full py-4 rounded-xl font-bold text-white gradient-primary shadow-lg flex items-center justify-center gap-2 text-base">
            <CreditCard className="w-5 h-5" /> Pay Balance ₹{invoice.balance_due.toLocaleString()}
          </button>
          
          <button 
            onClick={() => navigate(`/customer/review/${id}`)}
            className="w-full py-3.5 rounded-xl font-semibold border-2 border-secondary text-secondary flex items-center justify-center gap-2 hover:bg-secondary/5 transition-colors"
          >
            <Star className="w-4 h-4" /> Rate Provider
          </button>
        </motion.div>

      </div>
    </div>
  )
}
