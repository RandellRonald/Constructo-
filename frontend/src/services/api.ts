import axios from 'axios'
import { useAuthStore } from '../stores/authStore'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${API_BASE}/api/v1`,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
})

// Request interceptor: attach JWT
api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor: handle 401 + refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = useAuthStore.getState().refreshToken
      if (refreshToken) {
        try {
          const res = await axios.post(`${API_BASE}/api/v1/auth/refresh`, {
            refresh_token: refreshToken,
          })
          if (res.data.success) {
            const { access_token, refresh_token } = res.data.data
            const user = useAuthStore.getState().user!
            useAuthStore.getState().setAuth(user, access_token, refresh_token)
            original.headers.Authorization = `Bearer ${access_token}`
            return api(original)
          }
        } catch {
          useAuthStore.getState().logout()
        }
      } else {
        useAuthStore.getState().logout()
      }
    }
    return Promise.reject(error)
  }
)

// ─── Auth API ────────────────────────────────────────────────────
export const authAPI = {
  register: (data: Record<string, unknown>) => api.post('/auth/register', data),
  login: (data: Record<string, unknown>) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  sendOTP: (data: Record<string, unknown>) => api.post('/auth/send-otp', data),
  verifyOTP: (data: Record<string, unknown>) => api.post('/auth/verify-otp', data),
  forgotPassword: (data: Record<string, unknown>) => api.post('/auth/forgot-password', data),
  resetPassword: (data: Record<string, unknown>) => api.post('/auth/reset-password', data),
  getProfile: () => api.get('/auth/me'),
  refreshToken: (data: Record<string, unknown>) => api.post('/auth/refresh', data),
}

// ─── Customer API ────────────────────────────────────────────────
export const customerAPI = {
  getDashboard: () => api.get('/customer/dashboard'),
  getNotifications: () => api.get('/customer/notifications'),
}

// ─── Booking API ─────────────────────────────────────────────────
export const bookingAPI = {
  getServices: () => api.get('/services'),
  calculatePrice: (data: Record<string, unknown>) => api.post('/bookings/calculate-price', data),
  createBooking: (data: Record<string, unknown>) => api.post('/bookings', data),
  getActive: () => api.get('/bookings/active'),
  getHistory: () => api.get('/bookings/history'),
  getBooking: (id: number | string) => api.get(`/bookings/${id}`),
  getChatHistory: (bookingId: number | string) => api.get(`/bookings/${bookingId}/chat-history`),
  reverseGeocode: (lat: number, lng: number) => api.get('/bookings/reverse-geocode', { params: { latitude: lat, longitude: lng } }),
}

// ─── Payment API ─────────────────────────────────────────────────
export const paymentAPI = {
  createOrder: (data: Record<string, unknown>) => api.post('/payments/create-order', data),
  verifyPayment: (data: Record<string, unknown>) => api.post('/payments/verify', data),
  getHistory: () => api.get('/payments/history'),
  requestRefund: (data: Record<string, unknown>) => api.post('/payments/refunds/request', data),
}

// ─── Tracking API ────────────────────────────────────────────────
export const trackingAPI = {
  getTracking: (bookingId: number) => api.get(`/bookings/${bookingId}/tracking`),
}

// ─── Review API ──────────────────────────────────────────────────
export const reviewAPI = {
  createReview: (data: Record<string, unknown>) => api.post('/reviews', data),
  getProviderReviews: (providerId: number) => api.get(`/reviews/provider/${providerId}`),
}

// ─── Completion API ──────────────────────────────────────────────
export const completionAPI = {
  getSummary: (bookingId: number | string) => api.get(`/bookings/${bookingId}/completion`),
  confirm: (bookingId: number | string, data?: Record<string, unknown>) => api.post(`/bookings/${bookingId}/confirm`, data || {}),
  dispute: (bookingId: number | string, data: Record<string, unknown>) => api.post(`/bookings/${bookingId}/dispute`, data),
}

// ─── Invoice API ─────────────────────────────────────────────────
export const invoiceAPI = {
  getInvoice: (bookingId: number | string) => api.get(`/bookings/${bookingId}/invoice`),
  downloadPDF: (bookingId: number | string) => api.get(`/bookings/${bookingId}/invoice/pdf`, { responseType: 'blob' }),
}

// ─── Provider API ────────────────────────────────────────────────
export const providerAPI = {
  getDashboard: () => api.get('/provider/dashboard'),
  getActiveJob: () => api.get('/provider/active-job'),
  getJobHistory: (filter?: string) => api.get('/provider/jobs', { params: { filter } }),
  updateJobStatus: (bookingId: number | string, data: Record<string, unknown>) => api.post(`/bookings/${bookingId}/status`, data),
  getWallet: () => api.get('/provider/wallet'),
  requestPayout: (data: Record<string, unknown>) => api.post('/provider/payout', data),
  getBankDetails: () => api.get('/provider/bank-details'),
  updateBankDetails: (data: Record<string, unknown>) => api.post('/provider/bank-details', data),
  getOffers: () => api.get('/provider/offers'),
  respondToOffer: (offerId: number | string, action: 'accept' | 'decline') => api.post(`/provider/offers/${offerId}/respond`, { action }),
}

// ─── Notification API ────────────────────────────────────────────
export const notificationAPI = {
  getAll: () => api.get('/customer/notifications'),
  markRead: (id: number) => api.post(`/customer/notifications/${id}/read`),
  markAllRead: () => api.post('/customer/notifications/read-all'),
}

// ─── Profile API ─────────────────────────────────────────────────
export const profileAPI = {
  getProfile: () => api.get('/auth/me'),
  updateProfile: (data: Record<string, unknown>) => api.put('/auth/profile', data),
  updatePhoto: (formData: FormData) => api.post('/auth/profile/photo', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

// ─── Admin API ───────────────────────────────────────────────────
export const adminAPI = {
  getDashboard: () => api.get('/admin/dashboard'),
  getUsers: (params?: Record<string, unknown>) => api.get('/admin/users', { params }),
  updateUserStatus: (id: number, status: string) => api.put(`/admin/users/${id}/status`, { status }),
  getBookings: (params?: Record<string, unknown>) => api.get('/admin/bookings', { params }),
  getPayouts: (status?: string) => api.get('/admin/payouts', { params: { status } }),
  approvePayout: (id: number, data: { status: 'completed' | 'rejected'; bank_reference?: string; notes?: string }) =>
    api.post(`/admin/payouts/${id}/approve`, data),
  getServices: () => api.get('/admin/services'),
  createService: (data: Record<string, unknown>) => api.post('/admin/services', data),
  updateService: (id: number, data: Record<string, unknown>) => api.put(`/admin/services/${id}`, data),
  getAnalytics: () => api.get('/admin/analytics'),
  getLiveTracking: () => api.get('/admin/live-tracking'),
}

// ─── Maps API ────────────────────────────────────────────────────
export const mapsAPI = {
  getRoute: (originLat: number, originLon: number, destLat: number, destLon: number) =>
    api.get('/maps/route', { params: { origin_lat: originLat, origin_lon: originLon, dest_lat: destLat, dest_lon: destLon } }),
  getEta: (originLat: number, originLon: number, destLat: number, destLon: number) =>
    api.get('/maps/eta', { params: { origin_lat: originLat, origin_lon: originLon, dest_lat: destLat, dest_lon: destLon } }),
  searchAddress: (query: string) =>
    api.get('/maps/search', { params: { q: query } }),
  reverseGeocode: (lat: number, lon: number) =>
    api.get('/maps/reverse-geocode', { params: { lat, lon } }),
  snapToRoad: (lat: number, lon: number) =>
    api.get('/maps/nearest', { params: { lat, lon } }),
}

export default api
