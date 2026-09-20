import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
} from 'react-native';
import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import AccountSettingsModal from '../components/AccountSettingsModal';
import NotificationsModal from '../components/NotificationsModal';

export default function ProfileScreen({ navigation }: any) {
  const { user, isSuperAdmin, signOut } = useAuth();
  const { colors } = useTheme();
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  async function handleSignOut() {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await signOut();
            navigation.replace('Login');
          }
        },
      ]
    );
  }

  const menuItems = [
    {
      icon: 'person' as const,
      title: 'Account Settings',
      onPress: () => setShowAccountSettings(true),
    },
    {
      // Integration Center (fleet standard 2026-09-20) — Settings → Integrations.
      icon: 'git-network' as const,
      title: 'Integrations',
      onPress: () => navigation.navigate('Integrations'),
    },
    {
      icon: 'notifications' as const,
      title: 'Notifications',
      onPress: () => setShowNotifications(true),
    },
    {
      icon: 'shield-checkmark' as const,
      title: 'Privacy & Security',
      onPress: () => {
        Alert.alert(
          'Privacy & Security',
          'Session tokens are stored securely on-device. All data is encrypted in transit. Contact support for account deletion or data export requests.'
        );
      },
    },
    {
      icon: 'help-circle' as const,
      title: 'Help & Support',
      onPress: () => {
        Alert.alert(
          'Help & Support',
          'For support inquiries, please email:\nsupport@funnelswift.net\n\nDocumentation:\nhttps://funnelswift.net/docs'
        );
      },
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.profileHeader, { backgroundColor: colors.surface }]}>
        <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
          <Text style={styles.avatarText}>
            {user?.email?.charAt(0).toUpperCase() || 'U'}
          </Text>
        </View>
        <Text style={[styles.name, { color: colors.text }]}>
          {user?.name || user?.email || 'User'}
        </Text>
        <Text style={[styles.email, { color: colors.textMuted }]}>{user?.email}</Text>
        {isSuperAdmin && (
          <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>Super Admin</Text>
          </View>
        )}
      </View>

      <View style={styles.menuContainer}>
        {menuItems.map((item, index) => (
          <TouchableOpacity
            key={index}
            style={[styles.menuItem, { backgroundColor: colors.surface }]}
            onPress={item.onPress}
          >
            <Ionicons name={item.icon} size={24} color={colors.primary} />
            <Text style={[styles.menuText, { color: colors.text }]}>{item.title}</Text>
            <Ionicons name="chevron-forward" size={20} color={colors.textMuted} />
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[styles.signOutButton, { backgroundColor: colors.error + '20' }]}
        onPress={handleSignOut}
      >
        <Ionicons name="log-out" size={24} color={colors.error} />
        <Text style={[styles.signOutText, { color: colors.error }]}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={[styles.version, { color: colors.textMuted }]}>
        FunnelSwift Mobile v1.0.5
      </Text>

      {/* Modals */}
      <Modal visible={showAccountSettings} animationType="slide" onRequestClose={() => setShowAccountSettings(false)}>
        <AccountSettingsModal onClose={() => setShowAccountSettings(false)} />
      </Modal>

      <Modal visible={showNotifications} animationType="slide" onRequestClose={() => setShowNotifications(false)}>
        <NotificationsModal onClose={() => setShowNotifications(false)} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  profileHeader: { alignItems: 'center', padding: 24, marginBottom: 16 },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 32, fontWeight: 'bold', color: '#fff' },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 14, marginBottom: 8 },
  badge: { paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  badgeText: { fontSize: 12, fontWeight: '600' },
  menuContainer: { paddingHorizontal: 16 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuText: { flex: 1, fontSize: 16, marginLeft: 12 },
  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginTop: 24,
    padding: 16,
    borderRadius: 12,
  },
  signOutText: { fontSize: 16, fontWeight: '600', marginLeft: 8 },
  version: { textAlign: 'center', marginTop: 24, fontSize: 12 },
});
