import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
} from 'react-native';
import dynamicStyles from './styles';
import { useTranslations, Button, ActivityIndicator, useTheme } from '../../../../dopebase';
import useAdminFilterMutations from '../../api/firebase/filter/useAdminFilterMutations';

const AdminAddFilterModal = ({ isVisible, close }) => {
  const { localized } = useTranslations();
  const [filterName, setFilterName] = useState('');
  const [optionsText, setOptionsText] = useState('');
  const [loading, setLoading] = useState(false);
  const { theme, appearance } = useTheme();
  const styles = dynamicStyles(theme, appearance);
  const { addFilter } = useAdminFilterMutations();

  const handleAddFilter = async () => {
    if (!filterName.trim()) {
      alert(localized('Filter name is required.'));
      return;
    }

    if (!optionsText.trim()) {
      alert(localized('Please add at least one option.'));
      return;
    }

    setLoading(true);

    try {
      const options = optionsText.split(',').map(option => option.trim());
      
      const filterData = {
        name: filterName,
        options: options,
        createdAt: Date.now().toString(),
      };

      await addFilter(filterData);

      setFilterName('');
      setOptionsText('');
      close();
    } catch (error) {
      console.error('Error adding filter:', error);
      alert(localized('An error occurred. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={isVisible} animationType="slide" transparent>
      <View style={styles.modalContainer}>
        <View style={styles.contentContainer}>
          <Text style={styles.title}>{localized('Add New Filter')}</Text>
          <TextInput
            style={styles.input}
            placeholder={localized('Filter Name')}
            value={filterName}
            onChangeText={setFilterName}
            placeholderTextColor="#aaa"
          />
          <TextInput
            style={styles.optionsInput}
            placeholder={localized('Options (comma-separated)')}
            value={optionsText}
            onChangeText={setOptionsText}
            multiline
            placeholderTextColor="#aaa"
          />
          {loading ? (
            <ActivityIndicator />
          ) : (
            <Button
              containerStyle={styles.addButton}
              textStyle={styles.addButtonText}
              onPress={handleAddFilter}
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

export default AdminAddFilterModal;