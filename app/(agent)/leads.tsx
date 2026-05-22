import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import * as ExpoLinking from 'expo-linking';
import api from '@/src/api/client';

interface Lead {
  id: string;
  share_token: string;
  first_click_at: string | null;
  customer_name: string | null;
  is_locked: boolean;
  project: { id: string; project_name: string; location: string };
}

const GREEN = '#1e3c6e';
const BLUE = '#1e3c6e';

function shareUrl(token: string) {
  return ExpoLinking.createURL(`/book/${token}`);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function LeadCard({ lead }: { lead: Lead }) {
  const [copied, setCopied] = useState(false);
  const opened = lead.first_click_at != null;
  const url = shareUrl(lead.share_token);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    Share.share({ message: url, url });
  };

  return (
    <View style={s.card}>
      <View style={s.cardTop}>
        <View style={s.projectIcon}>
          <Feather name="home" size={14} color={BLUE} />
        </View>
        <View style={s.cardInfo}>
          <Text style={s.projectName} numberOfLines={1}>{lead.project.project_name}</Text>
          <View style={s.locationRow}>
            <Feather name="map-pin" size={11} color="#94a3b8" />
            <Text style={s.location} numberOfLines={1}>{lead.project.location}</Text>
          </View>
        </View>
        {opened ? (
          <View style={s.openedBadge}>
            <View style={s.openedDot} />
            <Text style={s.openedText}>Opened</Text>
          </View>
        ) : (
          <View style={s.pendingBadge}>
            <Text style={s.pendingText}>Pending</Text>
          </View>
        )}
      </View>

      <View style={s.divider} />

      <View style={s.cardMid}>
        <View style={s.customerRow}>
          <View style={s.customerAvatar}>
            <Feather name="user" size={12} color="#64748b" />
          </View>
          <Text style={[s.customerName, !lead.customer_name && s.customerNameMuted]}>
            {lead.customer_name ?? 'Not opened yet'}
          </Text>
        </View>

        {opened && lead.first_click_at && (
          <View style={s.clickedRow}>
            <Feather name="eye" size={11} color={GREEN} />
            <Text style={s.clickedText}>{formatDate(lead.first_click_at)}</Text>
          </View>
        )}
      </View>

      <View style={s.actions}>
        <TouchableOpacity
          style={[s.actionBtn, copied && s.actionBtnCopied]}
          onPress={handleCopy}
          activeOpacity={0.8}
        >
          <Feather name={copied ? 'check' : 'copy'} size={13} color={copied ? GREEN : '#64748b'} />
          <Text style={[s.actionBtnText, copied && { color: GREEN }]}>
            {copied ? 'Copied!' : 'Copy Link'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={s.shareBtn} onPress={handleShare} activeOpacity={0.8}>
          <Feather name="share-2" size={13} color="#fff" />
          <Text style={s.shareBtnText}>Share Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function LeadsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: leads = [], isLoading, isError, refetch } = useQuery<Lead[]>({
    queryKey: ['my-leads'],
    queryFn: () => api.get('/leads/my').then((r) => r.data.data),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const opened = leads.filter((l) => l.first_click_at != null).length;

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color={BLUE} /></View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.errText}>Could not load leads</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>My Leads</Text>
          <Text style={s.headerSub}>{leads.length} total · {opened} opened</Text>
        </View>
        {leads.length > 0 && (
          <View style={[s.countPill, { backgroundColor: BLUE + '14' }]}>
            <Text style={[s.countPillText, { color: BLUE }]}>{leads.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={leads}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <View style={s.emptyIcon}>
              <Feather name="inbox" size={36} color={BLUE} />
            </View>
            <Text style={s.emptyTitle}>No leads yet</Text>
            <Text style={s.emptyHint}>Go to Share to generate your first client link</Text>
          </View>
        }
        renderItem={({ item }) => <LeadCard lead={item} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0a0f1c' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  countPill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20 },
  countPillText: { fontSize: 14, fontWeight: '800' },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  projectIcon: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: BLUE + '14', alignItems: 'center', justifyContent: 'center',
  },
  cardInfo: { flex: 1 },
  projectName: { fontSize: 14, fontWeight: '700', color: '#0a0f1c', marginBottom: 2 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  location: { fontSize: 11, color: '#94a3b8', flex: 1 },
  openedBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: '#e8eef8',
  },
  openedDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: GREEN },
  openedText: { fontSize: 11, color: GREEN, fontWeight: '700' },
  pendingBadge: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20, backgroundColor: '#fef9ec' },
  pendingText: { fontSize: 11, color: '#f59e0b', fontWeight: '700' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 12 },
  cardMid: { gap: 8, marginBottom: 14 },
  customerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  customerAvatar: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  customerName: { fontSize: 13, color: '#0a0f1c', fontWeight: '600', flex: 1 },
  customerNameMuted: { color: '#94a3b8', fontStyle: 'italic', fontWeight: '400' },
  clickedRow: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingLeft: 34 },
  clickedText: { fontSize: 11, color: GREEN, fontWeight: '500' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  actionBtnCopied: { borderColor: GREEN, backgroundColor: '#e8eef8' },
  actionBtnText: { fontSize: 12, fontWeight: '600', color: '#64748b' },
  shareBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 5, paddingVertical: 10, borderRadius: 12, backgroundColor: BLUE,
  },
  shareBtnText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  errText: { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: BLUE },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: BLUE + '14', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0a0f1c', marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
