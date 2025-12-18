import React, { useState, useRef } from 'react'
import { Modal, View, Text, TextInput } from 'react-native'
import {
  useTheme,
  useTranslations,
  Button,
  KeyboardAvoidingView,
  IconButton,
} from '../../../dopebase'
import dynamicStyles from './styles'

export default function AddReviewModal({ submitReview, close, isVisible }) {
  const [rating, setRating] = useState(4)
  const [review, setReview] = useState('')

  const { localized } = useTranslations()
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  const inputRef = useRef(null)

  const onTypeReview = text => {
    setReview(text)
  }

  const onSubmit = () => {
    if (review.length === 0) {
      alert(localized('Please write your review before submitting.'))
      return
    }
    submitReview(rating, review)
    close()
  }
  return (
    <Modal
      onSwipeComplete={close}
      onShow={() => inputRef.current.focus()}
      swipeDirection="down"
      visible={isVisible}
      backdropColor={'grey'}>
      <KeyboardAvoidingView style={styles.container} verticalOffset={-60}>
        <View style={{ flex: 1 }}>
          <View style={[styles.bar, styles.navBarContainer]}>
            <Text style={styles.headerTitle}>{localized('Add Review')}</Text>
            <Text
              style={[styles.rightButton, styles.selectorRightButton]}
              onPress={close}>
              {localized('Cancel')}
            </Text>
          </View>
          <View style={styles.starContainer}>
            {[1, 2, 3, 4, 5].map(item => (
              <IconButton
                source={
                  item <= rating
                    ? require('../../assets/star-filled-icon.png')
                    : require('../../assets/star-outlined-icon.png')
                }
                width={40}
                height={40}
                onPress={() => setRating(item)}
                tintColor={theme.colors[appearance].primaryForeground}
              />
            ))}
          </View>
          <TextInput
            ref={inputRef}
            placeholder={localized('Please write your review here')}
            placeholderTextColor={theme.colors[appearance].secondaryText}
            multiline
            onChangeText={onTypeReview}
            style={styles.input}
            autoFocus={true}
            textAlignVertical="top"
          />
          <Button
            containerStyle={styles.actionButtonContainer}
            textStyle={styles.actionButtonText}
            onPress={onSubmit}
            text={localized('Add Review')}
          />
        </View>
      </KeyboardAvoidingView>
    </Modal>
  )
}
