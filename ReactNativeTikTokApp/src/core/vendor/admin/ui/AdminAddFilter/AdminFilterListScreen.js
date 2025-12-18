import React, { useState, useLayoutEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList } from 'react-native';
import { useTheme, useTranslations } from '../../../../dopebase';
import useAdminFilters from '../../api/firebase/filter/useAdminFilter';
import AdminAddFilterModal from './AdminAddFilterModal';
import dynamicStyles from './styles';
import Hamburger from '../../../../../components/Hamburger/Hamburger';

export default function AdminFilterListScreen({ navigation }) {
  const [isVisible, setVisible] = useState(false);
  const { localized } = useTranslations();
  const { theme, appearance } = useTheme();
  const styles = dynamicStyles(theme, appearance);
  const { filters } = useAdminFilters();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerTitle: localized('Filters'),
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

  const renderFilter = ({ item }) => {
    return (
      <View style={styles.filterItemContainer}>
        <Text style={styles.filterText}>{item.name}</Text>
        <View style={styles.optionsContainer}>
          {item.options.map((option, index) => (
            <Text key={index} style={styles.optionText}>
              {option}
            </Text>
          ))}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <AdminAddFilterModal 
        isVisible={isVisible} 
        close={() => setVisible(false)} 
      />
      <FlatList
        data={filters}
        renderItem={renderFilter}
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