import React, { useState, useLayoutEffect, useMemo } from 'react'
import { View, Text, FlatList, TouchableOpacity } from 'react-native'
import { Image } from 'expo-image'
import { EmptyStateView, useTheme, useTranslations } from '../../../dopebase'
import dynamicStyles from './styles'
import IMRatingReview from '../../components/IMRatingReview/IMRatingReview'
import IMVendorFilterModal from '../../components/IMVendorFilterModal/IMVendorFilterModal'
import { useCurrentUser } from '../../../onboarding'

function IMVendorsScreen({
  navigation,
  vendors,
  renderListHeader,
  containerStyle,
  contentContainerStyle,
}) {
  const { theme, appearance } = useTheme()
  const { localized } = useTranslations()
  const styles = dynamicStyles(theme, appearance)

  const [filters, setFilters] = useState({})
  const [isVisible, setVisible] = useState(false)

  const currentUser = useCurrentUser()

  const isAppAdmin = currentUser?.role === 'admin'

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: renderHeaderRight,
    })
  }, [navigation])

  const renderHeaderRight = () => {
    if (isAppAdmin) {
      return (
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('EditVendor')
          }}>
          <Image
            style={styles.icon}
            source={require('../../../../assets/icons/add.png')}
          />
        </TouchableOpacity>
      )
    }
  }

  const onPressVendorItem = item => {
    navigation.navigate('SingleVendor', {
      vendor: item,
    })
  }

  const onPressReview = item => {
    navigation.navigate('Reviews', { entityID: item.id })
  }

  const onViewFilter = currentFilter => {
    setFilters(currentFilter)
    setVisible(true)
  }

  const emptyStateConfig = useMemo(
    () => ({
      title: localized('No Items'),
      description: localized(
        'There are currently no items under this category.',
      ),
    }),
    [localized],
  )
  const renderVendorItem = ({ item }) => {
    let count = item.reviewsCount === undefined ? 0 : item.reviewsCount
    let reviewAvg =
      item.reviewsCount === undefined
        ? 0
        : Math.fround(item.reviewsSum / item.reviewsCount)
    reviewAvg = Number(Math.round(reviewAvg + 'e' + 2) + 'e-' + 2)

    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => onPressVendorItem(item)}>
        <View style={styles.vendorItemContainer}>
          <Image
            placeholderColor={theme.colors[appearance].grey9}
            style={styles.foodPhoto}
            source={{ uri: item.photo }}
          />
          <View style={styles.foodInfo}>
            <Text style={styles.foodName}>
              {item.title ? item.title : item.name}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => onViewFilter(item.filters)}
            style={styles.filterButton}>
            <Text style={styles.filterText}>Vendor Facts</Text>
          </TouchableOpacity>
          <IMRatingReview
            onPressReview={() => onPressReview(item)}
            number={count}
            rating={reviewAvg}
          />
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <IMVendorFilterModal
        isVisible={isVisible}
        filters={filters}
        close={() => setVisible(false)}
      />
      {vendors && vendors.length === 0 && (
        <View style={styles.noDataContainer}>
          <EmptyStateView emptyStateConfig={emptyStateConfig} />
        </View>
      )}
      {vendors && vendors.length > 0 && (
        <FlatList
          style={containerStyle}
          contentContainerStyle={contentContainerStyle}
          initialNumToRender={12}
          data={vendors}
          renderItem={renderVendorItem}
          ListHeaderComponent={renderListHeader}
          keyExtractor={item => `${item.id}`}
        />
      )}
    </View>
  )
}

export default IMVendorsScreen
