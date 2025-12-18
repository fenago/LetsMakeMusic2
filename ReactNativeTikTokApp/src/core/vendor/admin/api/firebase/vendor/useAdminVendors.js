import { useState, useEffect } from 'react'
import { subscribeAdminVendors as subscribeAdminVendorsAPI } from './AdminVendorClient'
import { useVendorAdminConfig } from '../../../hooks/useVendorAdminConfig'

const useAdminOrders = () => {
  const { config } = useVendorAdminConfig()

  const [vendors, setVendors] = useState([])

  useEffect(() => {
    const unsubscribeAdminVendors = subscribeAdminVendorsAPI(
      config.tables?.vendorsTableName,
      onOrdersUpdate,
    )
    return unsubscribeAdminVendors
  }, [])

  const onOrdersUpdate = list => {
    setVendors(list)
  }

  return { vendors }
}

export default useAdminOrders
