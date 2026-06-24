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
  getBooking: (id: number) => api.get(`/bookings/${id}`),
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

export default api
