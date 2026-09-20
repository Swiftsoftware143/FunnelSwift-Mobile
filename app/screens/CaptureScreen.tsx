import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/AuthContext';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';
import BusinessCardScanner, { ScannedCardData } from '../components/BusinessCardScanner';
import QRCodeScanner, { QRScannedData } from '../components/QRCodeScanner';
import BulkImportScreen from '../components/BulkImportScreen';
import PhotoGalleryBatch from '../components/PhotoGalleryBatch';
import LinkedInGrab from '../components/LinkedInGrab';
import TagSelector from '../components/TagSelector';
import NFCEventCapture from '../components/NFCEventCapture';

const ADDABLE_FIELDS: { key: string; label: string; icon: string }[] = [
  { key: 'first_name', label: 'First Name', icon: 'person' },
  { key: 'last_name', label: 'Last Name', icon: 'person' },
  { key: 'company', label: 'Business / Company', icon: 'business' },
  { key: 'phone', label: 'Phone', icon: 'call' },
  { key: 'website', label: 'Website', icon: 'globe' },
  { key: 'address', label: 'Address', icon: 'location' },
  { key: 'title', label: 'Title / Position', icon: 'briefcase' },
  { key: 'social', label: 'Social (LinkedIn, etc.)', icon: 'link' },
  { key: 'notes', label: 'Notes', icon: 'document-text' },
  { key: 'photo', label: 'Photo', icon: 'camera' },
  { key: 'tags', label: 'Tags', icon: 'pricetags' },
  { key: 'lead_source', label: 'Lead Source', icon: 'flag' },
];

const FIELD_DEFAULTS: Record<string, { placeholder: string; keyboard?: any }> = {
  first_name: { placeholder: 'First Name' },
  last_name: { placeholder: 'Last Name' },
  company: { placeholder: 'Business / Company' },
  phone: { placeholder: 'Phone Number', keyboard: 'phone-pad' },
  email: { placeholder: 'Email Address', keyboard: 'email-address' },
  website: { placeholder: 'Website URL', keyboard: 'url' },
  address: { placeholder: 'Street Address' },
  title: { placeholder: 'Title / Position' },
  social: { placeholder: 'LinkedIn or other social URL', keyboard: 'url' },
  notes: { placeholder: 'Notes about this lead' },
};

const LEAD_SOURCES = ['Walk-in', 'Referral', 'Website', 'Event', 'Social Media', 'Cold Call', 'Email', 'Other'];

