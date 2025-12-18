import { db } from '../../../../../firebase/config'

export const subscribeVendorMarkers = (vendorDeliveriesTableName, callback) => {
  return db.collection(vendorDeliveriesTableName).onSnapshot(
    querySnapshot => {
      const data = []
      querySnapshot?.forEach(doc => {
        const singleOrder = doc.data()
        data.push({
          id: doc.id,
          data: singleOrder,
        })
      })
      callback?.(data)
    },
    error => {
      console.warn(error)
    },
  )
}
