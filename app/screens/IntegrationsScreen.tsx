/**
 * Settings → Integrations — the Integration Center for FunnelSwift Mobile.
 *
 * Fleet standard 2026-09-20 (/opt/swift/docs/integration-center-standard-2026-09-20.md):
 *  - the provider catalogue comes from the backend's LIVE `available_providers` (never a
 *    hardcoded array here);
 *  - CoreSwift is pinned first, styled as the upgrade path, with the cross-sell CTA + upsell link;
 *  - CoreSwift is the single home for EVERY lead captured in this app (data flows DOWNWARD into
 *    CoreSwift) — the capture push itself runs on the FunnelSwift backend, this screen owns the
 *    connection state, the BYOK key and the manual fallback;
 *  - connection state is read from the backend on every focus, never from local storage;
 *  - the `csk_…` key is pasted here and sent to the backend only. It is never written to
 *    SecureStore/AsyncStorage and never bundled.
 */
import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../../lib/ThemeContext';
import {
  CORESWIFT_UPSELL_URL,
  type CoreSwiftList,
  type CoreSwiftStatus,
  type ProviderCatalogueEntry,
  type ProviderKeyRow,
  connectProvider,
  disconnectProvider,
  extractLists,
  getAvailableProviders,
  getCoreSwiftLists,
  getCoreSwiftStatus,
  getProviderKeys,
  pushLeadToCoreSwift,
  testProvider,
} from '../../lib/coreswift';

