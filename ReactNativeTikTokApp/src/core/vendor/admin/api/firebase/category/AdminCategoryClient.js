import { db } from '../../../../../firebase/config'

export const subscribeCategories = (table, callback) => {
    const categoriesRef = db.collection(table).orderBy('order')
  
    return categoriesRef.onSnapshot(querySnapshot => {
      const catagories = []
      querySnapshot?.forEach(doc => {
        catagories.push({
          id: doc.id,
          ...doc.data(),
        })
      })
      callback?.(catagories)
    })
  }


  export const updateCategory = async (vendorCategoriesTableName, category) => {
    if (!category?.id) {
      return null
    }
    return db
      .collection(vendorCategoriesTableName)
      .doc(category.id)
      .update(category)
  }
  
  export const addCategory = async (vendorCategoriesTableName, category) => {
    const categoriesRef = db.collection(vendorCategoriesTableName)
  
    const ref = await categoriesRef.add(category)
    await categoriesRef.doc(ref.id).update({ id: ref.id })
  }
  