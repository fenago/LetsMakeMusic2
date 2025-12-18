import { useState, useEffect } from 'react'
import { subscribeVendorMarkers as subscribeVendorMarkersAPI } from './AdminDeliveryMapClient'
import { useVendorAdminConfig } from '../../../hooks/useVendorAdminConfig'

const useAdminDeliveryMapMarkers = () => {
  const { config } = useVendorAdminConfig()

  const [markers, setMarkers] = useState([])

  useEffect(() => {
    const unsubscribeVendorMarkers = subscribeVendorMarkersAPI(
      config.tables.vendorDeliveriesTableName,
      onMarkersUpdate,
    )
    return unsubscribeVendorMarkers
  }, [])

  const onMarkersUpdate = list => {
    setMarkers(list)
  }

  return { markers }
}

export default useAdminDeliveryMapMarkers
