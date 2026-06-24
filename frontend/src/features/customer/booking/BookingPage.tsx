import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, MapPin, Camera, FileText,
  Shovel, HardHat, Truck, TreePine, Recycle, Siren,
  X, Plus, IndianRupee
} from 'lucide-react'
import { bookingAPI } from '../../../services/api'

const serviceCategories = [
  { id: 1, name: 'Earthmoving & Excavation', icon: Shovel, rate: 2500, color: 'from-amber-500 to-amber-600', desc: 'JCB, excavators, land clearing' },
  { id: 2, name: 'Crane Services', icon: HardHat, rate: 5000, color: 'from-secondary to-secondary-dark', desc: 'Mobile & tower cranes' },
  { id: 3, name: 'Transportation & Haulage', icon: Truck, rate: 1800, color: 'from-accent to-accent-dark', desc: 'Tippers, trailers, material transport' },
  { id: 4, name: 'Environmental Services', icon: TreePine, rate: 2000, color: 'from-success to-emerald-600', desc: 'Soil testing, erosion control' },
  { id: 5, name: 'Waste Management', icon: Recycle, rate: 1500, color: 'from-violet-500 to-purple-600', desc: 'Debris clearing, recycling' },
]

const durations = [1, 2, 4, 8]

export default function BookingPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedService, setSelectedService] = useState<typeof serviceCategories[0] | null>(null)
  const [address, setAddress] = useState('')
  const [duration, setDuration] = useState(2)
  const [customDuration, setCustomDuration] = useState('')
  const [isEmergency, setIsEmergency] = useState(false)
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<File[]>([])

  const totalSteps = 4
  const actualDuration = customDuration ? parseFloat(customDuration) : duration
  const basePrice = (selectedService?.rate || 0) * actualDuration
  const emergencyFee = isEmergency ? 500 : 0
  const reservationFee = 200
  const tax = Math.round(basePrice * 0.18)
  const total = basePrice + emergencyFee + reservationFee + tax

  const handleCreateBooking = async () => {
    if (!selectedService) return
    setIsLoading(true)
    try {
      const res = await bookingAPI.createBooking({
        service_category_id: selectedService.id,
        pickup_address: address || 'Ernakulam, Kerala',
        pickup_latitude: 9.9312,
        pickup_longitude: 76.2673,
        duration_hours: actualDuration,
        description,
        is_emergency: isEmergency,
      })
      if (res.data.success) {
        navigate('/customer/payment', { state: { booking: res.data.data } })
      }
    } catch (err) {
      console.error('Booking failed:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <div className="glass-nav sticky top-0 z-30 px-4 py-3">
        <div className="max-w-lg mx-auto flex items-center gap-3">
          <button onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} className="p-2 rounded-xl hover:bg-black/5">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <p className="font-bold text-sm">Book a Service</p>
            <p className="text-text-muted text-xs">Step {step + 1} of {totalSteps}</p>
          </div>
        </div>
        {/* Progress bar */}
        <div className="max-w-lg mx-auto mt-3 flex gap-1">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`flex-1 h-1 rounded-full transition-all ${i <= step ? 'gradient-primary' : 'bg-border'}`} />
          ))}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 py-6">
        <AnimatePresence mode="wait">
          {/* Step 0: Service Selection */}
          {step === 0 && (
            <motion.div key="service" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold mb-1">Choose a Service</h2>
              <p className="text-text-secondary text-sm mb-6">What do you need for your site?</p>
              <div className="space-y-3">
                {serviceCategories.map(s => (
                  <button
                    key={s.id}
                    onClick={() => { setSelectedService(s); setStep(1) }}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all text-left ${
                      selectedService?.id === s.id ? 'border-secondary bg-secondary/5' : 'border-border hover:border-secondary/30 glass-card'
                    }`}
                  >
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${s.color} flex items-center justify-center shrink-0`}>
                      <s.icon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm">{s.name}</p>
                      <p className="text-text-muted text-xs">{s.desc}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-secondary">₹{s.rate}</p>
                      <p className="text-text-muted text-[10px]">per hour</p>
                    </div>
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* Step 1: Location + Duration */}
          {step === 1 && (
            <motion.div key="location" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold mb-1">Location & Duration</h2>
              <p className="text-text-secondary text-sm mb-6">Where and how long?</p>

              <div className="space-y-5">
                {/* Location */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Site Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-text-muted" />
                    <input
                      value={address}
                      onChange={e => setAddress(e.target.value)}
                      placeholder="Search address or use GPS"
                      className="w-full pl-11 pr-4 py-3 rounded-xl bg-white/60 border border-border focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm"
                    />
                  </div>
                  <button className="mt-2 text-xs text-secondary font-medium flex items-center gap-1">
                    <MapPin className="w-3 h-3" /> Use current location
                  </button>
                </div>

                {/* Duration */}
                <div>
                  <label className="block text-sm font-semibold mb-2">Duration (Hours)</label>
                  <div className="grid grid-cols-4 gap-2 mb-2">
                    {durations.map(d => (
                      <button
                        key={d}
                        onClick={() => { setDuration(d); setCustomDuration('') }}
                        className={`py-3 rounded-xl text-sm font-semibold transition-all ${
                          duration === d && !customDuration ? 'gradient-primary text-white' : 'border border-border hover:border-secondary/30'
                        }`}
                      >
                        {d}h
                      </button>
                    ))}
                  </div>
                  <input
                    value={customDuration}
                    onChange={e => setCustomDuration(e.target.value)}
                    type="number"
                    placeholder="Custom hours"
                    className="w-full px-4 py-2.5 rounded-xl bg-white/60 border border-border focus:border-secondary text-sm outline-none"
                  />
                </div>

                {/* Emergency Toggle */}
                <button
                  onClick={() => setIsEmergency(!isEmergency)}
                  className={`w-full flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                    isEmergency ? 'border-danger bg-danger/5' : 'border-border'
                  }`}
                >
                  <Siren className={`w-5 h-5 ${isEmergency ? 'text-danger' : 'text-text-muted'}`} />
                  <div className="flex-1 text-left">
                    <p className="font-semibold text-sm">Emergency Service</p>
                    <p className="text-text-muted text-xs">Priority dispatch (+₹500)</p>
                  </div>
                  <div className={`w-10 h-6 rounded-full transition-all ${isEmergency ? 'bg-danger' : 'bg-gray-200'} relative`}>
                    <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isEmergency ? 'right-1' : 'left-1'}`} />
                  </div>
                </button>

                {/* Price Preview */}
                <div className="glass-card p-4 rounded-xl">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">Base Price ({actualDuration}h × ₹{selectedService?.rate})</span>
                    <span className="font-semibold">₹{basePrice.toLocaleString()}</span>
                  </div>
                  {isEmergency && (
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-text-secondary">Emergency Fee</span>
                      <span className="font-semibold text-danger">₹{emergencyFee}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-text-secondary">Reservation Fee</span>
                    <span className="font-semibold">₹{reservationFee}</span>
                  </div>
                  <div className="border-t border-border mt-2 pt-2 flex justify-between">
                    <span className="font-bold text-sm">Estimated Total</span>
                    <span className="font-bold text-secondary">₹{total.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <button onClick={() => setStep(2)} className="w-full mt-6 py-3.5 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 flex items-center justify-center gap-2">
                Continue <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 2: Photos & Description */}
          {step === 2 && (
            <motion.div key="details" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold mb-1">Additional Details</h2>
              <p className="text-text-secondary text-sm mb-6">Help the provider understand your needs (optional)</p>

              <div className="space-y-5">
                <div>
                  <label className="block text-sm font-semibold mb-2">Site Photos</label>
                  <div className="grid grid-cols-3 gap-2">
                    {photos.map((_, i) => (
                      <div key={i} className="aspect-square rounded-xl bg-secondary/10 flex items-center justify-center relative">
                        <Camera className="w-6 h-6 text-secondary" />
                        <button onClick={() => setPhotos(photos.filter((_, j) => j !== i))} className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-danger text-white flex items-center justify-center">
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                    {photos.length < 10 && (
                      <label className="aspect-square rounded-xl border-2 border-dashed border-border hover:border-secondary cursor-pointer flex flex-col items-center justify-center gap-1 transition-colors">
                        <Plus className="w-6 h-6 text-text-muted" />
                        <span className="text-[10px] text-text-muted">Add Photo</span>
                        <input type="file" accept="image/*" multiple className="hidden" onChange={e => {
                          if (e.target.files) setPhotos([...photos, ...Array.from(e.target.files)])
                        }} />
                      </label>
                    )}
                  </div>
                  <p className="text-text-muted text-xs mt-1">Max 10 photos • JPG, PNG, WebP • 10MB each</p>
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2">Description</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Describe your site requirements..."
                    rows={4}
                    maxLength={1000}
                    className="w-full px-4 py-3 rounded-xl bg-white/60 border border-border focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none text-sm resize-none"
                  />
                  <p className="text-text-muted text-xs text-right">{description.length}/1000</p>
                </div>
              </div>

              <button onClick={() => setStep(3)} className="w-full mt-6 py-3.5 rounded-xl font-semibold text-white gradient-primary hover:opacity-90 flex items-center justify-center gap-2">
                Review Booking <ArrowRight className="w-4 h-4" />
              </button>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {step === 3 && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold mb-1">Review Booking</h2>
              <p className="text-text-secondary text-sm mb-6">Confirm details before payment</p>

              <div className="space-y-4">
                <div className="glass-card p-5 space-y-3">
                  <div className="flex items-center gap-3">
                    {selectedService && (
                      <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${selectedService.color} flex items-center justify-center`}>
                        <selectedService.icon className="w-5 h-5 text-white" />
                      </div>
                    )}
                    <div>
                      <p className="font-bold text-sm">{selectedService?.name}</p>
                      <p className="text-text-muted text-xs">{actualDuration} hours</p>
                    </div>
                  </div>

                  <div className="border-t border-border pt-3 space-y-2">
                    <div className="flex items-start gap-2">
                      <MapPin className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                      <p className="text-sm text-text-secondary">{address || 'Ernakulam, Kerala'}</p>
                    </div>
                    {isEmergency && (
                      <div className="flex items-center gap-2">
                        <Siren className="w-4 h-4 text-danger" />
                        <p className="text-sm text-danger font-medium">Emergency Service</p>
                      </div>
                    )}
                    {description && (
                      <div className="flex items-start gap-2">
                        <FileText className="w-4 h-4 text-text-muted mt-0.5 shrink-0" />
                        <p className="text-sm text-text-secondary">{description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Price Breakdown */}
                <div className="glass-card p-5">
                  <h3 className="font-bold text-sm mb-3">Price Breakdown</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm"><span className="text-text-secondary">Base Price</span><span>₹{basePrice.toLocaleString()}</span></div>
                    {isEmergency && <div className="flex justify-between text-sm"><span className="text-text-secondary">Emergency Fee</span><span className="text-danger">₹{emergencyFee}</span></div>}
                    <div className="flex justify-between text-sm"><span className="text-text-secondary">Reservation Fee</span><span>₹{reservationFee}</span></div>
                    <div className="flex justify-between text-sm"><span className="text-text-secondary">GST (18%)</span><span>₹{tax}</span></div>
                    <div className="border-t border-border pt-2 flex justify-between">
                      <span className="font-bold">Estimated Total</span>
                      <span className="font-bold text-lg text-secondary">₹{total.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <p className="text-text-muted text-xs text-center">
                  By proceeding, you agree to Constructo's cancellation policy and terms of service.
                </p>
              </div>

              <button
                onClick={handleCreateBooking}
                disabled={isLoading}
                className="w-full mt-6 py-4 rounded-xl font-bold text-white gradient-primary hover:opacity-90 flex items-center justify-center gap-2 text-base disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <>Proceed to Payment <IndianRupee className="w-4 h-4" /></>
                )}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
