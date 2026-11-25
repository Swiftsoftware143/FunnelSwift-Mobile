import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Image,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useTheme } from '../../lib/ThemeContext';
import { useAuth } from '../../lib/AuthContext';
import * as http from '../../lib/http';

interface Props {
  onClose: () => void;
}

export default function AccountSettingsModal({ onClose }: Props) {
  const { user } = useAuth();
  const { colors } = useTheme();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  // The picture is the account's picture on the SERVER (the same one the web console shows), so it
  // is read back from /auth/me here rather than kept on the device: an upload made on web appears
  // here, and a removal made here is what the console shows next.
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [avatarBusy, setAvatarBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const me = await http.getMe();
        if (!cancelled) setAvatarUrl(http.absoluteMediaUrl(me?.avatar_url));
      } catch {
        // Leave the initial-letter placeholder; a failed read never blocks the form.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handlePickPhoto() {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert('Photo access needed', 'Allow photos so you can choose a profile picture.');
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });
      if (picked.canceled || !picked.assets?.length) return;

      setAvatarBusy(true);
      const asset = picked.assets[0];
      const result = await http.uploadAvatar(asset.uri, asset.mimeType || 'image/jpeg');
      setAvatarUrl(http.absoluteMediaUrl(result?.avatar_url));
    } catch (err: any) {
      Alert.alert('Photo not saved', err?.message || 'The picture could not be uploaded.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleRemovePhoto() {
    setAvatarBusy(true);
    try {
      await http.deleteAvatar();
      setAvatarUrl(null);
    } catch (err: any) {
      Alert.alert('Not removed', err?.message || 'The picture could not be removed.');
    } finally {
      setAvatarBusy(false);
    }
  }

  async function handleSaveProfile() {
    if (!name.trim()) {
      Alert.alert('Required', 'Name is required.');
      return;
    }

    setSaving(true);
    try {
      const result = await http.updateProfile({ name: name.trim() });
      Alert.alert('Saved', 'Profile updated successfully.');
      onClose();
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to update profile.');
    } finally {
      setSaving(false);
    }
  }

  async function handleChangePassword() {
    if (!currentPassword) {
      Alert.alert('Required', 'Current password is required.');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      Alert.alert('Required', 'New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Mismatch', 'New passwords do not match.');
      return;
    }

    setChangingPassword(true);
    try {
      await http.changePassword(currentPassword, newPassword);
      Alert.alert('Success', 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to change password.');
    } finally {
      setChangingPassword(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>Account Settings</Text>
        <View style={{ width: 28 }} />
      </View>

      <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">
        {/* Profile Section */}
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile</Text>

        <View style={[styles.field, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Profile Picture</Text>
          <View style={styles.pictureRow}>
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.picture} />
            ) : (
              <View style={[styles.picture, styles.pictureEmpty, { backgroundColor: colors.primary }]}>
                <Text style={styles.pictureInitial}>
                  {(name || email || 'U').trim().charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
            <View style={styles.pictureActions}>
              <TouchableOpacity
                style={[styles.pictureButton, { backgroundColor: colors.primary, opacity: avatarBusy ? 0.6 : 1 }]}
                onPress={handlePickPhoto}
                disabled={avatarBusy}
              >
                {avatarBusy ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={styles.pictureButtonText}>{avatarUrl ? 'Change Photo' : 'Add Photo'}</Text>
                )}
              </TouchableOpacity>
              {avatarUrl ? (
                <TouchableOpacity onPress={handleRemovePhoto} disabled={avatarBusy}>
                  <Text style={[styles.pictureRemove, { color: colors.error }]}>Remove</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          </View>
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            This is the same picture your account shows on the web console.
          </Text>
        </View>

        <View style={[styles.field, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Name</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="Full name"
            placeholderTextColor={colors.textMuted}
          />
        </View>

        <View style={[styles.field, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Email</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border, opacity: 0.5 }]}
            value={email}
            editable={false}
            placeholderTextColor={colors.textMuted}
          />
          <Text style={[styles.hint, { color: colors.textMuted }]}>
            Email cannot be changed here. Contact support.
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary, opacity: saving ? 0.6 : 1 }]}
          onPress={handleSaveProfile}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Save Profile</Text>
          )}
        </TouchableOpacity>

        {/* Password Section */}
        <Text style={[styles.sectionTitle, { color: colors.text, marginTop: 32 }]}>
          Change Password
        </Text>

        <View style={[styles.field, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Current Password</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder="Enter current password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />
        </View>

        <View style={[styles.field, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>New Password</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="At least 6 characters"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />
        </View>

        <View style={[styles.field, { backgroundColor: colors.surface }]}>
          <Text style={[styles.label, { color: colors.textMuted }]}>Confirm New Password</Text>
          <TextInput
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Re-enter new password"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />
        </View>

        <TouchableOpacity
          style={[styles.saveButton, { backgroundColor: colors.primary, opacity: changingPassword ? 0.6 : 1 }]}
          onPress={handleChangePassword}
          disabled={changingPassword}
        >
          {changingPassword ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.saveButtonText}>Change Password</Text>
          )}
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
  title: { fontSize: 20, fontWeight: '700' },
  content: { paddingHorizontal: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', marginBottom: 12 },
  field: { padding: 12, borderRadius: 10, marginBottom: 12 },
  label: { fontSize: 12, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  hint: { fontSize: 11, marginTop: 4, fontStyle: 'italic' },
  pictureRow: { flexDirection: 'row', alignItems: 'center', marginVertical: 8 },
  picture: { width: 64, height: 64, borderRadius: 32 },
  pictureEmpty: { justifyContent: 'center', alignItems: 'center' },
  pictureInitial: { color: '#fff', fontSize: 26, fontWeight: '700' },
  pictureActions: { marginLeft: 16, flex: 1, alignItems: 'flex-start' },
  pictureButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 110,
    alignItems: 'center',
  },
  pictureButtonText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  pictureRemove: { fontSize: 13, marginTop: 8, fontWeight: '600' },
  saveButton: {
    height: 48,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  saveButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