export default function CaptureScreen() {
  const [activeFields, setActiveFields] = useState<string[]>(['email']);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({ email: '' });
  const [leadSource, setLeadSource] = useState('Walk-in');
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [showPhotoBatch, setShowPhotoBatch] = useState(false);
  const [showLinkedIn, setShowLinkedIn] = useState(false);
  const [showTagSelector, setShowTagSelector] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [showNFC, setShowNFC] = useState(false);
  const [availableTags, setAvailableTags] = useState<any[]>([]);
  const [tagPickerVisible, setTagPickerVisible] = useState(false);

  const { user } = useAuth();
  const { colors } = useTheme();

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const loc = await Location.getCurrentPositionAsync({});
        setLocation(loc);
      }
      // Load tags from API
      try {
        const tags = await http.getTags();
        if (tags && tags.length > 0) {
          setAvailableTags(tags.map((t: any) => ({
            id: t.id,
            name: t.name,
            displayName: t.name,
            color: t.color || '#5B4FFF',
            group: 'Tags',
            groupId: t.group_id || 'default',
            is_system: t.is_system,
          })));
        }
      } catch {
        // Tags not available — proceed without
      }
    })();
  }, []);

  function addField(key: string) {
    if (!activeFields.includes(key)) {
      setActiveFields([...activeFields, key]);
      if (key === 'tags') {
        setTagPickerVisible(true);
      } else if (key === 'lead_source') {
        setFieldValues(f => ({ ...f, lead_source: leadSource }));
      } else {
        setFieldValues(f => ({ ...f, [key]: '' }));
      }
    }
  }

  function removeField(key: string) {
    setActiveFields(activeFields.filter(f => f !== key));
    const newValues = { ...fieldValues };
    delete newValues[key];
    setFieldValues(newValues);
  }

  function setValue(key: string, value: string) {
    setFieldValues(f => ({ ...f, [key]: value }));
  }

  async function handleScanComplete(data: ScannedCardData, tags: any[]) {
    setShowScanner(false);
    // Populate fields from scanned data
    const scanned: Record<string, string> = {};
    if (data.first_name) scanned.first_name = data.first_name;
    if (data.last_name) scanned.last_name = data.last_name;
    if (data.email) scanned.email = data.email;
    if (data.phone) scanned.phone = data.phone;
    if (data.business_name) scanned.company = data.business_name;
    if (data.website) scanned.website = data.website;
    if (data.title) scanned.title = data.title;
    if (data.address) scanned.address = data.address;

    const keys = Object.keys(scanned);
    setActiveFields([...new Set([...activeFields, ...keys])]);
    setFieldValues(f => ({ ...f, ...scanned }));

    if (tags.length > 0) {
      setSelectedTags(tags.map((t: any) => t.name));
    }
  }

  function handleQRScanComplete(data: QRScannedData) {
    setShowQR(false);

    const scanned: Record<string, string> = {};
    if (data.name) scanned.first_name = data.name;
    if (data.email) scanned.email = data.email;
    if (data.phone) scanned.phone = data.phone;
    if (data.company) scanned.company = data.company;
    if (data.url) scanned.website = data.url;
    if (data.title) scanned.title = data.title;

    const keys = Object.keys(scanned);
    setActiveFields([...new Set([...activeFields, ...keys])]);
    setFieldValues(f => ({ ...f, ...scanned }));

    Alert.alert('QR Scanned', 'Contact info extracted from QR code. Review and save.');
  }

  function handleToggleTag(tagName: string) {
    setSelectedTags(prev =>
      prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName]
    );
  }

  async function handleSubmit() {
    const emailVal = fieldValues.email || '';
    if (!emailVal.trim()) {
      Alert.alert('Required', 'Email is required to capture a lead.');
      return;
    }

    setSubmitting(true);

    // Build API payload — only send what was filled
    const payload: Record<string, any> = {};

    // Map to backend field names — send first/last separately
    if (fieldValues.first_name) payload.first_name = fieldValues.first_name;
    if (fieldValues.last_name) payload.last_name = fieldValues.last_name;
    if (fieldValues.email) payload.email = fieldValues.email;
    if (fieldValues.phone) payload.phone = fieldValues.phone;
    if (fieldValues.company) payload.company = fieldValues.company;
    if (fieldValues.website) payload.website = fieldValues.website;
    if (fieldValues.notes) payload.notes = fieldValues.notes;

    // Source
    payload.source = fieldValues.lead_source || leadSource;

    // Tags as string array
    if (selectedTags.length > 0) {
      payload.tags = selectedTags;
    }

    // Custom fields for anything that doesn't map directly
    const customFields: Record<string, any> = {};
    if (fieldValues.address) customFields.address = fieldValues.address;
    if (fieldValues.title) customFields.title = fieldValues.title;
    if (fieldValues.social) customFields.social = fieldValues.social;
    if (location) {
      customFields.gps_lat = location.coords.latitude;
      customFields.gps_lng = location.coords.longitude;
    }
    if (Object.keys(customFields).length > 0) {
      payload.custom_fields = customFields;
    }

    try {
      await http.createLead(payload);
      Alert.alert('Captured!', 'Lead saved successfully.', [
        { text: 'OK', onPress: () => {
          setFieldValues({ email: '' });
          setActiveFields(['email']);
          setSelectedTags([]);
          setLeadSource('Walk-in');
        }}
      ]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Failed to save lead.');
    } finally {
      setSubmitting(false);
    }
  }

  // Scanner is shown as a Modal below

  // Fields not yet added
  const availableToAdd = ADDABLE_FIELDS.filter(f => !activeFields.includes(f.key));

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView style={styles.scrollView} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.text }]}>Capture Lead</Text>
<View style={styles.headerActions}>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: colors.primary }]}
              onPress={() => setShowScanner(true)}
            >
              <Ionicons name="camera" size={18} color="#fff" />
              <Text style={styles.scanButtonText}>Scan Card</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: '#0A66C2'}]}
              onPress={() => setShowLinkedIn(true)}
            >
              <Ionicons name="logo-linkedin" size={16} color="#fff" />
              <Text style={styles.scanButtonText}>LinkedIn</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: '#EF4444'}]}
              onPress={() => setShowPhotoBatch(true)}
            >
              <Ionicons name="images" size={18} color="#fff" />
              <Text style={styles.scanButtonText}>Batch</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: '#10B981'}]}
              onPress={() => setShowQR(true)}
            >
              <Ionicons name="qr-code" size={18} color="#fff" />
              <Text style={styles.scanButtonText}>Scan QR</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: '#8B5CF6'}]}
              onPress={() => setShowBulkImport(true)}
            >
              <Ionicons name="cloud-upload" size={18} color="#fff" />
              <Text style={styles.scanButtonText}>Bulk</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.scanButton, { backgroundColor: '#F59E0B'}]}
              onPress={() => setShowNFC(true)}
            >
              <Ionicons name="wifi" size={18} color="#fff" />
              <Text style={styles.scanButtonText}>NFC Event</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.card, { backgroundColor: colors.surface }]}>
          {/* Always show Email */}
          <View style={styles.fieldContainer}>
            <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Email *</Text>
            <View style={styles.fieldRow}>
              <TextInput
                style={[styles.input, {
                  backgroundColor: colors.surfaceLight,
                  borderColor: colors.border,
                  color: colors.text,
                }]}
                placeholder="Email Address"
                placeholderTextColor={colors.textMuted}
                value={fieldValues.email || ''}
                onChangeText={v => setValue('email', v)}
                autoCapitalize="none"
                keyboardType="email-address"
              />
            </View>
          </View>

          {/* Dynamic fields */}
          {activeFields.filter(f => f !== 'email' && f !== 'tags' && f !== 'lead_source').map(key => {
            const def = FIELD_DEFAULTS[key];
            if (!def) return null;
            const fieldLabel = ADDABLE_FIELDS.find(f => f.key === key)?.label || def.placeholder;
            return (
              <View key={key} style={styles.fieldContainer}>
                <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>{fieldLabel}</Text>
                <View style={styles.fieldRow}>
                  <TextInput
                    style={[styles.input, styles.fieldWithRemove, {
                      backgroundColor: colors.surfaceLight,
                      borderColor: colors.border,
                      color: colors.text,
                    }]}
                    placeholder={def.placeholder}
                    placeholderTextColor={colors.textMuted}
                    value={fieldValues[key] || ''}
                    onChangeText={v => setValue(key, v)}
                    keyboardType={def.keyboard as any}
                    autoCapitalize="none"
                  />
                  <TouchableOpacity onPress={() => removeField(key)} style={styles.removeBtn}>
                    <Ionicons name="close-circle" size={20} color={colors.error} />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}

          {/* Lead source (selectable) */}
          {activeFields.includes('lead_source') && (
            <View style={styles.sourceRow}>
              <Text style={[styles.label, { color: colors.textMuted }]}>Lead Source</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                {LEAD_SOURCES.map(src => (
                  <TouchableOpacity
                    key={src}
                    style={[
                      styles.chip,
                      {
                        backgroundColor: (fieldValues.lead_source || leadSource) === src ? colors.primary : colors.surfaceLight,
                        borderColor: colors.border,
                      },
                    ]}
                    onPress={() => {
                      setLeadSource(src);
                      setValue('lead_source', src);
                    }}
                  >
                    <Text style={[
                      styles.chipText,
                      { color: (fieldValues.lead_source || leadSource) === src ? '#fff' : colors.text },
                    ]}>{src}</Text>
                  </TouchableOpacity>
                ))}
          </ScrollView>
            </View>
          )}

          {/* Tags display */}
          {activeFields.includes('tags') && (
            <TouchableOpacity
              style={[styles.tagSelector, { borderColor: colors.border }]}
              onPress={() => setShowTagSelector(true)}
            >
              <Ionicons name="pricetags" size={18} color={colors.primary} />
              {selectedTags.length > 0 ? (
                <View style={styles.selectedTagsRow}>
                  {selectedTags.map(tag => (
                    <View key={tag} style={[styles.miniTag, { backgroundColor: colors.primary + '30' }]}>
                      <Text style={[styles.miniTagText, { color: colors.primary }]}>{tag}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={[styles.tagPlaceholder, { color: colors.textMuted }]}>Add tags...</Text>
              )}
              <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
            </TouchableOpacity>
          )}

          {/* Add Field dropdown */}
          {availableToAdd.length > 0 && (
            <View style={styles.addFieldSection}>
              <Text style={[styles.label, { color: colors.textMuted, marginBottom: 8 }]}>Add Field</Text>
              <View style={styles.addFieldRow}>
                {availableToAdd.map(field => (
                  <TouchableOpacity
                    key={field.key}
                    style={[styles.addFieldChip, { backgroundColor: colors.surfaceLight, borderColor: colors.border }]}
                    onPress={() => addField(field.key)}
                  >
                    <Ionicons name={field.icon as any} size={14} color={colors.primary} />
                    <Text style={[styles.addFieldChipText, { color: colors.text }]}>{field.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          {/* Location indicator */}
          {location && (
            <View style={styles.locationRow}>
              <Ionicons name="location" size={14} color={colors.success} />
              <Text style={[styles.locationText, { color: colors.success }]}>GPS Captured</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          style={[styles.submitButton, { backgroundColor: colors.primary }]}
          onPress={handleSubmit}
          disabled={submitting}
        >
          {submitting ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="add-circle" size={22} color="#fff" />
              <Text style={styles.submitButtonText}>Capture Lead</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      <TagSelector
        visible={showTagSelector}
        selectedTags={selectedTags}
        onToggleTag={handleToggleTag}
        onClose={() => setShowTagSelector(false)}
        availableTags={availableTags}
        onCreateTag={async (tagName) => {
          try {
            await http.createTag({ name: tagName });
            // Refresh tags
            const tags = await http.getTags();
            if (tags && tags.length > 0) {
              setAvailableTags(tags.map((t: any) => ({
                id: t.id,
                name: t.name,
                displayName: t.name,
                color: t.color || '#5B4FFF',
                group: 'Tags',
                groupId: t.group_id || 'default',
                is_system: t.is_system,
              })));
            }
            handleToggleTag(tagName);
          } catch {}
        }}
      />

      <Modal visible={showQR} animationType="slide" onRequestClose={() => setShowQR(false)}>
        <QRCodeScanner
          onScanComplete={handleQRScanComplete}
          onClose={() => setShowQR(false)}
        />
      </Modal>

      <Modal visible={showBulkImport} animationType="slide" onRequestClose={() => setShowBulkImport(false)}>
        <BulkImportScreen
          onClose={() => setShowBulkImport(false)}
          onComplete={(count: number) => {
            if (count > 0) setShowBulkImport(false);
          }}
        />
      </Modal>

      <Modal visible={showPhotoBatch} animationType="slide" onRequestClose={() => setShowPhotoBatch(false)}>
        <PhotoGalleryBatch
          onClose={() => setShowPhotoBatch(false)}
        />
      </Modal>

      <Modal visible={showLinkedIn} animationType="slide" onRequestClose={() => setShowLinkedIn(false)}>
        <LinkedInGrab
          onClose={() => setShowLinkedIn(false)}
          onComplete={(data) => {
            setShowLinkedIn(false);
            const scanned: Record<string, string> = {};
            // The whole name used to go into `first_name` alone, so a grabbed lead showed
            // "Amara Okafor" in the First Name column with Last Name empty. Split it.
            if (data.name) {
              const parts = data.name.trim().split(/\s+/).filter(Boolean);
              if (parts.length) scanned.first_name = parts[0];
              if (parts.length > 1) scanned.last_name = parts.slice(1).join(' ');
            }
            if (data.email) scanned.email = data.email;
            if (data.phone) scanned.phone = data.phone;
            if (data.company) scanned.company = data.company;
            if (data.title) scanned.title = data.title;
            // The source profile used to be thrown away: the grab carried it, the lead
            // never stored it, so there was no record of where the lead came from.
            if (data.profile_url) scanned.social = data.profile_url;
            const keys = Object.keys(scanned);
            setActiveFields([...new Set([...activeFields, ...keys])]);
            setFieldValues(f => ({ ...f, ...scanned }));
            Alert.alert(
              'LinkedIn Link Added',
              data.inferred
                ? 'Name read from the profile link, and the link is saved on the lead. Company, title, email and phone were not available — add them below if you need them.'
                : 'LinkedIn data loaded. Review and save.'
            );
          }}
        />
      </Modal>

      <Modal visible={showNFC} animationType="slide" onRequestClose={() => setShowNFC(false)}>
        <NFCEventCapture
          eventName="Networking Event"
          availableTags={availableTags}
          onCapture={(contact, tags) => {
            console.log('NFC Contact:', contact, 'Tags:', tags);
          }}
          onClose={() => setShowNFC(false)}
        />
      </Modal>
      <Modal visible={showScanner} animationType="slide" onRequestClose={() => setShowScanner(false)}>
        <BusinessCardScanner
          onScanComplete={handleScanComplete}
          onClose={() => setShowScanner(false)}
          availableTags={availableTags}
        />
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollView: { padding: 16 },
  header: { marginBottom: 16 },
  title: { fontSize: 26, fontWeight: 'bold', marginBottom: 12 },
  headerActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
  scanButton: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 8, gap: 6,
  },
  scanButtonText: { color: '#fff', fontSize: 13, fontWeight: '600' },
  card: { borderRadius: 12, padding: 16, marginBottom: 16 },
  fieldContainer: { marginBottom: 10 },
  fieldRow: {
    flexDirection: 'row', alignItems: 'center',
  },
  fieldWithRemove: { flex: 1, marginBottom: 0 },
  removeBtn: { marginLeft: 8, padding: 4 },
  input: {
    height: 44, borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, fontSize: 15,
    flex: 1,
  },
  label: { fontSize: 13, marginBottom: 4 },
  sourceRow: { marginBottom: 12 },
  chip: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 18, marginRight: 8,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '500' },
  tagSelector: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 12, paddingVertical: 10,
    marginBottom: 12, gap: 6,
  },
  selectedTagsRow: { flex: 1, flexDirection: 'row', flexWrap: 'wrap', gap: 4 },
  miniTag: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  miniTagText: { fontSize: 11, fontWeight: '500' },
  tagPlaceholder: { flex: 1, fontSize: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '600', marginBottom: 4 },
  addFieldSection: { marginTop: 4 },
  addFieldRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  addFieldChip: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 10, paddingVertical: 6,
    borderRadius: 16, borderWidth: 1, gap: 4,
  },
  addFieldChipText: { fontSize: 12, fontWeight: '500' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  locationText: { fontSize: 12 },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    height: 50, borderRadius: 12, marginBottom: 32, gap: 6,
  },
  submitButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
