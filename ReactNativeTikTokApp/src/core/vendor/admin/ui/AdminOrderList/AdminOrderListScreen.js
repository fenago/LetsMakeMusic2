import React, { useLayoutEffect, useRef } from 'react'
import { Image, FlatList, Text, View } from 'react-native'
import { useTheme, useTranslations, Button } from '../../../../dopebase'
import dynamicStyles from './styles'
import Hamburger from '../../../../../components/Hamburger/Hamburger'
import { useAdminOrders, useAdminOrdersMutations } from '../../api'

function AdminOrderListScreen({ navigation }) {
  const apiManager = useRef(null)

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const { orders } = useAdminOrders()
  const { deleteOrder } = useAdminOrdersMutations()

  useLayoutEffect(() => {
    navigation.setOptions({
      title: localized('Orders'),
      headerRight: null,
      headerLeft: () => (
        <Hamburger
          onPress={() => {
            navigation.openDrawer()
          }}
        />
      ),
    })
  }, [])

  const renderItem = ({ item }) => (
    <View style={styles.container}>
      <View>
        {item?.list?.[0]?.photo && (
          <Image
            animationStyle="fade"
            placeholderColor={theme.colors[appearance].grey9}
            style={styles.photo}
            source={{ uri: item.list[0].photo }}
          />
        )}
        <View style={styles.overlay} />
      </View>
      {item?.list?.map(product => (
        <View style={styles.rowContainer} key={product.id}>
          <Text style={styles.quantityLabel}>{product.quantity}</Text>
          <Text style={styles.title}>{product.name}</Text>
          <Text style={styles.price}>${product.price}</Text>
        </View>
      ))}
      <View style={styles.actionContainer}>
        <Text style={styles.total}>
          Total: $
          {(
            item?.list?.reduce(
              (prev, next) => prev + parseFloat(next.price) * next.quantity,
              0,
            ) || 0
          ).toFixed(2)}
        </Text>
        <Button
          containerStyle={styles.actionButtonContainer}
          textStyle={styles.actionButtonText}
          onPress={() => deleteOrder(item.id)}
          text={localized('Delete')}
        />
      </View>
    </View>
  )
  return (
    <FlatList
      style={styles.flat}
      data={orders}
      renderItem={renderItem}
      keyExtractor={item => `${item.id}`}
      initialNumToRender={5}
    />
  )
}

export default AdminOrderListScreen
