import React from 'react'
import { View, Text, TouchableWithoutFeedback, ScrollView } from 'react-native'
import Modal from 'react-native-modal'
import { useTheme } from '../../../dopebase'
import dynamicStyles from './styles'

export default function IMVendorFilterModal({ filters, isVisible, close }) {
  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)

  if (!filters || Object.keys(filters).length === 0) {
    return (
      <Modal style={styles.modalContainer} isVisible={isVisible}>
        <View style={styles.container}>
          <View style={styles.modalHeaderContainer}>
            <Text />
            <Text style={styles.filterTitle}>Filters</Text>
            <TouchableWithoutFeedback
              style={styles.doneContainer}
              onPress={close}>
              <Text style={styles.filterTitle}>Done</Text>
            </TouchableWithoutFeedback>
          </View>
          <Text style={styles.noFiltersText}>No filters available</Text>
        </View>
      </Modal>
    )
  }

  return (
    <Modal style={styles.modalContainer} isVisible={isVisible}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        style={styles.scrollView}>
        <View style={styles.container}>
          <View style={styles.modalHeaderContainer}>
            <Text />
            <Text style={styles.filterTitle}>Filters</Text>
            <TouchableWithoutFeedback
              style={styles.doneContainer}
              onPress={close}>
              <Text style={styles.filterTitle}>Done</Text>
            </TouchableWithoutFeedback>
          </View>
          {Object.entries(filters).map(([key, value]) => (
            <View key={key} style={styles.singleFilterContainer}>
              <Text style={styles.filterTitle}>{key}</Text>
              <Text style={styles.filterSubtitle}>{value}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Modal>
  )
}