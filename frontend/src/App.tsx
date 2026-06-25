import { Routes, Route, Navigate } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { useAuthStore } from './stores/authStore'

// Lazy load pages for code splitting
const LandingPage = lazy(() => import('./features/landing/LandingPage'))
const CustomerLogin = lazy(() => import('./features/auth/CustomerLogin'))
const CustomerRegister = lazy(() => import('./features/auth/CustomerRegister'))
const ProviderLogin = lazy(() => import('./features/auth/ProviderLogin'))
const ProviderRegister = lazy(() => import('./features/auth/ProviderRegister'))
const CustomerDashboard = lazy(() => import('./features/customer/dashboard/DashboardPage'))
const BookingPage = lazy(() => import('./features/customer/booking/BookingPage'))
const BookingHistoryPage = lazy(() => import('./features/customer/booking/BookingHistoryPage'))
const PaymentPage = lazy(() => import('./features/customer/payment/PaymentPage'))
const TrackingPage = lazy(() => import('./features/customer/tracking/TrackingPage'))
const NotificationsPage = lazy(() => import('./features/customer/notifications/NotificationsPage'))
const ProfilePage = lazy(() => import('./features/customer/profile/ProfilePage'))
const ProviderDashboard = lazy(() => import('./features/provider/dashboard/ProviderDashboard'))
const JobNavigation = lazy(() => import('./features/provider/job/JobNavigation'))
const CompletionPage = lazy(() => import('./features/provider/completion/CompletionPage'))
const JobHistoryPage = lazy(() => import('./features/provider/jobs/JobHistoryPage'))
const WalletPage = lazy(() => import('./features/provider/wallet/WalletPage'))
const ProviderProfilePage = lazy(() => import('./features/provider/profile/ProviderProfilePage'))
const CompletionReview = lazy(() => import('./features/customer/completion/CompletionReview'))
const InvoicePage = lazy(() => import('./features/customer/invoice/InvoicePage'))
const ReviewPage = lazy(() => import('./features/customer/reviews/ReviewPage'))
const AdminLogin = lazy(() => import('./features/admin/AdminLogin'))
const AdminDashboard = lazy(() => import('./features/admin/AdminDashboard'))

// Loading fallback
function PageLoader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface">
      <div className="text-center">
        <div className="w-12 h-12 rounded-full border-3 border-secondary border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-text-secondary text-sm">Loading...</p>
      </div>
    </div>
  )
}

// Protected route wrapper
function ProtectedRoute({ children, role }: { children: React.ReactNode; role: string }) {
  const { user, isAuthenticated } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/" replace />
  if (user?.role !== role) return <Navigate to="/" replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />

        {/* Customer Auth */}
        <Route path="/customer/login" element={<CustomerLogin />} />
        <Route path="/customer/register" element={<CustomerRegister />} />

        {/* Provider Auth */}
        <Route path="/provider/login" element={<ProviderLogin />} />
        <Route path="/provider/register" element={<ProviderRegister />} />

        {/* Customer Protected Routes */}
        <Route path="/customer/dashboard" element={
          <ProtectedRoute role="customer"><CustomerDashboard /></ProtectedRoute>
        } />
        <Route path="/customer/book" element={
          <ProtectedRoute role="customer"><BookingPage /></ProtectedRoute>
        } />
        <Route path="/customer/bookings" element={
          <ProtectedRoute role="customer"><BookingHistoryPage /></ProtectedRoute>
        } />
        <Route path="/customer/payment" element={
          <ProtectedRoute role="customer"><PaymentPage /></ProtectedRoute>
        } />
        <Route path="/customer/tracking/:bookingId" element={
          <ProtectedRoute role="customer"><TrackingPage /></ProtectedRoute>
        } />
        <Route path="/customer/notifications" element={
          <ProtectedRoute role="customer"><NotificationsPage /></ProtectedRoute>
        } />
        <Route path="/customer/profile" element={
          <ProtectedRoute role="customer"><ProfilePage /></ProtectedRoute>
        } />
        <Route path="/customer/completion/:id" element={
          <ProtectedRoute role="customer"><CompletionReview /></ProtectedRoute>
        } />
        <Route path="/customer/invoice/:id" element={
          <ProtectedRoute role="customer"><InvoicePage /></ProtectedRoute>
        } />
        <Route path="/customer/review/:id" element={
          <ProtectedRoute role="customer"><ReviewPage /></ProtectedRoute>
        } />

        {/* Provider Protected Routes */}
        <Route path="/provider/dashboard" element={
          <ProtectedRoute role="provider"><ProviderDashboard /></ProtectedRoute>
        } />
        <Route path="/provider/job/:id" element={
          <ProtectedRoute role="provider"><JobNavigation /></ProtectedRoute>
        } />
        <Route path="/provider/job/:id/complete" element={
          <ProtectedRoute role="provider"><CompletionPage /></ProtectedRoute>
        } />
        <Route path="/provider/jobs" element={
          <ProtectedRoute role="provider"><JobHistoryPage /></ProtectedRoute>
        } />
        <Route path="/provider/wallet" element={
          <ProtectedRoute role="provider"><WalletPage /></ProtectedRoute>
        } />
        <Route path="/provider/profile" element={
          <ProtectedRoute role="provider"><ProviderProfilePage /></ProtectedRoute>
        } />

        {/* Admin Protected Routes */}
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={
          <ProtectedRoute role="admin"><AdminDashboard /></ProtectedRoute>
        } />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  )
}
