import React, { useState, useRef } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
} from 'react-native'
import { Image } from 'expo-image'

import { useTheme, Button, ActivityIndicator } from '../../../../dopebase'
import { useAdminVendorsMutations } from '../../api'
import MapView, { Marker } from 'react-native-maps'
import { storageAPI } from '../../../../media'
import Icon from 'react-native-vector-icons/FontAwesome'
import useAdminFilters from '../../api/firebase/filter/useAdminFilter'
import { Picker } from '@react-native-picker/picker'
import dynamicStyles from './styles'
import { useAdminCategories } from '../../../admin/api'
import ModalSelector from 'react-native-modal-selector'

export default function AdminVendorModal({ isVisible, close }) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [vendorImages, setVendorImages] = useState([])
  const [photoFiles, setPhotoFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedFilters, setSelectedFilters] = useState([])
  const [selectedFilterValues, setSelectedFilterValues] = useState({})
  
  const [region, setRegion] = useState({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  })
  const [selectedCategory, setSelectedCategory] = useState(null)

  const { theme, appearance } = useTheme()
  const styles = dynamicStyles(theme, appearance)
  const { addVendor } = useAdminVendorsMutations()
  const { filters } = useAdminFilters()
  const { categories } = useAdminCategories()
  const scrollViewRef = useRef(null)

  const getPermissionAsync = async () => {
    if (Platform.OS === 'ios') {
      const permissionResult =
        await ImagePicker.requestMediaLibraryPermissionsAsync(false)
      if (permissionResult.granted === false) {
        alert('Sorry, we need camera roll permissions to make this work.')
        return false
      }
      return true
    }
    return true
  }

  const handleSelectImage = async () => {
    const hasPermission = await getPermissionAsync()
    if (!hasPermission) return

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsMultipleSelection: true,
        allowsEditing: false,
        quality: 1,
      })

      if (!result.canceled) {
        const newImages = result.assets.map(asset => asset.uri)
        setVendorImages([...vendorImages, ...newImages])
        setPhotoFiles([...photoFiles, ...result.assets])
      }
    } catch (error) {
      console.log('Error selecting images:', error)
      alert('Error selecting images. Please try again.')
    }
  }

  const removeImage = index => {
    const updatedImages = vendorImages.filter((_, i) => i !== index)
    const updatedFiles = photoFiles.filter((_, i) => i !== index)
    setVendorImages(updatedImages)
    setPhotoFiles(updatedFiles)
  }


  const toggleFilter = (filterId) => {
    setSelectedFilters(current => {
      if (current.includes(filterId)) {
        const newFilters = current.filter(id => id !== filterId)
        const newSelectedValues = { ...selectedFilterValues }
        delete newSelectedValues[filterId]
        setSelectedFilterValues(newSelectedValues)
        return newFilters
      } else {
        return [...current, filterId]
      }
    })
  }

  const handleOptionSelection = (filterId, value) => {
    setSelectedFilterValues(prev => ({
      ...prev,
      [filterId]: value
    }))
  }

  const renderFilterButtons = () => (
    <ScrollView 
      horizontal 
      showsHorizontalScrollIndicator={false} 
      style={styles.filterButtonsScroll}
    >
      {filters.map((filter) => (
        <TouchableOpacity
          key={filter.id}
          style={[
            styles.filterAddButton,
            selectedFilters.includes(filter.id) &&
            styles.filterAddButtonSelected
          ]}
          onPress={() => toggleFilter(filter.id)}
        >
          <Text 
            style={[
              styles.filterAddButtonText,
              selectedFilters.includes(filter.id) &&
              styles.filterAddButtonTextSelected
            ]}
          >
            {filter.name}
            {selectedFilters.includes(filter.id) ? ' ✓' : ' +'}
          </Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  )

  const renderSelectedFiltersDropdowns = () => (
    <View style={styles.selectedFiltersContainer}>
      {selectedFilters.map((filterId) => {
        const filter = filters.find(f => f.id === filterId);
        return (
          <View key={filterId} style={styles.selectedFilterItem}>
            <Text style={styles.selectedFilterLabel}>{filter.name}</Text>
            <View style={styles.filterDropdownContainer}>
              <Picker
                selectedValue={
                  selectedFilterValues[filterId] || filter.options[0]}
                style={styles.filterDropdown}
                onValueChange={(itemValue) => handleOptionSelection(filterId, itemValue)}
              >
                {filter.options.map((option) => (
                  <Picker.Item key={option} label={option} value={option} />
                ))}
              </Picker>
            </View>
          </View>
        );
      })}
    </View>
  )

  const submit = async () => {
    if (!title.trim() || !description.trim() || vendorImages.length === 0) {
      alert('Please fill all fields and select at least one image')
      return
    }

    setLoading(true)

    try {
      const uploadedImageUrls = []
      for (const photoFile of photoFiles) {
        const response = await storageAPI.processAndUploadMediaFile(photoFile)
        if (response.downloadURL) {
          uploadedImageUrls.push(response.downloadURL)
        }
      }

      if (uploadedImageUrls.length === 0) {
        throw new Error('Failed to upload images.')
      }
      const filterData = {}
      selectedFilters.forEach(filterId => {
        const filter = filters.find(f => f.id === filterId)
        filterData[filter.name] = selectedFilterValues[filterId] || filter.options[0]
      })

      const newVendor = {
        title,
        description,
        photos: uploadedImageUrls,
        photo: uploadedImageUrls.length > 0 ? uploadedImageUrls[0] : null,
        location: { latitude: region.latitude, longitude: region.longitude },
        filters: filterData,
        categoryID: selectedCategory?.key,
      }
      await addVendor(newVendor)
      close()
    } catch (error) {
      console.error('Error adding vendor:', error)
      alert('An error occurred. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal 
      visible={isVisible} 
      animationType="slide" 
      transparent
      onRequestClose={close}
    >
      <View style={styles.modalContainer}>
        <ScrollView 
          ref={scrollViewRef}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.scrollViewContent}
          style={styles.scrollView}
        >
          <View style={styles.modalContent}>
            <Text style={styles.title}>Add New Vendor</Text>

            <TextInput
              style={styles.input}
              placeholder="Vendor Title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#aaa"
            />

            <TextInput
              style={[styles.input, { height: 80 }]}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              placeholderTextColor="#aaa"
              multiline
            />

            <Text style={styles.sectionTitle}>Select Category</Text>
            <ModalSelector
              data={categories.map(category => ({
                key: category.id,
                label: category.title,
              }))}
              initValue="Select a category"
              onChange={option => {
                setSelectedCategory(option);
              }}
              style={styles.categorySelector}
              selectTextStyle={styles.categorySelectText}
              optionTextStyle={styles.categoryOptionText}
            >
              <View style={[styles.row, { justifyContent: 'space-between' }]}>
                <Text style={styles.value}>
                  {selectedCategory ? selectedCategory.label : 'Select a category...'}
                </Text>
              </View>
            </ModalSelector>

            <Text style={styles.sectionTitle}>Select Filters</Text>
            {renderFilterButtons()}
            {renderSelectedFiltersDropdowns()}

            <TouchableOpacity
              style={styles.imagePicker}
              onPress={handleSelectImage}>
              <Text style={styles.imagePickerText}>Select Photos</Text>
            </TouchableOpacity>

            <ScrollView horizontal style={styles.imageScroll}>
              {vendorImages.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image
                    source={{ uri: image }}
                    style={styles.imagePreview}
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}>
                    <Icon name="times" size={16} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>


            <MapView
              initialRegion={region}
              style={[
                styles.map,
                { width: '100%', height: 200, marginBottom: 15 },
              ]}
              onPress={({ nativeEvent }) =>
                setRegion({
                  ...region,
                  latitude: nativeEvent.coordinate.latitude,
                  longitude: nativeEvent.coordinate.longitude,
                })
              }>
              <Marker coordinate={region} />
            </MapView>

            {loading ? (
              <ActivityIndicator />
            ) : (
              <Button
                containerStyle={styles.addButton}
                textStyle={styles.addButtonText}
                onPress={submit}
                text="Add"
              />
            )}

            <Button
              containerStyle={[styles.addButton, styles.cancelButton]}
              textStyle={styles.addButtonText}
              onPress={close}
              text="Cancel"
            />
          </View>
        </ScrollView>
      </View>
    </Modal>
  )
}