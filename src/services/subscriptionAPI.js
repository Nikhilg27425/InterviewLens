import api from './api'

export const subscriptionAPI = {
  getMySubscription: () =>
    api.get('/api/subscriptions/me').then((r) => r.data),

  createOrder: (tier) =>
    api.post('/api/subscriptions/create-order', { tier }).then((r) => r.data),

  verifyPayment: (data) =>
    api.post('/api/subscriptions/verify-payment', data).then((r) => r.data),

  getPaymentHistory: () =>
    api.get('/api/subscriptions/history').then((r) => r.data),
}
