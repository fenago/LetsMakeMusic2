
import {
    addFilter as addFilterAPI,
    updateFilter as updateFilterAPI,
  } from './AdminFilterClient'
  import { useVendorConfig } from '../../../../hooks/useVendorConfig'
  
  const useAdminFilterMutations = () => {
    const { config } = useVendorConfig()
  
    const addFilter = Filter => {
      return addFilterAPI(config.tables?.vendorFilterTableName, Filter)
    }
  
  
    const updateFilter = Filter => {
      return updateFilterAPI(config.tables?.vendorFilterTableName, Filter)
    }
  
    return { addFilter, updateFilter }
  }
  
  export default useAdminFilterMutations

  