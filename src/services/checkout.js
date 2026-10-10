import axios from 'axios'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'

/**
 * Initiate Razorpay checkout for a subscription tier
 * @param {string} tier - "professional" or "enterprise"
 * @returns {Promise<{payment_url: string, session_id: string}>}
 */
export async function initiateCheckout(tier) {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.post(
      `${API_BASE}/api/subscriptions/create-checkout-session`,
      { tier },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    
    // Redirect to Razorpay payment page
    if (response.data.payment_url) {
      window.location.href = response.data.payment_url
    }
    
    return response.data
  } catch (error) {
    console.error('Checkout error:', error)
    throw new Error(
      error.response?.data?.detail || 'Failed to initiate checkout'
    )
  }
}

/**
 * Get current user's subscription status
 * @returns {Promise<Object>} Subscription details
 */
export async function getSubscriptionStatus() {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(
      `${API_BASE}/api/subscriptions/status`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('Error fetching subscription status:', error)
    throw error
  }
}

/**
 * Get current usage statistics
 * @returns {Promise<Object>} Usage data
 */
export async function getUsageStats() {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(
      `${API_BASE}/api/subscriptions/usage`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('Error fetching usage stats:', error)
    throw error
  }
}

/**
 * Cancel current subscription
 * @param {string} reason - Optional cancellation reason
 * @returns {Promise<Object>} Cancellation response
 */
export async function cancelSubscription(reason = null) {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.post(
      `${API_BASE}/api/subscriptions/cancel`,
      { reason },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('Error canceling subscription:', error)
    throw new Error(
      error.response?.data?.detail || 'Failed to cancel subscription'
    )
  }
}

/**
 * Get available subscription plans
 * @returns {Promise<Object>} Plans information
 */
export async function getAvailablePlans() {
  try {
    const response = await axios.get(`${API_BASE}/api/subscriptions/plans`)
    return response.data
  } catch (error) {
    console.error('Error fetching plans:', error)
    throw error
  }
}

/**
 * Get invoice history
 * @returns {Promise<Array>} List of invoices
 */
export async function getInvoices() {
  try {
    const token = localStorage.getItem('token')
    const response = await axios.get(
      `${API_BASE}/api/subscriptions/invoices`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }
    )
    return response.data
  } catch (error) {
    console.error('Error fetching invoices:', error)
    throw error
  }
}

/**
 * Format price in INR
 * @param {number} amount - Amount in rupees
 * @returns {string} Formatted price
 */
export function formatPrice(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount)
}

/**
 * Get tier display name
 * @param {string} tier - Tier identifier
 * @returns {string} Display name
 */
export function getTierDisplayName(tier) {
  const names = {
    'free': 'Free',
    'professional': 'Professional',
    'enterprise': 'Enterprise'
  }
  return names[tier] || tier
}

/**
 * Get tier color classes
 * @param {string} tier - Tier identifier
 * @returns {Object} Tailwind classes for badge
 */
export function getTierColors(tier) {
  const colors = {
    'free': {
      bg: 'bg-gray-100',
      text: 'text-gray-700',
      border: 'border-gray-200'
    },
    'professional': {
      bg: 'bg-blue-100',
      text: 'text-blue-700',
      border: 'border-blue-200'
    },
    'enterprise': {
      bg: 'bg-purple-100',
      text: 'text-purple-700',
      border: 'border-purple-200'
    }
  }
  return colors[tier] || colors['free']
}
