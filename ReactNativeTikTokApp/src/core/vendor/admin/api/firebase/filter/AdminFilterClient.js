import { db } from '../../../../../firebase/config'

export const subscribeFilters = (table, callback) => {
    const filtersRef = db.collection(table)
  
    return filtersRef.onSnapshot(querySnapshot => {
      const filters = []
      querySnapshot?.forEach(doc => {
        filters.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      callback?.(filters)
    })
  }


  export const updateFilter = async (vendorFilterTableName, filter) => {
    if (!filter?.id) {
      return null
    }
    return db
      .collection(vendorFilterTableName)
      .doc(filter.id)
      .update(filter)
  }
  
  export const addFilter = async (vendorFilterTableName, filter) => {
    const categoriesRef = db.collection(vendorFilterTableName)
  
    const ref = await categoriesRef.add(filter)
    await categoriesRef.doc(ref.id).update({ id: ref.id })
  }
  