import React, { useState, useLayoutEffect } from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import DraggableFlatList from 'react-native-draggable-flatlist';
import { useTheme, useTranslations } from '../../../../dopebase';
import useAdminCategories from '../../api/firebase/category/useAdminCategories';
import useAdminCategoryMutations from '../../api/firebase/category/useAdminCategoriesMutations';
import AdminAddCategoryModal from './AdminAddCategoryModal';
import dynamicStyles from './styles';
import Hamburger from '../../../../../components/Hamburger/Hamburger';

export default function AdminCategoryListScreen({ navigation }) {
  const [isVisible, setVisible] = useState(false);
  const { localized } = useTranslations();
  const { theme, appearance } = useTheme();
  const styles = dynamicStyles(theme, appearance);
  const { categories } = useAdminCategories();
  const { updateCategory } = useAdminCategoryMutations();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: localized('Categories'),
      headerRight: () => <Text>{''}</Text>,
      headerLeft: () => (
        <Hamburger
          onPress={() => {
            navigation.openDrawer();
          }}
        />
      ),
    });
  }, [navigation, localized]);

  const sortedCategories = categories.sort((a, b) => parseInt(a.order, 10) - parseInt(b.order, 10));

  const handleDragEnd = async ({ data }) => {
    const updatePromises = data.map((category, index) => {
      const updatedCategory = { 
        ...category, 
        order: (index + 1).toString() 
      };
      return updateCategory(updatedCategory);
    });

    try {
      await Promise.all(updatePromises);
    } catch (error) {
      console.error('Error updating category orders:', error);
    }
  };

  const renderCategories = ({ item, drag, isActive }) => {
    return (
      <View 
        style={[
          styles.categoryItemContainer,
          { 
            backgroundColor: isActive ? '#e0e0e0' : styles.categoryItemContainer.backgroundColor 
          }
        ]}
      >
        <Image source={{ uri: item.photo }} style={styles.categoryImage} />
        <Text style={styles.categoryText}>{item.title}</Text>
        <Text style={styles.categoryOrder}>{item.order}</Text>
        <View onTouchStart={drag}>
          <Text>☰</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AdminAddCategoryModal 
        isVisible={isVisible} 
        close={() => setVisible(false)} 
        categories={sortedCategories} 
      />
      <DraggableFlatList
        data={sortedCategories}
        renderItem={renderCategories}
        keyExtractor={(item) => item.id}
        onDragEnd={handleDragEnd}
        contentContainerStyle={styles.listContainer}
      />
      <TouchableOpacity 
        onPress={() => setVisible(true)} 
        style={styles.fullWidthButton}
      >
        <Text style={styles.fullWidthButtonText}>
          {localized('Add new')}
        </Text>
      </TouchableOpacity>
    </View>
  );
}