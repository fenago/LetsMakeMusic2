import { db } from '../../../../../firebase/config'

export const subscribeAdminOrders = (vendorOrdersTableName, callback) => {
  const ref = db.collection(vendorOrdersTableName).orderBy('createdAt', 'desc')


  return ref.onSnapshot(
    querySnapshot => {
      const data = []
      querySnapshot?.forEach(doc => {
        const { products } = doc.data()
        data.push({
          id: doc.id,
          list: products,
        })
      })
      callback?.(data)
    },
    error => {
      console.warn(error)
    },
  )
}

export const deleteOrder = async orderID => {
  return db
    .collection('restaurant_orders')
    .doc(orderID)
    .delete()
    .then(result => console.warn(result))
}
