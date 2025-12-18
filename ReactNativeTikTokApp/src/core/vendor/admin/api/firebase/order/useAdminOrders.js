import { useState, useEffect } from 'react'
import { subscribeAdminOrders as subscribeAdminOrdersAPI } from './AdminOrderClient'
import { useVendorAdminConfig } from '../../../hooks/useVendorAdminConfig'

const useAdminOrders = () => {
  const {config} = useVendorAdminConfig()
  const [orders, setOrders] = useState([])

  useEffect(() => {
    const unsubscribeAdminOrders = subscribeAdminOrdersAPI(
      config.tables?.vendorOrdersTableName,
      onOrdersUpdate,
    )
    return unsubscribeAdminOrders
  }, [])

  const onOrdersUpdate = list => {
    setOrders(list)
  }

  return { orders }
}

export default useAdminOrders
