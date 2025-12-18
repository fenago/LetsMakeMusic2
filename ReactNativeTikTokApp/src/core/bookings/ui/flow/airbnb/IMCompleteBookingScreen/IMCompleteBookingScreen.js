import React, { useState, useLayoutEffect } from 'react'
import { View, TouchableOpacity, Text } from 'react-native'
import { useTheme, useTranslations } from '../../../../../dopebase'
import dynamicStyles from './styles'
import { NumberPicker } from '../../../../../dopebase'

const IMCompleteBookingScreen = props => {
  const { navigation, route } = props
  const bookingConfig = route.params.bookingConfig
  const bookingData = route.params.bookingData

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const [guestData, setGuestData] = useState({
    adults: 2,
    children: 0,
    infants: 0,
  })

  const onChange = (key, value) => {
    var gData = { ...guestData }
    gData[key] = value
    setGuestData(gData)
  }

  const onCompleteBooking = () => {}

  useLayoutEffect(() => {
    navigation.setOptions({ headerShown: false })
  }, [navigation])

  return (
    <View style={styles.containerView}>
      <View style={styles.relativeView}>
        <Text style={styles.screenTitle}>{localized('Complete Booking')}</Text>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>{localized('Adults')}</Text>
          <NumberPicker
            initialValue={guestData.adults}
            onChange={value => onChange('adults', value)}
            style={styles.picker}
          />
        </View>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>{localized('Children')}</Text>
          <NumberPicker
            initialValue={guestData.children}
            onChange={value => onChange('children', value)}
            style={styles.picker}
          />
        </View>
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerTitle}>{localized('Infants')}</Text>
          <NumberPicker
            initialValue={guestData.infants}
            onChange={value => onChange('infants', value)}
            style={styles.picker}
          />
        </View>
      </View>
      <View style={styles.buttonContainer}>
        <TouchableOpacity style={styles.button} onPress={onCompleteBooking}>
          <Text style={styles.buttonText}>
            {localized(bookingConfig.buttonLabel)}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}

export default IMCompleteBookingScreen
