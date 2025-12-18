/**
 * Implement These Methods If You Are Adding Your Own Custom Backend
 */

// method = {
//   addressCity,
//   addressCountry,
//   addressLine1,
//   addressLine2,
//   addressState,
//   addressZip,
//   brand,
//   cardId,
//   country,
//   expMonth,
//   expYear,
//   funding,
//   isApplePayCard,
//   last4,
//   name,
//   userID,
// };

const testPaymentMethod = {
  title: Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay',
  key: Platform.OS === 'ios' ? 'apple' : 'google',
  last4: Platform.OS === 'ios' ? 'Apple Pay' : 'Google Pay',
  iconSource: require('../../../assets/icons/visa.png'),
  isNativePaymentMethod: true,
}

const subscribePaymentMethods = (userID, callback) => {
  if (!userID) {
    return
  }
  // Implement this if you want to subscribe to payment methods from your backend
  return [testPaymentMethod, testPaymentMethod, testPaymentMethod]
}

const addUserPaymentMethod = async paymentMethod => {
  // Implement this if you want to add a new payment method to your backend
}

const deleteFromUserPaymentMethods = async cardId => {
  // Implement this if you want to delete a payment method from your backend
}

export {
  subscribePaymentMethods,
  addUserPaymentMethod,
  deleteFromUserPaymentMethods,
}
