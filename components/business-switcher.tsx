import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import { router } from 'expo-router';
import { useBusiness } from '@/providers/business-provider';

export function BusinessSwitcher() {
  const context = useBusiness();

  if (!context) {
    console.warn('BusinessSwitcher: useBusiness() returned undefined. Provider might be missing.');
    return null;
  }

  const { currentBusiness } = context;

  if (!currentBusiness) return null;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => router.push('/business-switcher')}
    >
      <View style={styles.content}>
        <Text style={styles.businessName} numberOfLines={1}>
          {currentBusiness.name}
        </Text>
        <ChevronDown size={16} color="#6b7280" />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginLeft: 16,
    maxWidth: 200,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  businessName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginRight: 4,
    flex: 1,
  },
});


