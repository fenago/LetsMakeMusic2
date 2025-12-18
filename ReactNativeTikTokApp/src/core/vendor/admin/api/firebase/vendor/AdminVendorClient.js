import { db } from '../../../../../firebase/config'

export const subscribeAdminVendors = (vendorsTableName, callback) => {
  const ref = db.collection(vendorsTableName)

  return ref.onSnapshot(
    querySnapshot => {
      const data = []
      querySnapshot?.forEach(doc => {
        const vendorData = doc.data()
        data.push({
          id: doc.id,
          data: vendorData,
        })
      })
      callback?.(data)
    },
    error => {
      console.warn(error)
    },
  )
}


export const addVendor = async (vendorsTableName, newVendor) => {
  try {
    const docRef = await db.collection(vendorsTableName).add(newVendor);
    const vendorWithId = {
      ...newVendor,
      id: docRef.id,
    };
    await docRef.update({ id: docRef.id });
    
    return vendorWithId;
  } catch (err) {
    console.log('Error adding vendor:', err);
    throw err;
  }
};