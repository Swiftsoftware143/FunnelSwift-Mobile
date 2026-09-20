import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
  Linking,
  Image,
  Share,
  Modal,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../lib/ThemeContext';
import * as http from '../../lib/http';

function getTypeColor(type: string): string {
  switch (type) {
    case 'Business Card': return '#22C55E';
    case 'Mini-Page': return '#5B4FFF';
    default: return '#64748b';
  }
}

export default function KineticCardsScreen({ route, navigation }: any) {
  const { colors } = useTheme();
  const [cards, setCards] = useState<any[]>([]);
  const [qrs, setQrs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [planNotice, setPlanNotice] = useState<string | null>(null);
  const initialTab = route?.params?.tab === 'qrs' ? 'qrs' : 'cards';
  const [activeTab, setActiveTab] = useState<'cards' | 'qrs'>(initialTab);
  const [fullscreenQr, setFullscreenQr] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Load the two lists independently: a plan-gated 402 on cards must not blank the QR
      // list, and it must explain itself instead of rendering a silent "No cards yet".
      let cardsRes: any = [];
      let notice: string | null = null;
      try {
        cardsRes = await http.getKineticCards();
      } catch (e: any) {
        notice = e?.status === 402
          ? 'Your current plan does not include Kinetic Cards. Upgrade to create your card.'
          : e?.message || 'Could not load your cards.';
      }
      const qrsRes = await http.getKineticQrCodes().catch(() => ({ data: [] }));
      setPlanNotice(notice);
      setCards(Array.isArray(cardsRes) ? cardsRes : cardsRes?.data || []);
      setQrs(Array.isArray(qrsRes?.data) ? qrsRes.data : []);
    } catch {}
    setLoading(false);
  }

  async function onRefresh() {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  }

  function getCardType(card: any): string {
    if (card.layout_blocks) {
      try {
        const blocks = JSON.parse(card.layout_blocks);
        if (blocks.length) {
          const t = blocks[0].type || '';
          if (t === 'business_card') return 'Business Card';
          if (t === 'hero' || t === 'features' || t === 'lead_form') return 'Mini-Page';
        }
      } catch {}
    }
    return 'Bio-Link';
  }

  async function shareCard(slug: string) {
    try {
      await Share.share({
        message: `Check out my page!\nhttps://funnelswift.net/k/${slug}`,
        url: `https://funnelswift.net/k/${slug}`,
      });
    } catch {}
  }

  function openCard(slug: string) {
    Linking.openURL(`https://funnelswift.net/k/${slug}`);
  }

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      {/* Tab Switcher */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'cards' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('cards')}
        >
          <Ionicons name="flash" size={16} color={activeTab === 'cards' ? '#fff' : colors.text} />
          <Text style={[styles.tabText, { color: activeTab === 'cards' ? '#fff' : colors.text }]}>Cards</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'qrs' && { backgroundColor: colors.primary }]}
          onPress={() => setActiveTab('qrs')}
        >
          <Ionicons name="qr-code" size={16} color={activeTab === 'qrs' ? '#fff' : colors.text} />
          <Text style={[styles.tabText, { color: activeTab === 'qrs' ? '#fff' : colors.text }]}>QR Codes</Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'cards' ? (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My Kinetic Cards</Text>
          {cards.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="flash-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                {planNotice ? 'Cards unavailable' : 'No cards yet'}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                {planNotice || 'Create cards in the FunnelSwift web dashboard'}
              </Text>
            </View>
          ) : (
            cards.map(card => (
              <TouchableOpacity
                key={card.id}
                style={[styles.card, { backgroundColor: colors.surface }]}
                onPress={() => openCard(card.slug)}
              >
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="flash" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{card.title || card.name}</Text>
                    <Text style={[styles.cardSlug, { color: colors.primary }]}>/k/{card.slug}</Text>
                    <View style={styles.typeRow}>
                      <View style={[styles.typeBadge, { backgroundColor: getTypeColor(getCardType(card)) }]}>
                        <Text style={styles.typeBadgeText}>{getCardType(card)}</Text>
                      </View>
                    </View>
                  </View>
                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      style={[styles.cardActionBtn, { backgroundColor: colors.surfaceLight }]}
                      onPress={() => shareCard(card.slug)}
                    >
                      <Ionicons name="share" size={18} color={colors.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                {card.description && (
                  <Text style={[styles.cardDescription, { color: colors.textMuted }]}>{card.description}</Text>
                )}
                <View style={styles.cardFooter}>
                  <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                    {card.is_active !== false ? 'Active' : 'Inactive'}
                  </Text>
                  <Text style={[styles.cardMeta, { color: colors.textMuted }]}>
                    Updated {card.updated_at ? new Date(card.updated_at).toLocaleDateString() : ''}
                  </Text>
                </View>
              </TouchableOpacity>
            ))
          )}
        </>
      ) : (
        <>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>My QR Codes</Text>
          {qrs.length === 0 ? (
            <View style={styles.emptyState}>
              <Ionicons name="qr-code-outline" size={64} color={colors.textMuted} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No QR codes yet</Text>
              <Text style={[styles.emptySubtitle, { color: colors.textMuted }]}>
                Create QR codes from the FunnelSwift web dashboard
              </Text>
            </View>
          ) : (
            qrs.map(qr => (
              <View
                key={qr.id}
                style={[styles.card, { backgroundColor: colors.surface }]}
              >
                <View style={styles.cardRow}>
                  <View style={styles.cardIcon}>
                    <Ionicons name="qr-code" size={24} color={colors.primary} />
                  </View>
                  <View style={styles.cardInfo}>
                    <Text style={[styles.cardName, { color: colors.text }]}>{qr.name}</Text>
                    <Text style={[styles.cardType, { color: colors.textMuted }]}>
                      {qr.card_title || 'Kinetic Card'} • {qr.download_count || 0} scans
                    </Text>
                  </View>
                </View>
                {qr.id && (
                  <View style={styles.qrPreviewRow}>
                    <TouchableOpacity
                      onPress={() => setFullscreenQr(`https://funnelswift.net/api/v1/kinetic/qr/${qr.id}/png`)}
                      activeOpacity={0.7}
                    >
                      <Image
                        source={{ uri: `https://funnelswift.net/api/v1/kinetic/qr/${qr.id}/svg` }}
                        style={styles.qrPreview}
                        resizeMode="contain"
                      />
                    </TouchableOpacity>
                    <View style={styles.qrActions}>
                      <TouchableOpacity
                        style={[styles.qrActionBtn, { backgroundColor: colors.primary }]}
                        onPress={() =>
                          setFullscreenQr(`https://funnelswift.net/api/v1/kinetic/qr/${qr.id}/png`)
                        }
                      >
                        <Ionicons name="scan" size={16} color="#fff" />
                        <Text style={styles.qrActionText}>Show QR</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.qrActionBtn, { backgroundColor: colors.success }]}
                        onPress={() => {
                          const pngUrl = `https://funnelswift.net/api/v1/kinetic/qr/${qr.id}/png`;
                          if (Platform.OS === 'ios') {
                            // iOS can save to camera roll
                            Linking.openURL(pngUrl);
                            Alert.alert('QR Code', 'Image opened in browser. Save to your photos from there.');
                          } else {
                            // Android — trigger download via browser
                            Linking.openURL(pngUrl);
                            Alert.alert('QR Code', 'Image downloading. Save it as your screensaver from your gallery.');
                          }
                        }}
                      >
                        <Ionicons name="download" size={16} color="#fff" />
                        <Text style={styles.qrActionText}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.qrActionBtn, { backgroundColor: colors.surfaceLight }]}
                        onPress={() => {
                          const url = `https://funnelswift.net/k/${qr.card_slug || 'qr'}`;
                          Share.share({ message: `Scan my QR: ${url}`, url });
                        }}
                      >
                        <Ionicons name="share" size={16} color={colors.text} />
                        <Text style={[styles.qrActionText, { color: colors.text }]}>Share</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>
            ))
          )}
        </>
      )}

      {/* Fullscreen QR Modal */}
      <Modal
        visible={!!fullscreenQr}
        transparent
        animationType="fade"
        onRequestClose={() => setFullscreenQr(null)}
      >
        <TouchableOpacity
          style={styles.fullscreenOverlay}
          activeOpacity={1}
          onPress={() => setFullscreenQr(null)}
        >
          {fullscreenQr && (
            <Image
              source={{ uri: fullscreenQr }}
              style={styles.fullscreenQr}
              resizeMode="contain"
            />
          )}
          <Text style={styles.fullscreenHint}>Tap anywhere to close</Text>
        </TouchableOpacity>
      </Modal>
    </ScrollView>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  typeRow: { flexDirection: 'row', marginTop: 4 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  typeBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  tabRow: {
    flexDirection: 'row', gap: 8, marginBottom: 20,
    backgroundColor: '#1e2130', borderRadius: 10, padding: 4,
  },
  tab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 10, borderRadius: 8, gap: 6,
  },
  tabText: { fontSize: 14, fontWeight: '600' },
  sectionTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16 },
  card: { padding: 14, borderRadius: 12, marginBottom: 10 },
  cardRow: { flexDirection: 'row', alignItems: 'center' },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#5B4FFF20', justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  cardInfo: { flex: 1 },
  cardName: { fontSize: 16, fontWeight: '600' },
  cardSlug: { fontSize: 13, marginTop: 2 },
  cardType: { fontSize: 12, marginTop: 2 },
  cardActions: { flexDirection: 'row', gap: 6 },
  cardActionBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  cardDescription: { fontSize: 13, marginTop: 8, lineHeight: 18 },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#2e3245' },
  cardMeta: { fontSize: 11 },
  qrPreviewRow: { flexDirection: 'row', alignItems: 'center', marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#2e3245' },
  qrPreview: { width: 80, height: 80, borderRadius: 8, backgroundColor: '#fff', marginRight: 16 },
  qrActions: { flex: 1, gap: 8 },
  qrActionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 8, borderRadius: 8, gap: 4 },
  qrActionText: { color: '#fff', fontSize: 13, fontWeight: '500' },
  fullscreenOverlay: {
    flex: 1, backgroundColor: 'rgba(0,0,0,0.95)',
    justifyContent: 'center', alignItems: 'center',
  },
  fullscreenQr: {
    width: width * 0.8, height: width * 0.8,
    backgroundColor: '#fff',
    borderRadius: 16, padding: 16,
  },
  fullscreenHint: { color: '#64748b', fontSize: 14, marginTop: 32 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '600', marginTop: 16 },
  emptySubtitle: { fontSize: 13, marginTop: 6, textAlign: 'center' },
});
