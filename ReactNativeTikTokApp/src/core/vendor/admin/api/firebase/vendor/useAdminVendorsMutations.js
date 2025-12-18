import { addVendor as addVendorAPI } from './AdminVendorClient'
import { useVendorAdminConfig } from '../../../hooks/useVendorAdminConfig'

const useAdminVendorsMutations = () => {
  const { config } = useVendorAdminConfig()

  const addVendor = newVendor => {
    return addVendorAPI(config.tables?.vendorsTableName, newVendor)
  }
  return { addVendor }
}

export default useAdminVendorsMutations
 