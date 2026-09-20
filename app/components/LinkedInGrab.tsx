import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

interface Props {
  onComplete: (data: {
    name: string;
    email: string;
    phone: string;
    company: string;
    title: string;
    summary: string;
    // The profile this lead came from, and whether the server actually fetched it.
    // `inferred` is true when the name was read out of the URL slug rather than looked up.
    profile_url: string;
    inferred: boolean;
  }) => void;
  onClose: () => void;
}

export default function LinkedInGrab({ onComplete, onClose }: Props) {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const { colors } = useTheme();

  async function handleGrab() {
    const trimmed = url.trim();

    // Validate looks like a LinkedIn URL
    if (!trimmed.match(/^https?:\/\/(www\.)?linkedin\.com\/in\//i)) {
      Alert.alert(
        'Invalid URL',
        'Please paste a LinkedIn profile URL, e.g. https://linkedin.com/in/username'
      );
      return;
    }

    setLoading(true);
    try {
      const result = await http.linkedinLookup(trimmed);

      if (!result.name && !result.email) {
        Alert.alert(
          'No Name In That URL',
          result.note ||
            'That does not look like a LinkedIn profile URL. It should look like https://linkedin.com/in/username'
        );
        return;
      }

      // The server reads the name out of the URL slug and states its provenance in
      // `source`; it does not fetch the profile (LinkedIn does not permit that). So we
      // forward the profile URL itself, and say plainly whether the name was inferred,
      // instead of silently passing a guess off as a looked-up contact.
      onComplete({
        name: result.name || '',
        email: result.email || '',
        phone: result.phone || '',
        company: result.company || '',
        title: result.title || '',
        summary: result.summary || '',
        profile_url: result.profile_url || trimmed,
        inferred: result.source === 'linkedin-url-slug',
      });
    } catch (err: any) {
      Alert.alert(
        'Lookup Failed',
        err.message || 'Could not fetch LinkedIn profile. Try again or capture manually.'
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose}>
          <Ionicons name="close" size={28} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: colors.text }]}>LinkedIn Grab</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        <View style={[styles.iconRow, { backgroundColor: colors.primary + '15' }]}>
          <Ionicons name="logo-linkedin" size={48} color="#0A66C2" />
        </View>

        <Text style={[styles.heading, { color: colors.text }]}>
          Paste a LinkedIn Profile URL
        </Text>
        <Text style={[styles.desc, { color: colors.textMuted }]}>
          We take the name from the profile URL and keep the profile link on the lead.
          LinkedIn does not allow us to pull the profile itself, so company, title, email
          and phone are yours to fill in.
        </Text>

        <TextInput
          style={[styles.input, {
            backgroundColor: colors.surface,
            borderColor: colors.border,
            color: colors.text,
          }]}
          placeholder="https://linkedin.com/in/username"
          placeholderTextColor={colors.textMuted}
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
          returnKeyType="go"
          onSubmitEditing={handleGrab}
        />

        <TouchableOpacity
          style={[styles.grabBtn, { backgroundColor: '#0A66C2', opacity: loading ? 0.6 : 1 }]}
          onPress={handleGrab}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="search" size={20} color="#fff" />
              <Text style={styles.grabBtnText}>Look Up Profile</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={[styles.note, { color: colors.textMuted }]}>
          Any URL shaped like /in/first-last-name works. A URL with no name in it cannot be
          used — capture that lead by hand.
        </Text>
      </View>
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
  content: { flex: 1, padding: 24, alignItems: 'center', gap: 14 },
  iconRow: {
    width: 80,
    height: 80,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  heading: { fontSize: 20, fontWeight: '700', textAlign: 'center' },
  desc: { fontSize: 14, textAlign: 'center', lineHeight: 20, paddingHorizontal: 10, marginBottom: 8 },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  grabBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 12,
    gap: 8,
  },
  grabBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  note: { fontSize: 12, textAlign: 'center', paddingHorizontal: 20, marginTop: 4 },
});
