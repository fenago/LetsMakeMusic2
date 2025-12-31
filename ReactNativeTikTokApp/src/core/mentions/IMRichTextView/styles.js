import { StyleSheet } from 'react-native'

// Brand colors for consistent styling
const BRAND_COLORS = {
  vibrantTeal: '#1F979E',
  deepMagenta: '#C12D79',
}

const styles = StyleSheet.create({
  url: {
    color: BRAND_COLORS.vibrantTeal,
    textDecorationLine: 'underline',
  },

  email: {
    color: BRAND_COLORS.vibrantTeal,
    textDecorationLine: 'underline',
  },

  phone: {
    color: BRAND_COLORS.vibrantTeal,
    textDecorationLine: 'underline',
  },
  username: {
    color: BRAND_COLORS.vibrantTeal,
    fontWeight: '600',
  },

  hashTag: {
    color: BRAND_COLORS.vibrantTeal,
    fontWeight: '500',
  },
})

export default styles
