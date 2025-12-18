import React, { useState, useEffect } from 'react'
import {
  Modal,
  View,
  Text,
  Image,
  TouchableOpacity,
  Platform,
} from 'react-native'
import { useSelector, useDispatch } from 'react-redux'
import { useTheme, useTranslations } from '../../dopebase'
import Swiper from 'react-native-swiper'
import {
  initConnection,
  requestSubscription,
  getSubscriptions,
} from 'react-native-iap'
import { setPlans } from '../redux'
import dynamicStyles from './styles'
import { useIAPConfig } from '../hooks/useIAPConfig'

export default function IMSubscriptionScreen(props) {
  const {
    visible,
    onClose,
    processing,
    setProcessing,
    onSetSubscriptionPeriod,
  } = props

  const dispatch = useDispatch()

  const subscriptions = useSelector(state => state.inAppPurchase.plans)

  const [selectedSubscriptionIndex, setSelectedSubscriptionIndex] = useState(0)
  const [selectedSubscriptionPlan, setSelectedSubscriptionPlan] = useState({})
  const { config } = useIAPConfig()

  const [focusedSlide, setFocusedSlide] = useState(
    config.subscriptionSlideContents[0],
  )

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  useEffect(() => {
    if (subscriptions.length === 0) {
      ;(async () => {
       // await initConnection()
        getIAPProducts()
      })()
    }
  }, [subscriptions])

  const onSubscriptioinPlanPress = (item, index) => {
    setSelectedSubscriptionIndex(index)
    setSelectedSubscriptionPlan(item)
  }

  const handleSubscription = async () => {
    const period =
      selectedSubscriptionPlan.subscriptionPeriodUnitIOS ||
      selectedSubscriptionPlan.subscriptionPeriodAndroid
    try {
      setProcessing(true)
      onSetSubscriptionPeriod(period.toLowerCase())
      await requestSubscription(selectedSubscriptionPlan.productId)
    } catch (err) {
      alert(
        'We turned off the subscriptions for demo purposes, but this feature is fully supported in the real apps.',
      )
      setProcessing(false)
    }
  }

  const getIAPProducts = async () => {
    const fakePlans = [
      {
        localizedPrice: '$3.99',
        productId: 'monthly_vip_subscription',
        sku: 'monthly_vip_subscription',
        subscriptionPeriodAndroid: 'P1M',
        subscriptionPeriodIOS: 'P1M',
        subscriptionPeriodUnitIOS: 'month',
      },
      {
        localizedPrice: '$19.99',
        productId: 'annual_vip_subscription',
        sku: 'annual_vip_subscription',
        subscriptionPeriodAndroid: 'P1Y',
        subscriptionPeriodIOS: 'P1Y',
        subscriptionPeriodUnitIOS: 'year',
      },
    ]
    try {
      const plans = await getSubscriptions(config.IAP_SKUS)

      if (plans.length > 0) {
        setSelectedSubscriptionPlan(plans[0])
        dispatch(setPlans({ plans }))
        return
      } else {
        // In development mode, we don't have any subscription plans, so we fake them
        setSelectedSubscriptionPlan(fakePlans[0])
        dispatch(setPlans({ plans: fakePlans }))
        return
      }
    } catch (err) {
      console.log(err)
      // In development mode, we don't have any subscription plans, so we fake them
      setSelectedSubscriptionPlan(fakePlans[0])
      dispatch(setPlans({ plans: fakePlans }))
    }
  }

  const onSwipeIndexChange = index => {
    setFocusedSlide(config.subscriptionSlideContents[index])
  }

  const renderInactiveDot = () => <View style={styles.inactiveDot} />

  const renderActiveDot = () => <View style={styles.activeDot} />

  const renderSubScriptionPlan = (item, index) => {
    const price = item.localizedPrice
      ? item.localizedPrice
      : Platform.OS === 'ios'
      ? item.price
      : item.productId === 'annual_vip_subscription'
      ? localized('$29.99')
      : localized('$4.99')
    return (
      <TouchableOpacity
        activeOpacity={0.7}
        key={index}
        onPress={() => onSubscriptioinPlanPress(item, index)}
        style={styles.subscriptionContainer}>
        <View style={styles.selectContainer}>
          <View
            style={[
              styles.tickIconContainer,
              selectedSubscriptionIndex === index &&
                styles.selectedSubscription,
            ]}>
            {selectedSubscriptionIndex === index && (
              <Image
                style={styles.tick}
                source={require('../assets/tick.png')}
              />
            )}
          </View>
        </View>
        <View style={styles.rateContainer}>
          <Text style={styles.rateText}>
            {price + '/'}
            <Text style={styles.monthText}>
              {Platform.OS === 'ios'
                ? item?.subscriptionPeriodUnitIOS?.toLowerCase()
                : item.productId === 'annual_vip_subscription'
                ? localized('year')
                : localized('month')}
            </Text>
          </Text>
        </View>
        <View style={styles.trialOptionContainer}>
          <View style={styles.trialContainer}>
            <Text style={styles.trialText}>{'Free Trial'}</Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <Modal
      visible={visible}
      onDismiss={onClose}
      onRequestClose={onClose}
      animationType={'fade'}
      presentationStyle={'pageSheet'}>
      <View style={styles.container}>
        <View style={styles.carouselContainer}>
          <Swiper
            onIndexChanged={onSwipeIndexChange}
            removeClippedSubviews={true}
            containerStyle={{ flex: 1 }}
            dot={renderInactiveDot()}
            activeDot={renderActiveDot()}
            paginationStyle={{
              bottom: -20,
            }}
            loop={false}>
            {config.subscriptionSlideContents.map(
              (subscriptionSlideContents, index) => (
                <View 
                key={`${subscriptionSlideContents.title}-${index}`}
                style={styles.slideContainer}>
                  <Image
                    style={styles.carouselImage}
                    source={subscriptionSlideContents.src}
                    resizeMode="contain"
                  />
                  <Text style={styles.headerTitle}>
                    {subscriptionSlideContents.title}
                  </Text>
                  <Text style={styles.titleDescription}>
                    {subscriptionSlideContents.description}
                  </Text>
                </View>
              ),
            )}
          </Swiper>
        </View>
        <View style={styles.subscriptionsContainer}>
          <View style={styles.subscriptionPlansContainer}>
            {subscriptions.map(renderSubScriptionPlan)}
          </View>
        </View>
        <View style={styles.bottomContainer}>
          <Text style={styles.bottomHeaderTitle}>
            {localized('Recurring billing, cancel anytime')}
          </Text>
          <Text style={styles.titleDescription}>
            {localized(
              'We are going to charge you every payment period the amount you displayed above.',
            )}
          </Text>
          <TouchableOpacity
            // disabled={processing || subscriptions.length < 1}
            onPress={handleSubscription}
            style={styles.bottomButtonContainer}>
            <Text style={styles.buttonTitle}>{'Purchase'}</Text>
          </TouchableOpacity>
          {Platform.OS !== 'ios' && (
            <TouchableOpacity onPress={onClose}>
              <Text style={styles.cancelTitle}>{'Cancel'}</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
    </Modal>
  )
}
