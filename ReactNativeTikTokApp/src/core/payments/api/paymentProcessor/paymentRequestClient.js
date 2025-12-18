// import { requestOneTimePayment } from 'react-native-paypal'

const makeRequest = async (appConfig, endPoint, body) => {
  let method = body ? 'post' : 'get'
  try {
    const response = await fetch(appConfig.stripeConfig.serverURL + endPoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    const data = await response.json()
    console.log(JSON.stringify(data))
    return { ...data, success: true }
  } catch (error) {
    const stripeError = error.response ? error.response : error
    console.log('serverError: ', stripeError)
    return { stripeError, success: false }
  }
}

export const fetchPaypalTokenFromServer = async appConfig => {
  const endPoint = 'create_token'
  const res = await makeRequest(appConfig, endPoint)
  return res?.data
}

export const checkoutPaypal = async (appConfig, options) => {
  const endPoint = 'checkout'
  const body = {
    payment_method_nonce: options.nonce,
    amount: options.amount,
  }

  const res = await makeRequest(appConfig, endPoint, body)

  return res?.data
}

export const chargePaypalCustomer = async ({ amount, currency, token }) => {
  return new Promise(resolve => {
    requestOneTimePayment(token, {
      amount: amount, // required
      currency: currency,
      localeCode: 'en_US',
      shippingAddressRequired: false,
    })
      .then(chargeResponse => resolve({ success: true, ...chargeResponse }))
      .catch(err => resolve({ success: false, error: err }))
  })
}

export const chargeStripeCustomer = async (appConfig, body) => {
  const endPoint = 'charge-card-off-session'

  return await makeRequest(appConfig, endPoint, body)
}

export const detachCustomerCard = async (appConfig, body) => {
  const endPoint = 'detach-card'

  return await makeRequest(appConfig, endPoint, body)
}

export const setupStripe = async (appConfig, email) => {
  const endPoint = 'create-setup-intent'
  const body = {
    email,
    currency: 'usd',
  }

  return await makeRequest(appConfig, endPoint, body)
}

export const getPaymentSheetKeys = async (
  appConfig,
  customerId,
  currency,
  amount,
) => {
  const endPoint = 'payment-sheet'
  const body = {
    customerId,
    currency,
    amount,
  }

  return await makeRequest(appConfig, endPoint, body)
}

export const getStripeKeys = appConfig => {
  const endPoint = 'stripe-key'

  return makeRequest(appConfig, endPoint)
}
