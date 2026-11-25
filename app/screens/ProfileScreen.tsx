import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Modal,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';
import AccountSettingsModal from '../components/AccountSettingsModal';
import NotificationsModal from '../components/NotificationsModal';
import appJson from '../../app.json';

// The version this build actually is. It used to be the literal "v1.0.5" on this screen while the
// shipped app was 1.0.23 — a customer reading their own profile was told a version six months old,
// which is exactly what a support call starts with. app.json is the single source both the build and
// the store read.
const APP_VERSION: string = (appJson as any)?.expo?.version ?? '';

export default function ProfileScreen({ navigation }: any) {
  const { user, isSuperAdmin, signOut } = useAuth();
  const { colors } = useTheme();
  const [showAccountSettings, setShowAccountSettings] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  // The profile picture and the workspace's plan both live on the server and are read from
  // /auth/me — never cached on the device, so a picture uploaded on web appears here, and a plan
  // changed in the console is what this screen says.
  const [me, setMe] = useState<any>(null);
  const [loadingMe, setLoadingMe] = useState(true);

  const refreshMe = useCallback(async () => {
    try {
      const fresh = await http.getMe();
      setMe(fresh);
    } catch {
      // A failed read leaves the screen on what sign-in already knew; it never invents a plan.
    } finally {
      setLoadingMe(false);
    }
  }, []);

  useEffect(() => {
    refreshMe();
  }, [refreshMe]);

  const avatarUri = http.absoluteMediaUrl(me?.avatar_url);
  const displayName = me?.name || user?.name || user?.email || 'User';
  const displayEmail = me?.email || user?.email || '';
  const initials = (displayName || 'U').trim().charAt(0).toUpperCase();

  // The plan, in the customer's own words. A workspace holding a real subscription reads that
  // tier's name; one with no subscription is held to the install's default tier by the gates, so
  // the screen names that tier and marks it as the default rather than inventing a level.
  const planName: string | null = me?.plan_name || null;
  const effectiveName: string | null = me?.plan_effective_name || null;
  const planLabel = planName
    ? planName
    : effectiveName
      ? `${effectiveName} (default)`
      : me
        ? 'No plan assigned'
        : '';

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
          'For support inquiries, please email:\nsupport@funnelswift.net\n\nDocumentation:\nhttps://funnelswift.net/guide'
        );
      },
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.profileHeader, { backgroundColor: colors.surface }]}>
        {avatarUri ? (
          <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
        ) : (
          <View style={[styles.avatar, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
        )}
        <Text style={[styles.name, { color: colors.text }]}>{displayName}</Text>
        <Text style={[styles.email, { color: colors.textMuted }]}>{displayEmail}</Text>
        {loadingMe ? (
          <ActivityIndicator size="small" color={colors.textMuted} style={{ marginTop: 4 }} />
        ) : (
          planLabel !== '' && (
            <View style={[styles.badge, { backgroundColor: colors.primary + '20' }]}>
              <Text style={[styles.badgeText, { color: colors.primary }]}>{planLabel}</Text>
            </View>
          )
        )}
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
        FunnelSwift Mobile {APP_VERSION ? 'v' + APP_VERSION : ''}
      </Text>

      {/* Modals */}
      <Modal
        visible={showAccountSettings}
        animationType="slide"
        onRequestClose={() => setShowAccountSettings(false)}
      >
        <AccountSettingsModal
          onClose={() => {
            setShowAccountSettings(false);
            // The picture and the name are written by that modal, so the header must re-read them
            // rather than keep showing the values it loaded when the screen opened.
            setLoadingMe(true);
            refreshMe();
          }}
        />
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
  avatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginBottom: 12,
    backgroundColor: '#00000010',
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
