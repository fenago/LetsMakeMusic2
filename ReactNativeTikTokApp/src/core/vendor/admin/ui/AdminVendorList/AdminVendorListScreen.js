import React, { useState, useLayoutEffect } from 'react';
import { View, Text, Image, TouchableOpacity, FlatList } from 'react-native';
import { useTheme, useTranslations } from '../../../../dopebase';
import { useAdminVendors } from '../../api';
import AdminAddVendorModal from '../AdminAddVendor/AdminAddVendorModal';
import dynamicStyles from './styles';
import Hamburger from '../../../../../components/Hamburger/Hamburger';

export default function AdminVendorListScreen({ navigation, route }) {
  const [isVisible, setVisible] = useState(false);
  const { localized } = useTranslations();
  const { theme, appearance } = useTheme();
  const styles = dynamicStyles(theme, appearance);
  const { vendors } = useAdminVendors();

  useLayoutEffect(() => {
    navigation.setOptions({

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

  const renderVendors = ({ item }) => {
    return (
      <View style={styles.vendorItemContainer}>
        <Image 
          source={{ uri: item.data.photo || 'https://placeholder.com/300x300' }} 
          style={styles.vendorImage} 
        />
        <View style={styles.vendorTextContainer}>
          <Text style={styles.vendorName}>{item.data.title}</Text>
          <Text style={styles.vendorDescription}>{item.data.description}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AdminAddVendorModal
        isVisible={isVisible}
        close={() => setVisible(false)}
        route={route}
      />
      <FlatList
        data={vendors}
        renderItem={renderVendors}
        keyExtractor={(item) => item.id}
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