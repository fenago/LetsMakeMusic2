import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
} from 'react-native';
import { Image } from 'expo-image';

import dynamicStyles from './styles';
import Icon from 'react-native-vector-icons/FontAwesome';
import { useTranslations, Button, ActivityIndicator, useTheme } from '../../../../dopebase';
import { storageAPI } from '../../../../media'; 
import useAdminCategoryMutations from '../../api/firebase/category/useAdminCategoriesMutations'; // Import the hook


const AdminAddCategoryModal = ({ isVisible, close, categories }) => {
  const { localized } = useTranslations();
  const [categoryName, setCategoryName] = useState('');
  const [categoryImage, setCategoryImage] = useState(null);
  const [photoFile, setPhotoFile] = useState(false);
  const [loading, setLoading] = useState(false);
  const { theme, appearance } = useTheme();
  const styles = dynamicStyles(theme, appearance);
  const { addCategory } = useAdminCategoryMutations(); 


  const getPermissionAsync = async () => {
    if (Platform.OS === 'ios') {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync(false);

      if (permissionResult.granted === false) {
        alert(localized('Sorry, we need camera roll permissions to make this work.'));
        return false;
      }
      return true;
    }
    return true;
  };

  const handleSelectImage = async () => {
    const hasPermission = await getPermissionAsync();
    if (!hasPermission) return;

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 1,
      });

      if (!result.canceled) {
        const asset = result.assets[0];
        setCategoryImage(asset.uri);
        setPhotoFile(asset);
      }
    } catch (error) {
      console.log('Error selecting image:', error);
      alert(localized('Error selecting image. Please try again.'));
    }
  };

  const handleAddCategory = async () => {
    if (!categoryName.trim()) {
      alert(localized('Category name is required.'));
      return;
    }

   
    if (!photoFile) {
      alert(localized('Please select a category image.'));
      return;
    }

    setLoading(true);

    try {
      const response = await storageAPI.processAndUploadMediaFile(
        photoFile );
         if (!response.downloadURL) {
           throw new Error(localized('Failed to upload image.'));
         }
   

      const currentOrders = categories.map(cat => parseInt(cat.order, 10));
      const nextOrder = currentOrders.length > 0 ? Math.max(...currentOrders) + 1 : 1;

      const uploadObject = {
        title: categoryName,
        photo: response.downloadURL,
        order: nextOrder.toString(), 
      };


      await addCategory(uploadObject); 
      setCategoryName('');
      setCategoryImage(null);
      close();
    } catch (error) {
      console.error('Error adding category:', error);
      alert(localized('An error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  const onImageError = () => {
    console.log('Error loading category image');
    alert(localized('There was an error loading the image. Please try a different image.'));
    setCategoryImage(null);
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{localized('Add New Category')}</Text>
          <TextInput
            style={styles.input}
            placeholder={localized('Category Name')}
            value={categoryName}
            onChangeText={setCategoryName}
            placeholderTextColor="#aaa"
          />
          <TouchableOpacity style={styles.imagePicker} onPress={handleSelectImage}>
            {categoryImage ? (
              <Image 
              source={{ uri: categoryImage }} 
              style={styles.imagePreview}
              contentFit="cover"
              onError={onImageError}
               />
            ) : (
              <Icon name="camera" size={30} color="#aaa" />
            )}
          </TouchableOpacity>
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Button
              containerStyle={styles.addButton}
              textStyle={styles.addButtonText}
              onPress={handleAddCategory}
              text={localized('Add')}
            />
          )}
          <Button
            containerStyle={[styles.addButton, styles.cancelButton]}
            textStyle={styles.addButtonText}
            onPress={close}
            text={localized('Cancel')}
          />
        </View>
      </View>
    </Modal>
  );
};

export default AdminAddCategoryModal;
