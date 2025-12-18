import { db } from '../../../firebase/config'

export const persistOrder = async order => {
  const docRef = await db.collection('restaurant_orders').add(order)
  const generatedId = docRef.id
  await docRef.update({ id: generatedId })
  return docRef
}
