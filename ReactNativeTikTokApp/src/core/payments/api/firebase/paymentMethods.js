import { db } from '../../../firebase/config'

const subscribePaymentMethods = (userID, callback) => {
  if (!userID) {
    return
  }
  return db
    .collection('payment_methods')
    .where('userID', '==', userID)
    .onSnapshot(querySnapshot => {
      const paymentMethods = []

      querySnapshot?.forEach(doc => {
        const data = doc.data()

        paymentMethods.push(data)
      })

      return callback(paymentMethods)
    })
}

const addUserPaymentMethod = async paymentMethod => {
  try {
    await db
      .collection('payment_methods')
      .doc(paymentMethod.id)
      .set(paymentMethod)
  } catch (error) {
    return { error, success: false }
  }
}

const deleteFromUserPaymentMethods = async cardId => {
  try {
    db.collection('payment_methods').doc(cardId).delete()
  } catch (error) {
    return { error, success: false }
  }
}

export {
  subscribePaymentMethods,
  addUserPaymentMethod,
  deleteFromUserPaymentMethods,
}
