import { useState, useEffect, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
import {
  Menu, X, Shovel, HardHat, Truck, TreePine, Recycle,
  Shield, MapPin, IndianRupee, Siren, CreditCard, Headphones,
  ChevronDown, Star, Phone, Mail,
  ArrowRight, CheckCircle2, Clock, Users, Building2,
  MessageCircle, Eye, Zap, BarChart3, Wallet,
  Bell, Globe
} from 'lucide-react'

// ─── Role Selection Modal ────────────────────────────────────────
function RoleSelector({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <div className="absolute inset-0 bg-primary/60 backdrop-blur-sm" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative z-10 w-full max-w-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="glass-card p-8 md:p-10">
            <button onClick={onClose} className="absolute top-4 right-4 p-2 rounded-full hover:bg-black/5 transition-colors">
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-2xl md:text-3xl font-bold text-center mb-2">Welcome to Constructo</h2>
            <p className="text-text-secondary text-center mb-8">How would you like to continue?</p>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Customer Card */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/customer/login')}
                className="group p-6 rounded-2xl border-2 border-border hover:border-secondary transition-all text-left bg-white/50 hover:bg-secondary/5"
              >
                <div className="w-14 h-14 rounded-2xl gradient-primary flex items-center justify-center mb-4">
                  <Users className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">I'm a Customer</h3>
                <p className="text-text-secondary text-sm mb-4">Book excavators, cranes, and site services across Kerala.</p>
                <span className="inline-flex items-center gap-2 text-secondary font-semibold text-sm group-hover:gap-3 transition-all">
                  Continue as Customer <ArrowRight className="w-4 h-4" />
                </span>
              </motion.button>

              {/* Provider Card */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => navigate('/provider/login')}
                className="group p-6 rounded-2xl border-2 border-border hover:border-accent transition-all text-left bg-white/50 hover:bg-accent/5"
              >
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent to-accent-dark flex items-center justify-center mb-4">
                  <Building2 className="w-7 h-7 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">I'm a Provider</h3>
                <p className="text-text-secondary text-sm mb-4">Receive nearby bookings and manage your business digitally.</p>
                <span className="inline-flex items-center gap-2 text-accent-dark font-semibold text-sm group-hover:gap-3 transition-all">
                  Continue as Provider <ArrowRight className="w-4 h-4" />
                </span>
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

// ─── Navbar ──────────────────────────────────────────────────────
function Navbar({ onLoginClick }: { onLoginClick: () => void }) {
  const [isOpen, setIsOpen] = useState(false)
  const [isVisible, setIsVisible] = useState(true)
  const [isScrolled, setIsScrolled] = useState(false)
  const lastScrollY = useRef(0)

  useEffect(() => {
    const handleScroll = () => {
      const current = window.scrollY
      setIsVisible(current < lastScrollY.current || current < 100)
      setIsScrolled(current > 50)
      lastScrollY.current = current
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const navLinks = [
    { label: 'Home', href: '#home' },
    { label: 'Services', href: '#services' },
    { label: 'How It Works', href: '#how-it-works' },
    { label: 'For Providers', href: '#providers' },
    { label: 'About', href: '#about' },
  ]

  return (
    <motion.nav
      initial={{ y: 0 }}
      animate={{ y: isVisible ? 0 : -100 }}
      transition={{ duration: 0.3 }}
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${
        isScrolled ? 'glass-nav shadow-lg' : 'bg-transparent'
      }`}
    >
      <div className="container-main flex items-center justify-between h-16 md:h-18">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl gradient-primary flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg tracking-tight">Constructo</span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden lg:flex items-center gap-1">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="px-4 py-2 text-sm font-medium text-text-secondary hover:text-primary rounded-lg hover:bg-black/5 transition-all"
            >
              {link.label}
            </a>
          ))}
        </div>

        {/* Desktop Actions */}
        <div className="hidden lg:flex items-center gap-3">
          <button
            onClick={onLoginClick}
            className="px-5 py-2.5 text-sm font-semibold text-text-secondary hover:text-primary rounded-xl hover:bg-black/5 transition-all"
          >
            Login
          </button>
          <Link
            to="/provider/register"
            className="px-5 py-2.5 text-sm font-semibold text-white rounded-xl gradient-primary hover:opacity-90 transition-all shadow-button"
          >
            Become a Partner
          </Link>
        </div>

        {/* Mobile Menu Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="lg:hidden p-2 rounded-lg hover:bg-black/5 transition-colors"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden glass border-t border-border overflow-hidden"
          >
            <div className="container-main py-4 space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setIsOpen(false)}
                  className="block px-4 py-3 text-sm font-medium text-text-secondary hover:text-primary rounded-lg hover:bg-black/5 transition-all"
                >
                  {link.label}
                </a>
              ))}
              <div className="pt-3 border-t border-border space-y-2">
                <button onClick={() => { setIsOpen(false); onLoginClick() }} className="block w-full px-4 py-3 text-sm font-semibold text-center rounded-xl border border-border hover:bg-black/5 transition-all">
                  Login
                </button>
                <Link to="/provider/register" className="block w-full px-4 py-3 text-sm font-semibold text-white text-center rounded-xl gradient-primary">
                  Become a Partner
                </Link>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

// ─── Hero Section ────────────────────────────────────────────────
function HeroSection({ onLoginClick }: { onLoginClick: () => void }) {
  const { scrollY } = useScroll()
  const y = useTransform(scrollY, [0, 500], [0, 150])
  const opacity = useTransform(scrollY, [0, 400], [1, 0])

  return (
    <section id="home" className="relative min-h-screen flex items-center overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary via-primary-light to-primary">
        <div className="absolute inset-0 gradient-hero animate-gradient" />
        {/* Animated orbs */}
        <motion.div
          animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute top-1/4 right-1/4 w-96 h-96 rounded-full bg-secondary/20 blur-3xl"
        />
        <motion.div
          animate={{ x: [0, -20, 0], y: [0, 30, 0] }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-1/4 left-1/4 w-80 h-80 rounded-full bg-accent/15 blur-3xl"
        />
      </div>

      <motion.div style={{ y, opacity }} className="relative z-10 container-main pt-24 pb-16 md:pt-32 md:pb-24">
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold text-accent-light bg-accent/10 border border-accent/20 mb-6">
              <span className="w-2 h-2 rounded-full bg-accent-light animate-pulse" />
              Now Available in Ernakulam
            </span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black text-white leading-[1.1] tracking-tight mb-6"
          >
            Professional Site{' '}
            <span className="bg-gradient-to-r from-secondary-light to-accent-light bg-clip-text text-transparent">
              Services
            </span>{' '}
            Across Kerala
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg md:text-xl text-white/70 max-w-xl mb-10 leading-relaxed"
          >
            Book Excavators, Cranes, Transportation and Site Services in Minutes.
            Verified providers. Live tracking. Transparent pricing.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <button
              onClick={onLoginClick}
              className="group px-8 py-4 text-base font-bold text-white rounded-2xl gradient-primary border border-white/10 hover:border-white/20 shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 bg-secondary hover:bg-secondary-dark"
            >
              Book a Service
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
            <Link
              to="/provider/register"
              className="px-8 py-4 text-base font-bold text-white rounded-2xl border-2 border-white/20 hover:border-white/40 hover:bg-white/5 transition-all flex items-center justify-center gap-2"
            >
              Become a Partner
            </Link>
          </motion.div>
        </div>
      </motion.div>

      {/* Bottom gradient fade */}
      <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-surface to-transparent" />
    </section>
  )
}

// ─── Trust Section ───────────────────────────────────────────────
function TrustSection() {
  const stats = [
    { icon: Shield, label: 'Verified Providers', value: '500+', color: 'text-secondary' },
    { icon: MapPin, label: 'Live Tracking', value: 'Real-time', color: 'text-accent' },
    { icon: IndianRupee, label: 'Transparent Pricing', value: 'No Hidden Fees', color: 'text-success' },
    { icon: Siren, label: 'Emergency Services', value: '24/7', color: 'text-danger' },
    { icon: CreditCard, label: 'Secure Payments', value: 'Razorpay', color: 'text-secondary' },
    { icon: Headphones, label: 'Professional Support', value: 'Always Available', color: 'text-accent' },
  ]

  return (
    <section id="about" className="py-20 md:py-28">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose <span className="gradient-text">Constructo</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Built for reliability, transparency, and your peace of mind.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 text-center group"
            >
              <div className={`w-12 h-12 rounded-2xl bg-black/5 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
              <p className="font-bold text-lg mb-1">{stat.value}</p>
              <p className="text-text-secondary text-sm">{stat.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Services Section ────────────────────────────────────────────
function ServicesSection({ onLoginClick }: { onLoginClick: () => void }) {
  const services = [
    {
      icon: Shovel,
      name: 'Earthmoving & Excavation',
      description: 'JCB, backhoe loaders, mini excavators for foundation work, trenching, and land clearing.',
      rate: '₹2,500/hr',
      color: 'from-amber-500 to-amber-600',
    },
    {
      icon: HardHat,
      name: 'Crane Services',
      description: 'Mobile cranes, tower cranes for heavy lifting, construction, and industrial applications.',
      rate: '₹5,000/hr',
      color: 'from-secondary to-secondary-dark',
    },
    {
      icon: Truck,
      name: 'Transportation & Haulage',
      description: 'Tipper trucks, trailers for material transport and heavy equipment haulage across Kerala.',
      rate: '₹1,800/hr',
      color: 'from-accent to-accent-dark',
    },
    {
      icon: TreePine,
      name: 'Environmental Services',
      description: 'Soil testing, waste assessment, erosion control, and environmental compliance services.',
      rate: '₹2,000/hr',
      color: 'from-success to-emerald-600',
    },
    {
      icon: Recycle,
      name: 'Waste Management',
      description: 'Construction waste removal, debris clearing, recycling, and site cleanup operations.',
      rate: '₹1,500/hr',
      color: 'from-violet-500 to-purple-600',
    },
  ]

  return (
    <section id="services" className="py-20 md:py-28 bg-surface-dark">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Our <span className="gradient-text">Services</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Professional construction and site services, available on demand.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((service, i) => (
            <motion.div
              key={service.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6 group cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${service.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <service.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-lg font-bold mb-2">{service.name}</h3>
              <p className="text-text-secondary text-sm mb-4 leading-relaxed">{service.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-secondary">From {service.rate}</span>
                <button
                  onClick={onLoginClick}
                  className="px-4 py-2 text-xs font-semibold text-white rounded-lg gradient-primary hover:opacity-90 transition-all"
                >
                  Book Now
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── How It Works ────────────────────────────────────────────────
function HowItWorks() {
  const steps = [
    { icon: CheckCircle2, title: 'Choose Service', desc: 'Select from earthmoving, crane, transport and more.' },
    { icon: MapPin, title: 'Select Location', desc: 'Pin your site on the map or use GPS.' },
    { icon: Clock, title: 'Choose Duration', desc: 'Book by the hour — 1hr to 24hrs.' },
    { icon: CreditCard, title: 'Pay Reservation', desc: 'Secure your booking with a small reservation fee.' },
    { icon: Users, title: 'Provider Assigned', desc: 'A verified provider is matched to your job.' },
    { icon: MapPin, title: 'Track Provider', desc: 'Watch your provider arrive in real time.' },
    { icon: Star, title: 'Service Completed', desc: 'Rate your experience and download invoice.' },
  ]

  return (
    <section id="how-it-works" className="py-20 md:py-28">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            How <span className="gradient-text">Constructo</span> Works
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Book a service in under 60 seconds.
          </p>
        </motion.div>

        <div className="max-w-2xl mx-auto">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="flex gap-5 mb-2 last:mb-0"
            >
              {/* Timeline */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white text-sm font-bold shrink-0">
                  {i + 1}
                </div>
                {i < steps.length - 1 && (
                  <div className="w-0.5 h-12 bg-gradient-to-b from-secondary/40 to-transparent mt-2" />
                )}
              </div>

              {/* Content */}
              <div className="pb-6">
                <h3 className="font-bold text-lg mb-1">{step.title}</h3>
                <p className="text-text-secondary text-sm">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Customer Features ───────────────────────────────────────────
function CustomerFeatures() {
  const features = [
    { icon: MapPin, label: 'Live Provider Tracking' },
    { icon: Clock, label: 'ETA Updates' },
    { icon: Phone, label: 'Call Provider' },
    { icon: MessageCircle, label: 'Chat with Provider' },
    { icon: CreditCard, label: 'Secure Payments' },
    { icon: Shield, label: 'Verified Professionals' },
    { icon: Siren, label: 'Emergency Booking' },
    { icon: IndianRupee, label: 'Transparent Pricing' },
  ]

  return (
    <section className="py-20 md:py-28 bg-surface-dark">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Built for <span className="gradient-text">Customers</span>
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">
            Everything you need for a seamless booking experience.
          </p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card p-5 text-center group"
            >
              <div className="w-11 h-11 rounded-xl bg-secondary/10 flex items-center justify-center mx-auto mb-3 group-hover:bg-secondary/20 transition-colors">
                <f.icon className="w-5 h-5 text-secondary" />
              </div>
              <p className="text-sm font-semibold">{f.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Provider Section ────────────────────────────────────────────
function ProviderSection() {
  const features = [
    { icon: Bell, label: 'Receive Customers', desc: 'Get nearby bookings instantly' },
    { icon: Truck, label: 'Manage Vehicles', desc: 'Track your fleet digitally' },
    { icon: BarChart3, label: 'Track Earnings', desc: 'Real-time revenue analytics' },
    { icon: Zap, label: 'Real-Time Notifications', desc: 'Never miss a booking' },
    { icon: Wallet, label: 'Digital Wallet', desc: 'Fast, secure payouts' },
    { icon: Eye, label: 'Analytics Dashboard', desc: 'Grow your business with data' },
  ]

  return (
    <section id="providers" className="py-20 md:py-28 relative overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-primary to-primary-light" />
      <div className="absolute inset-0">
        <motion.div
          animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
          transition={{ duration: 12, repeat: Infinity }}
          className="absolute top-1/3 right-1/3 w-80 h-80 rounded-full bg-secondary/10 blur-3xl"
        />
      </div>

      <div className="relative z-10 container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Grow Your Business With Constructo
          </h2>
          <p className="text-white/60 max-w-xl mx-auto">
            Receive nearby bookings and manage your business digitally.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
          {features.map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-dark rounded-2xl p-5 group"
            >
              <div className="w-11 h-11 rounded-xl bg-white/10 flex items-center justify-center mb-3 group-hover:bg-white/15 transition-colors">
                <f.icon className="w-5 h-5 text-accent-light" />
              </div>
              <h3 className="font-bold text-white mb-1">{f.label}</h3>
              <p className="text-white/50 text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="text-center">
          <Link
            to="/provider/register"
            className="inline-flex items-center gap-2 px-8 py-4 text-base font-bold text-primary bg-white rounded-2xl hover:bg-white/90 transition-all shadow-lg"
          >
            Become a Partner <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </div>
    </section>
  )
}

// ─── Coverage Section ────────────────────────────────────────────
function CoverageSection() {
  const locations = [
    { name: 'Ernakulam', status: 'live', desc: 'Currently Available' },
    { name: 'Thrissur', status: 'upcoming', desc: 'Coming Soon' },
    { name: 'Kottayam', status: 'upcoming', desc: 'Coming Soon' },
    { name: 'Kozhikode', status: 'upcoming', desc: 'Coming Soon' },
    { name: 'Trivandrum', status: 'upcoming', desc: 'Coming Soon' },
    { name: 'All Kerala', status: 'planned', desc: '2025 Expansion' },
  ]

  return (
    <section className="py-20 md:py-28 bg-surface-dark">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            <span className="gradient-text">Coverage</span> Across Kerala
          </h2>
          <p className="text-text-secondary max-w-xl mx-auto">Expanding across Kerala, one district at a time.</p>
        </motion.div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-2xl mx-auto">
          {locations.map((loc, i) => (
            <motion.div
              key={loc.name}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-5 text-center"
            >
              <div className={`w-3 h-3 rounded-full mx-auto mb-3 ${
                loc.status === 'live' ? 'bg-success animate-pulse' : loc.status === 'upcoming' ? 'bg-warning' : 'bg-text-muted'
              }`} />
              <h3 className="font-bold mb-1">{loc.name}</h3>
              <p className={`text-xs font-semibold ${
                loc.status === 'live' ? 'text-success' : 'text-text-muted'
              }`}>{loc.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Testimonials ────────────────────────────────────────────────
function Testimonials() {
  const reviews = [
    {
      name: 'Rajesh Kumar',
      role: 'Builder, Ernakulam',
      rating: 5,
      text: 'Constructo made it incredibly easy to book an excavator for my site. The provider was professional and arrived on time. Transparent pricing with no hidden charges.',
    },
    {
      name: 'Priya Menon',
      role: 'Project Manager',
      rating: 5,
      text: 'Live tracking feature is amazing. I could see exactly when the crane would arrive. Emergency booking saved my project timeline twice.',
    },
    {
      name: 'Abdul Rashid',
      role: 'Contractor, Thrissur',
      rating: 4,
      text: 'The platform is very easy to use. Booking a tipper truck takes less than a minute. Payments are smooth through Razorpay. Highly recommended.',
    },
  ]

  return (
    <section className="py-20 md:py-28">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            What Our <span className="gradient-text">Customers</span> Say
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-5">
          {reviews.map((review, i) => (
            <motion.div
              key={review.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="glass-card p-6"
            >
              <div className="flex gap-1 mb-4">
                {Array.from({ length: 5 }).map((_, j) => (
                  <Star key={j} className={`w-4 h-4 ${j < review.rating ? 'text-warning fill-warning' : 'text-gray-300'}`} />
                ))}
              </div>
              <p className="text-text-secondary text-sm leading-relaxed mb-5">"{review.text}"</p>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full gradient-primary flex items-center justify-center text-white font-bold text-sm">
                  {review.name[0]}
                </div>
                <div>
                  <p className="font-semibold text-sm">{review.name}</p>
                  <p className="text-text-muted text-xs">{review.role}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ Section ─────────────────────────────────────────────────
function FAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  const faqs = [
    { q: 'What services are available?', a: 'Constructo offers earthmoving & excavation, crane services, transportation & haulage, environmental services, and waste management across Kerala.' },
    { q: 'How does pricing work?', a: 'Pricing is transparent and hourly-based. You see the estimated price before booking. A small reservation fee secures your booking, and the final amount is calculated based on actual hours.' },
    { q: 'Can I track the provider?', a: 'Yes! Once a provider is assigned, you get real-time GPS tracking with ETA updates, similar to ride-hailing apps. You can also call or chat with the provider.' },
    { q: 'How are providers verified?', a: 'All providers go through a verification process including business documentation, vehicle inspection, and background checks before they can receive bookings.' },
    { q: 'How do refunds work?', a: 'Refunds are processed through our support system. Cancellation before provider assignment gets a full refund. After assignment, cancellation charges may apply per our policy.' },
    { q: 'How do emergency bookings work?', a: 'Emergency bookings get priority dispatch with an additional emergency fee. Available 24/7 for urgent site requirements with faster provider assignment.' },
  ]

  return (
    <section className="py-20 md:py-28 bg-surface-dark">
      <div className="container-main">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Frequently Asked <span className="gradient-text">Questions</span>
          </h2>
        </motion.div>

        <div className="max-w-2xl mx-auto space-y-3">
          {faqs.map((faq, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
              className="glass-card overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === i ? null : i)}
                className="w-full flex items-center justify-between p-5 text-left"
              >
                <span className="font-semibold text-sm pr-4">{faq.q}</span>
                <motion.div animate={{ rotate: openIndex === i ? 180 : 0 }} transition={{ duration: 0.2 }}>
                  <ChevronDown className="w-5 h-5 text-text-muted shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === i && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <p className="px-5 pb-5 text-text-secondary text-sm leading-relaxed">{faq.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ──────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="bg-primary text-white pt-16 pb-8">
      <div className="container-main">
        <div className="grid md:grid-cols-4 gap-10 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg">Constructo</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">
              Professional site services across Kerala. Book excavators, cranes, and more.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Services</h4>
            <ul className="space-y-2.5">
              {['Earthmoving', 'Crane Services', 'Transportation', 'Environmental', 'Waste Management'].map(s => (
                <li key={s}><a href="#services" className="text-white/50 hover:text-white text-sm transition-colors">{s}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Company</h4>
            <ul className="space-y-2.5">
              {['About Us', 'How It Works', 'For Providers', 'Support', 'FAQ'].map(s => (
                <li key={s}><a href="#" className="text-white/50 hover:text-white text-sm transition-colors">{s}</a></li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4 text-sm">Contact</h4>
            <ul className="space-y-2.5">
              <li className="flex items-center gap-2 text-white/50 text-sm">
                <Mail className="w-4 h-4" /> support@constructo.in
              </li>
              <li className="flex items-center gap-2 text-white/50 text-sm">
                <Phone className="w-4 h-4" /> +91 484 XXX XXXX
              </li>
              <li className="flex items-center gap-2 text-white/50 text-sm">
                <Globe className="w-4 h-4" /> Ernakulam, Kerala
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-white/40 text-sm">© 2025 Constructo. All rights reserved.</p>
          <div className="flex gap-6">
            <a href="#" className="text-white/40 hover:text-white text-sm transition-colors">Privacy Policy</a>
            <a href="#" className="text-white/40 hover:text-white text-sm transition-colors">Terms of Service</a>
          </div>
        </div>
      </div>
    </footer>
  )
}

// ─── Landing Page (Assembled) ────────────────────────────────────
export default function LandingPage() {
  const [showRoleSelector, setShowRoleSelector] = useState(false)

  return (
    <div className="min-h-screen">
      <Navbar onLoginClick={() => setShowRoleSelector(true)} />
      <HeroSection onLoginClick={() => setShowRoleSelector(true)} />
      <TrustSection />
      <ServicesSection onLoginClick={() => setShowRoleSelector(true)} />
      <HowItWorks />
      <CustomerFeatures />
      <ProviderSection />
      <CoverageSection />
      <Testimonials />
      <FAQ />
      <Footer />
      <RoleSelector isOpen={showRoleSelector} onClose={() => setShowRoleSelector(false)} />
    </div>
  )
}
