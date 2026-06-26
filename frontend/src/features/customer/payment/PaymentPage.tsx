import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, XCircle, ArrowLeft, IndianRupee, Download, Navigation, RefreshCw, Headphones } from 'lucide-react'
import { paymentAPI } from '../../../services/api'

export default function PaymentPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const booking = location.state?.booking
  const [status, setStatus] = useState<'checkout' | 'success' | 'failed'>('checkout')
  const [isLoading, setIsLoading] = useState(false)

  const handlePayment = async () => {
    if (!booking) return
    setIsLoading(true)
    try {
      const orderRes = await paymentAPI.createOrder({
        booking_id: booking.booking_id,
        payment_type: 'reservation',
      })

      if (orderRes.data.success) {
        const orderData = orderRes.data.data

        // Check if Razorpay is loaded
        if ((window as any).Razorpay && orderData.razorpay_key) {
          const options = {
            key: orderData.razorpay_key,
            amount: orderData.amount * 100,
            currency: 'INR',
            name: 'Constructo',
            description: `Booking ${booking.booking_number}`,
            order_id: orderData.order_id,
            handler: async (response: any) => {
              try {
                await paymentAPI.verifyPayment({
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                })
                setStatus('success')
              } catch {
                setStatus('failed')
              }
            },
            prefill: {
              name: orderData.customer_name || '',
              email: orderData.customer_email || '',
              contact: orderData.customer_phone || '',
            },
            theme: { color: '#6366F1' },
          }
          const razorpay = new (window as any).Razorpay(options)
          razorpay.on('payment.failed', () => setStatus('failed'))
          razorpay.open()
        } else {
          // Dev mode: simulate payment
          try {
            await paymentAPI.verifyPayment({
              razorpay_order_id: orderData.order_id,
              razorpay_payment_id: `pay_dev_${Date.now()}`,
              razorpay_signature: 'dev_signature',
            })
            setStatus('success')
          } catch {
            setStatus('failed')
          }
        }
      }
    } catch {
      setStatus('failed')
    } finally {
      setIsLoading(false)
    }
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 text-center max-w-md w-full">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring' }}>
            <CheckCircle2 className="w-20 h-20 text-success mx-auto mb-6" />
          </motion.div>
          <h1 className="text-2xl font-bold mb-2">Payment Successful!</h1>
          <p className="text-text-secondary text-sm mb-6">Your booking has been activated. A provider will be assigned shortly.</p>
          <div className="glass-card p-4 mb-6 text-left">
            <div className="flex justify-between text-sm mb-1"><span className="text-text-secondary">Booking</span><span className="font-semibold">{booking?.booking_number}</span></div>
            <div className="flex justify-between text-sm mb-1"><span className="text-text-secondary">Amount Paid</span><span className="font-semibold text-success">₹{(booking?.reservation_fee + booking?.emergency_fee) || 200}</span></div>
            <div className="flex justify-between text-sm"><span className="text-text-secondary">Status</span><span className="text-success font-semibold">Confirmed</span></div>
          </div>
          <div className="space-y-2">
            <button onClick={() => navigate(`/customer/tracking/${booking?.booking_id || booking?.id || 0}`)} className="w-full py-3 rounded-xl font-semibold text-white gradient-primary flex items-center justify-center gap-2">
              <Navigation className="w-4 h-4" /> Track Booking
            </button>
            <button className="w-full py-3 rounded-xl font-semibold border border-border hover:bg-black/5 flex items-center justify-center gap-2 text-sm">
              <Download className="w-4 h-4" /> Download Receipt
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  if (status === 'failed') {
    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-4">
        <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="glass-card p-8 text-center max-w-md w-full">
          <XCircle className="w-20 h-20 text-danger mx-auto mb-6" />
          <h1 className="text-2xl font-bold mb-2">Payment Failed</h1>
          <p className="text-text-secondary text-sm mb-8">Something went wrong. Your booking is still pending.</p>
          <div className="space-y-2">
            <button onClick={() => { setStatus('checkout'); handlePayment() }} className="w-full py-3 rounded-xl font-semibold text-white bg-danger hover:bg-danger/90 flex items-center justify-center gap-2">
              <RefreshCw className="w-4 h-4" /> Retry Payment
            </button>
            <button className="w-full py-3 rounded-xl font-semibold border border-border hover:bg-black/5 flex items-center justify-center gap-2 text-sm">
              <Headphones className="w-4 h-4" /> Contact Support
            </button>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface">
      <div className="glass-nav sticky top-0 z-30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => navigate(-1)} className="p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <p className="font-bold text-sm">Payment</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <h2 className="text-xl font-bold mb-1">Complete Payment</h2>
          <p className="text-text-secondary text-sm mb-6">Pay the reservation fee to activate your booking</p>

          <div className="glass-card p-5 mb-4">
            <h3 className="font-bold text-sm mb-3">Booking Summary</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Booking</span><span className="font-semibold">{booking?.booking_number || 'CON-XXXXXXXX'}</span></div>
              <div className="flex justify-between text-sm"><span className="text-text-secondary">Reservation Fee</span><span className="font-semibold">₹{booking?.reservation_fee || 200}</span></div>
              {booking?.emergency_fee > 0 && (
                <div className="flex justify-between text-sm"><span className="text-text-secondary">Emergency Fee</span><span className="font-semibold text-danger">₹{booking?.emergency_fee}</span></div>
              )}
              <div className="border-t border-border pt-2 flex justify-between">
                <span className="font-bold">Total</span>
                <span className="font-bold text-lg text-secondary">₹{(booking?.reservation_fee || 200) + (booking?.emergency_fee || 0)}</span>
              </div>
            </div>
          </div>

          <div className="glass-card p-4 mb-6">
            <p className="text-xs text-text-muted leading-relaxed">
              🔒 Payments are secured by Razorpay. Your booking will be activated immediately after successful payment.
              A provider will be assigned within minutes.
            </p>
          </div>

          <button
            onClick={handlePayment}
            disabled={isLoading}
            className="w-full py-4 rounded-xl font-bold text-white gradient-primary hover:opacity-90 flex items-center justify-center gap-2 text-base disabled:opacity-50"
          >
            {isLoading ? (
              <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            ) : (
              <>Pay ₹{(booking?.reservation_fee || 200) + (booking?.emergency_fee || 0)} <IndianRupee className="w-4 h-4" /></>
            )}
          </button>
        </motion.div>
      </div>
    </div>
  )
}