export default function IntegrationsScreen({ navigation }: any) {
  const { colors } = useTheme();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [providers, setProviders] = useState<ProviderCatalogueEntry[]>([]);
  const [keys, setKeys] = useState<Record<string, ProviderKeyRow>>({});
  const [status, setStatus] = useState<CoreSwiftStatus | null>(null);

  // Per-provider form state. keyInput holds ONLY what the user just typed — it is cleared as
  // soon as the backend has acknowledged it, and never written to any device store.
  const [keyInput, setKeyInput] = useState<Record<string, string>>({});
  const [baseInput, setBaseInput] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [lists, setLists] = useState<CoreSwiftList[] | null>(null);
  const [pushEmail, setPushEmail] = useState('');
  const [pushName, setPushName] = useState('');

  const load = useCallback(async () => {
    try {
      setError(null);
      const [catalogue, keyRows] = await Promise.all([
        getAvailableProviders(),
        getProviderKeys(),
      ]);
      setProviders(Array.isArray(catalogue) ? catalogue : []);
      const mapped: Record<string, ProviderKeyRow> = {};
      (Array.isArray(keyRows) ? keyRows : []).forEach(r => {
        if (r && typeof r.provider === 'string') mapped[r.provider] = r;
      });
      setKeys(mapped);

      // CoreSwift state straight from the spoke's canonical status endpoint.
      try {
        const st = await getCoreSwiftStatus();
        setStatus(st);
      } catch (e: any) {
        setStatus(null);
        setError(e?.message || 'Could not read the CoreSwift connection state.');
      }
    } catch (e: any) {
      setError(e?.message || 'Could not load the integration catalogue.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  // Re-read the backend every time the screen is focused — never trust a cached value.
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  async function onRefresh() {
    setRefreshing(true);
    await load();
  }

  function flash(message: string) {
    setNotice(message);
    setTimeout(() => setNotice(null), 4000);
  }

  async function onConnect(provider: string, name: string) {
    const key = (keyInput[provider] || '').trim();
    const base = (baseInput[provider] || '').trim();
    if (!key && !keys[provider]) {
      Alert.alert('Key required', `Paste your ${name} API key before connecting.`);
      return;
    }
    setBusy(provider);
    try {
      await connectProvider(provider, key || undefined, base || undefined);
      // Drop the typed secret from component state; the backend now owns it.
      setKeyInput(prev => ({ ...prev, [provider]: '' }));
      flash(`${name} connected`);
      await load();
    } catch (e: any) {
      Alert.alert('Connect failed', e?.message || 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  async function onTest(provider: string, name: string) {
    setBusy(provider);
    try {
      const r = await testProvider(provider);
      Alert.alert(
        `Test connection — ${name}`,
        `${r.valid ? 'PASS — ' : 'FAIL — '}${r.detail || 'no detail'}` +
          (r.base_url ? `\n(${r.base_url})` : ''),
      );
    } catch (e: any) {
      Alert.alert('Test failed', e?.message || 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  function onDisconnect(provider: string, name: string) {
    Alert.alert('Disconnect', `Disconnect ${name} for this workspace?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Disconnect',
        style: 'destructive',
        onPress: async () => {
          setBusy(provider);
          try {
            await disconnectProvider(provider);
            setLists(null);
            flash(`${name} disconnected`);
            await load();
          } catch (e: any) {
            Alert.alert('Disconnect failed', e?.message || 'Unknown error');
          } finally {
            setBusy(null);
          }
        },
      },
    ]);
  }

  async function onLists() {
    setBusy('coreswift-lists');
    try {
      const r = await getCoreSwiftLists();
      const l = extractLists(r);
      setLists(l);
      flash(`${l.length} CoreSwift list(s) visible to your key`);
    } catch (e: any) {
      Alert.alert('Lists failed', e?.message || 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  async function onPushNow() {
    const email = pushEmail.trim();
    const name = pushName.trim();
    if (!email && !name) {
      Alert.alert('Nothing to push', 'Enter an email or a name first.');
      return;
    }
    setBusy('coreswift-push');
    try {
      const r = await pushLeadToCoreSwift({ email: email || undefined, name: name || undefined });
      setPushEmail('');
      setPushName('');
      flash(r.status === 'pushed' ? 'Lead pushed to CoreSwift CRM' : `Not pushed: ${r.message}`);
    } catch (e: any) {
      Alert.alert('Push failed', e?.message || 'Unknown error');
    } finally {
      setBusy(null);
    }
  }

  const css = styles;
  const coreswift = providers.find(p => p.key === 'coreswift');
  const others = providers.filter(p => p.key !== 'coreswift');

  if (loading) {
    return (
      <View style={[css.center, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} />
        <Text style={{ color: colors.textMuted, marginTop: 12 }}>
          Reading integration state from FunnelSwift…
        </Text>
      </View>
    );
  }

  function renderCard(p: ProviderCatalogueEntry) {
    const rec = keys[p.key];
    const connected = !!rec && rec.is_active !== false;
    const isCore = p.key === 'coreswift';
    const isBusy = busy === p.key;
    const activeBase = baseInput[p.key] ?? (p.key === 'coreswift' ? status?.base_url || '' : rec?.base_url || '');

    return (
      <View
        key={p.key}
        testID={`integration-card-${p.key}`}
        style={[
          css.card,
          { backgroundColor: colors.surface, borderColor: isCore ? colors.primary : colors.border },
          isCore && css.cardPinned,
        ]}
      >
        <View style={css.cardHead}>
          <Text style={[css.cardTitle, { color: colors.text }]}>{p.name}</Text>
          {p.native && (
            <View style={[css.badge, { backgroundColor: colors.primary + '30' }]}>
              <Text style={[css.badgeText, { color: colors.primaryLight }]}>Native</Text>
            </View>
          )}
          <View
            style={[
              css.badge,
              { backgroundColor: connected ? colors.success + '25' : colors.surfaceLight },
            ]}
          >
            <Text
              style={[css.badgeText, { color: connected ? colors.success : colors.textMuted }]}
            >
              {connected ? 'Connected' : 'Not connected'}
            </Text>
          </View>
        </View>

        <Text style={[css.cardDesc, { color: colors.textMuted }]}>{p.description}</Text>

        {isCore && (
          <View style={css.coreBody}>
            <Text style={[css.statusLine, { color: colors.text }]}>
              {status
                ? status.connected
                  ? `Connected to ${status.base_url}${status.key_preview ? ` · key ${status.key_preview}` : ''}`
                  : `Not connected · endpoint ${status.base_url}`
                : 'Connection state unknown'}
            </Text>
            <Text style={[css.statusDirection, { color: colors.textMuted }]}>
              Inbound: every lead you capture here is pushed into CoreSwift.
            </Text>

            <Text style={[css.cta, { color: colors.primaryLight }]}>
              One CRM for every tool you just connected — every lead you capture lands in CoreSwift.
            </Text>
            <TouchableOpacity onPress={() => Linking.openURL(CORESWIFT_UPSELL_URL)}>
              <Text style={[css.upsell, { color: colors.primaryLight }]}>
                Upgrade to CoreSwift CRM →
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <TextInput
          testID={`integration-key-${p.key}`}
          style={[css.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
          placeholder={rec?.api_key_masked ? `Stored: ${rec.api_key_masked}` : 'API key'}
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
          value={keyInput[p.key] || ''}
          onChangeText={t => setKeyInput(prev => ({ ...prev, [p.key]: t }))}
        />

        {(p.requires_base_url || isCore) && (
          <TextInput
            testID={`integration-base-${p.key}`}
            style={[css.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
            placeholder="Base URL (optional)"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            value={activeBase}
            onChangeText={t => setBaseInput(prev => ({ ...prev, [p.key]: t }))}
          />
        )}

        <View style={css.btnRow}>
          <TouchableOpacity
            testID={`integration-connect-${p.key}`}
            style={[css.btn, { backgroundColor: colors.primary }]}
            disabled={isBusy}
            onPress={() => onConnect(p.key, p.name)}
          >
            {isBusy ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={css.btnText}>{connected ? 'Save' : 'Connect'}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            testID={`integration-test-${p.key}`}
            style={[css.btnOutline, { borderColor: colors.border }]}
            disabled={isBusy}
            onPress={() => onTest(p.key, p.name)}
          >
            <Text style={[css.btnOutlineText, { color: colors.text }]}>Test connection</Text>
          </TouchableOpacity>

          {connected && (
            <TouchableOpacity
              testID={`integration-disconnect-${p.key}`}
              style={[css.btnOutline, { borderColor: colors.error + '70' }]}
              disabled={isBusy}
              onPress={() => onDisconnect(p.key, p.name)}
            >
              <Text style={[css.btnOutlineText, { color: colors.error }]}>Disconnect</Text>
            </TouchableOpacity>
          )}
        </View>

        {isCore && (
          <View style={css.coreExtra}>
            <TouchableOpacity
              testID="coreswift-lists"
              style={[css.btnOutline, { borderColor: colors.border }]}
              disabled={busy === 'coreswift-lists'}
              onPress={onLists}
            >
              <Text style={[css.btnOutlineText, { color: colors.text }]}>Show lists</Text>
            </TouchableOpacity>

            {lists !== null && (
              <Text style={[css.lists, { color: colors.textMuted }]}>
                {lists.length === 0
                  ? 'No lists visible to this key.'
                  : lists.map(l => l?.name || l?.id || 'list').join(' · ')}
              </Text>
            )}

            <Text style={[css.sectionLabel, { color: colors.textMuted }]}>
              Push a lead now (manual fallback)
            </Text>
            <TextInput
              testID="coreswift-push-email"
              style={[css.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="lead@example.com"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              value={pushEmail}
              onChangeText={setPushEmail}
            />
            <TextInput
              testID="coreswift-push-name"
              style={[css.input, { backgroundColor: colors.background, color: colors.text, borderColor: colors.border }]}
              placeholder="Name (optional)"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="words"
              value={pushName}
              onChangeText={setPushName}
            />
            <TouchableOpacity
              testID="coreswift-push"
              style={[css.btnOutline, { borderColor: colors.border }]}
              disabled={busy === 'coreswift-push'}
              onPress={onPushNow}
            >
              <Text style={[css.btnOutlineText, { color: colors.text }]}>Push to CoreSwift</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  return (
    <ScrollView
      style={{ backgroundColor: colors.background }}
      contentContainerStyle={css.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={colors.primary}
        />
      }
    >
      <Text style={[css.intro, { color: colors.textMuted }]}>
        Connect the tools this app captures leads with. Connection state is read live from
        FunnelSwift — API keys are sent to your FunnelSwift workspace and are never stored on this
        device.
      </Text>

      {!!error && (
        <View style={[css.banner, { backgroundColor: colors.error + '20', borderColor: colors.error }]}>
          <Text style={[css.bannerText, { color: colors.error }]}>{error}</Text>
        </View>
      )}
      {!!notice && (
        <View style={[css.banner, { backgroundColor: colors.success + '20', borderColor: colors.success }]}>
          <Text style={[css.bannerText, { color: colors.success }]}>{notice}</Text>
        </View>
      )}

      {providers.length === 0 ? (
        <Text style={[css.empty, { color: colors.textMuted }]}>
          No integrations in this workspace's catalogue yet.
        </Text>
      ) : (
        <>
          {coreswift ? (
            renderCard(coreswift)
          ) : (
            <Text style={[css.empty, { color: colors.textMuted }]}>
              CoreSwift is not in the catalogue returned by FunnelSwift.
            </Text>
          )}

          <Text style={[css.sectionLabel, { color: colors.textMuted }]}>
            More integrations ({others.length})
          </Text>
          {others.map(renderCard)}
        </>
      )}

      <Text style={[css.footer, { color: colors.textMuted }]}>
        {navigation ? 'Settings › Integrations · ' : ''}FunnelSwift Mobile
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 16, paddingBottom: 48 },
  intro: { fontSize: 13, lineHeight: 19, marginBottom: 14 },
  banner: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 12 },
  bannerText: { fontSize: 13 },
  empty: { fontSize: 13, marginVertical: 12 },
  card: { borderWidth: 1, borderRadius: 14, padding: 14, marginBottom: 14 },
  cardPinned: { borderWidth: 2 },
  cardHead: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginRight: 6 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, marginRight: 6 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  cardDesc: { fontSize: 12, marginTop: 6 },
  coreBody: { marginTop: 8, marginBottom: 4 },
  statusLine: { fontSize: 13, fontWeight: '600' },
  statusDirection: { fontSize: 12, marginTop: 2 },
  cta: { fontSize: 12, marginTop: 8, fontWeight: '600' },
  upsell: { fontSize: 12, fontWeight: '700', marginTop: 4, textDecorationLine: 'underline' },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 9,
    fontSize: 13,
    marginTop: 8,
  },
  btnRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  btn: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, minWidth: 96, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  btnOutline: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 8, borderWidth: 1 },
  btnOutlineText: { fontWeight: '600', fontSize: 13 },
  coreExtra: { marginTop: 12, gap: 2 },
  lists: { fontSize: 12, marginTop: 8 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginTop: 14,
    marginBottom: 8,
  },
  footer: { fontSize: 11, textAlign: 'center', marginTop: 18 },
});
