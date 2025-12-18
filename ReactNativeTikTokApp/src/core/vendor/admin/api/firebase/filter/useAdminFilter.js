import { useState, useEffect } from 'react'
import { subscribeFilters as subscribefiltersAPI } from './AdminFilterClient'
import { useVendorConfig } from '../../../../hooks/useVendorConfig'

const useAdminFilters = () => {
  const { config } = useVendorConfig()

  const [filters, setFilters] = useState([])

  useEffect(() => {
    const unsubscribeFilters = subscribefiltersAPI(
      config.tables?.vendorFilterTableName,
      onFiltersUpdate,
    )
    return unsubscribeFilters
  }, [])

  const onFiltersUpdate = list => {
    setFilters(list)
  }

  return { filters }
}

export default useAdminFilters
