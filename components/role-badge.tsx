import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { UserRole } from '@/types';
import { useTheme } from '@/providers/theme-provider';

interface RoleBadgeProps {
  role: UserRole | null;
  size?: 'small' | 'medium';
}

export function RoleBadge({ role, size = 'small' }: RoleBadgeProps) {
  const { theme } = useTheme();

  if (!role) return null;

  const getRoleConfig = (role: UserRole) => {
    const isDark = theme === 'dark';

    switch (role) {
      case 'owner':
        return {
          label: 'Owner',
          backgroundColor: isDark ? 'rgba(16, 185, 129, 0.2)' : '#d1fae5',
          textColor: isDark ? '#6ee7b7' : '#047857',
          borderColor: isDark ? 'rgba(16, 185, 129, 0.3)' : 'transparent',
        };
      case 'partner':
        return {
          label: 'Partner',
          backgroundColor: isDark ? 'rgba(251, 191, 36, 0.2)' : '#fef3c7',
          textColor: isDark ? '#fcd34d' : '#b45309',
          borderColor: isDark ? 'rgba(251, 191, 36, 0.3)' : 'transparent',
        };
      case 'viewer':
        return {
          label: 'Viewer',
          backgroundColor: isDark ? 'rgba(148, 163, 184, 0.2)' : '#f1f5f9',
          textColor: isDark ? '#cbd5e1' : '#475569',
          borderColor: isDark ? 'rgba(148, 163, 184, 0.3)' : 'transparent',
        };
    }
  };

  const config = getRoleConfig(role);
  const isSmall = size === 'small';

  return (
    <View style={[
      styles.badge,
      {
        backgroundColor: config.backgroundColor,
        borderColor: config.borderColor,
        borderWidth: theme === 'dark' ? 1 : 0
      },
      isSmall ? styles.badgeSmall : styles.badgeMedium,
    ]}>
      <Text style={[
        styles.badgeText,
        { color: config.textColor },
        isSmall ? styles.textSmall : styles.textMedium,
      ]}>
        {config.label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    borderRadius: 12,
    alignSelf: 'flex-start',
  },
  badgeSmall: {
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  badgeMedium: {
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontWeight: '600',
  },
  textSmall: {
    fontSize: 10,
  },
  textMedium: {
    fontSize: 12,
  },
});