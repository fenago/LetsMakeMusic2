
import {
    addCategory as addCategoryAPI,
    updateCategory as updateCategoryAPI,
  } from './AdminCategoryClient'
  import { useVendorConfig } from '../../../../hooks/useVendorConfig'
  
  const useAdminCategoryMutations = () => {
    const { config } = useVendorConfig()
  
    const addCategory = Category => {
      return addCategoryAPI(config.tables?.vendorCategoriesTableName, Category)
    }
  
  
    const updateCategory = Category => {
      return updateCategoryAPI(config.tables?.vendorCategoriesTableName, Category)
    }
  
    return { addCategory, updateCategory }
  }
  
  export default useAdminCategoryMutations

  