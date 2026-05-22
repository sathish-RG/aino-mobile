import { useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  ActivityIndicator, Alert, Modal, Pressable, TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Person {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  is_approved: boolean;
  created_at: string;
}

type Tab = 'agents' | 'owners';

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN  = '#1e3c6e';
const TEAL   = '#1e3c6e' // navy;
const ORANGE = '#7a2030' // maroon;
const AMBER  = '#f59e0b';
const RED    = '#ef4444';

const TAB_CONFIG: Record<Tab, { color: string; label: string; noun: string; icon: React.ComponentProps<typeof Feather>['name'] }> = {
  agents: { color: TEAL,   label: 'SALES AGENT',      noun: 'agent', icon: 'users' },
  owners: { color: ORANGE, label: 'PROPERTY OWNER',   noun: 'owner', icon: 'user-check' },
};

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase();
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ─── Grid card ───────────────────────────────────────────────────────────────

function PersonCard({
  person, tab, onPress,
}: { person: Person; tab: Tab; onPress: () => void }) {
  const { color } = TAB_CONFIG[tab];
  const accentColor = person.is_approved ? color : AMBER;

  return (
    <TouchableOpacity style={[s.card, { borderTopColor: accentColor }]} onPress={onPress} activeOpacity={0.8}>
      <View style={s.cardTopRow}>
        <View style={[s.avatar, { backgroundColor: accentColor + '18' }]}>
          <Text style={[s.avatarText, { color: accentColor }]}>{getInitials(person.name)}</Text>
        </View>
        <View style={[s.statusDot, { backgroundColor: person.is_approved ? accentColor : AMBER }]} />
      </View>
      <Text style={s.cardName} numberOfLines={1}>{person.name}</Text>
      <Text style={[s.cardRoleLabel, { color: accentColor }]}>{TAB_CONFIG[tab].label}</Text>
      <View style={s.cardPhone}>
        <Feather name="phone" size={11} color="#94a3b8" />
        <Text style={s.cardPhoneText} numberOfLines={1}>{person.phone}</Text>
      </View>
      <View style={[s.statusPill, { backgroundColor: accentColor + '14' }]}>
        <Text style={[s.statusPillText, { color: accentColor }]}>
          {person.is_approved ? 'Active' : 'Pending'}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

// ─── Detail bottom sheet ─────────────────────────────────────────────────────

function DetailSheet({
  person, tab, onClose,
  onApprove, onDeactivate, approving, deactivating,
}: {
  person: Person; tab: Tab; onClose: () => void;
  onApprove: () => void; onDeactivate: () => void;
  approving: boolean; deactivating: boolean;
}) {
  const insets = useSafeAreaInsets();
  const { color, label } = TAB_CONFIG[tab];
  const accentColor = person.is_approved ? color : AMBER;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={onClose} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={s.sheetHandle} />

          {/* Avatar + identity */}
          <View style={s.sheetHero}>
            <View style={[s.sheetAvatar, { backgroundColor: accentColor + '18' }]}>
              <Text style={[s.sheetAvatarText, { color: accentColor }]}>{getInitials(person.name)}</Text>
            </View>
            <View style={s.sheetHeroInfo}>
              <Text style={s.sheetName}>{person.name}</Text>
              <Text style={[s.sheetRoleLabel, { color: accentColor }]}>{label}</Text>
            </View>
            <View style={[s.sheetStatusBadge, { backgroundColor: accentColor + '14' }]}>
              <View style={[s.sheetStatusDot, { backgroundColor: accentColor }]} />
              <Text style={[s.sheetStatusText, { color: accentColor }]}>
                {person.is_approved ? 'Active' : 'Pending'}
              </Text>
            </View>
          </View>

          {/* Info rows */}
          <View style={s.infoBlock}>
            <InfoRow icon="phone" value={person.phone} />
            {person.email && <InfoRow icon="mail" value={person.email} />}
            <InfoRow icon="calendar" value={`Joined ${formatDate(person.created_at)}`} />
          </View>

          {/* Actions */}
          <View style={s.sheetActions}>
            {!person.is_approved && (
              <TouchableOpacity
                style={[s.sheetBtn, { backgroundColor: GREEN }, approving && s.btnDisabled]}
                onPress={onApprove}
                disabled={approving || deactivating}
                activeOpacity={0.8}
              >
                {approving ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="check" size={15} color="#fff" />
                    <Text style={s.sheetBtnText}>Approve</Text>
                  </>
                )}
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[s.sheetBtn, { backgroundColor: RED }, deactivating && s.btnDisabled]}
              onPress={onDeactivate}
              disabled={approving || deactivating}
              activeOpacity={0.8}
            >
              {deactivating ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Feather name="slash" size={15} color="#fff" />
                  <Text style={s.sheetBtnText}>Deactivate</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function InfoRow({ icon, value }: { icon: React.ComponentProps<typeof Feather>['name']; value: string }) {
  return (
    <View style={s.infoRow}>
      <View style={s.infoIconWrap}>
        <Feather name={icon} size={14} color="#64748b" />
      </View>
      <Text style={s.infoValue}>{value}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function TeamScreen() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>('agents');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<{ person: Person; tab: Tab } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // ── Queries (both always active for instant switching) ──────────────────────

  const agentsQuery = useQuery<Person[]>({
    queryKey: ['admin-agents'],
    queryFn: () => api.get('/admin/agents').then((r) => r.data.data),
  });

  const ownersQuery = useQuery<Person[]>({
    queryKey: ['admin-owners'],
    queryFn: () => api.get('/admin/owners').then((r) => r.data.data),
  });

  const currentQuery = tab === 'agents' ? agentsQuery : ownersQuery;
  const list = currentQuery.data ?? [];

  // ── Mutations ───────────────────────────────────────────────────────────────

  const agentApprove = useMutation({
    mutationFn: (id: string) => api.post(`/admin/agents/${id}/approve`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-agents'] });
      const prev = queryClient.getQueryData<Person[]>(['admin-agents']);
      queryClient.setQueryData<Person[]>(['admin-agents'], (old) =>
        old?.map((p) => p.id === id ? { ...p, is_approved: true } : p));
      return { prev };
    },
    onError: (err: any, _, ctx) => {
      queryClient.setQueryData(['admin-agents'], ctx?.prev);
      Alert.alert('Error', err.response?.data?.message ?? 'Could not approve.');
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['admin-agents'] }); setSelected(null); },
  });

  const agentDeactivate = useMutation({
    mutationFn: (id: string) => api.post(`/admin/agents/${id}/deactivate`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-agents'] });
      const prev = queryClient.getQueryData<Person[]>(['admin-agents']);
      queryClient.setQueryData<Person[]>(['admin-agents'], (old) =>
        old?.map((p) => p.id === id ? { ...p, is_approved: false } : p));
      return { prev };
    },
    onError: (err: any, _, ctx) => {
      queryClient.setQueryData(['admin-agents'], ctx?.prev);
      Alert.alert('Error', err.response?.data?.message ?? 'Could not deactivate.');
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['admin-agents'] }); setSelected(null); },
  });

  const ownerApprove = useMutation({
    mutationFn: (id: string) => api.post(`/admin/owners/${id}/approve`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-owners'] });
      const prev = queryClient.getQueryData<Person[]>(['admin-owners']);
      queryClient.setQueryData<Person[]>(['admin-owners'], (old) =>
        old?.map((p) => p.id === id ? { ...p, is_approved: true } : p));
      return { prev };
    },
    onError: (err: any, _, ctx) => {
      queryClient.setQueryData(['admin-owners'], ctx?.prev);
      Alert.alert('Error', err.response?.data?.message ?? 'Could not approve.');
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['admin-owners'] }); setSelected(null); },
  });

  const ownerDeactivate = useMutation({
    mutationFn: (id: string) => api.post(`/admin/owners/${id}/deactivate`),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['admin-owners'] });
      const prev = queryClient.getQueryData<Person[]>(['admin-owners']);
      queryClient.setQueryData<Person[]>(['admin-owners'], (old) =>
        old?.map((p) => p.id === id ? { ...p, is_approved: false } : p));
      return { prev };
    },
    onError: (err: any, _, ctx) => {
      queryClient.setQueryData(['admin-owners'], ctx?.prev);
      Alert.alert('Error', err.response?.data?.message ?? 'Could not deactivate.');
    },
    onSettled: () => { queryClient.invalidateQueries({ queryKey: ['admin-owners'] }); setSelected(null); },
  });

  const approveMut    = tab === 'agents' ? agentApprove    : ownerApprove;
  const deactivateMut = tab === 'agents' ? agentDeactivate : ownerDeactivate;

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const handleRefresh = async () => {
    setRefreshing(true);
    await currentQuery.refetch();
    setRefreshing(false);
  };

  const agents = agentsQuery.data ?? [];
  const owners = ownersQuery.data ?? [];

  const q = search.trim().toLowerCase();
  const filtered = q
    ? list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.phone.includes(q) ||
          (p.email?.toLowerCase().includes(q) ?? false),
      )
    : list;

  const tabStats = (data: Person[], color: string) => ({
    active:  data.filter((p) => p.is_approved).length,
    pending: data.filter((p) => !p.is_approved).length,
    color,
  });

  const stats = tab === 'agents' ? tabStats(agents, TEAL) : tabStats(owners, ORANGE);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* ── Header ── */}
      <View style={s.header}>
        <View>
          <Text style={s.headerTitle}>Team</Text>
          <View style={s.headerStatRow}>
            <View style={[s.statPill, { backgroundColor: stats.color + '14' }]}>
              <View style={[s.statDot, { backgroundColor: stats.color }]} />
              <Text style={[s.statPillText, { color: stats.color }]}>{stats.active} active</Text>
            </View>
            {stats.pending > 0 && (
              <View style={[s.statPill, { backgroundColor: AMBER + '18' }]}>
                <View style={[s.statDot, { backgroundColor: AMBER }]} />
                <Text style={[s.statPillText, { color: AMBER }]}>{stats.pending} pending</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* ── Search bar ── */}
      <View style={s.searchWrap}>
        <View style={s.searchBox}>
          <Feather name="search" size={16} color="#94a3b8" />
          <TextInput
            style={s.searchInput}
            placeholder={`Search ${TAB_CONFIG[tab].noun}s by name, phone…`}
            placeholderTextColor="#94a3b8"
            value={search}
            onChangeText={setSearch}
            returnKeyType="search"
            autoCorrect={false}
            clearButtonMode="never"
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Feather name="x" size={16} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>
        {q.length > 0 && (
          <Text style={s.searchResult}>
            {filtered.length} result{filtered.length !== 1 ? 's' : ''}
          </Text>
        )}
      </View>

      {/* ── Segment control ── */}
      <View style={s.segmentWrap}>
        <View style={s.segment}>
          {(['agents', 'owners'] as Tab[]).map((t) => {
            const { color, noun, icon } = TAB_CONFIG[t];
            const count = (t === 'agents' ? agents : owners).length;
            const active = tab === t;
            return (
              <TouchableOpacity
                key={t}
                style={[s.segTab, active && { backgroundColor: color }]}
                onPress={() => { setTab(t); setSearch(''); }}
                activeOpacity={0.8}
              >
                <Feather name={icon} size={14} color={active ? '#fff' : '#94a3b8'} />
                <Text style={[s.segTabText, active && s.segTabTextActive]}>
                  {noun.charAt(0).toUpperCase() + noun.slice(1)}s
                </Text>
                {count > 0 && (
                  <View style={[s.segCount, active ? s.segCountActive : s.segCountInactive]}>
                    <Text style={[s.segCountText, active && { color: color }]}>{count}</Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* ── Content ── */}
      {currentQuery.isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={TAB_CONFIG[tab].color} />
        </View>
      ) : currentQuery.isError ? (
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.centerText}>Could not load {TAB_CONFIG[tab].noun}s</Text>
          <TouchableOpacity style={[s.retryBtn, { backgroundColor: TAB_CONFIG[tab].color }]} onPress={() => currentQuery.refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          key={tab}
          data={filtered}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={s.colWrap}
          contentContainerStyle={s.grid}
          onRefresh={handleRefresh}
          refreshing={refreshing}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Feather name={TAB_CONFIG[tab].icon} size={48} color="#cbd5e1" />
              <Text style={s.emptyTitle}>No {TAB_CONFIG[tab].noun}s yet</Text>
              <Text style={s.emptyHint}>
                {TAB_CONFIG[tab].noun === 'agent' ? 'Agents' : 'Owners'} will appear here after registering
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PersonCard
              person={item}
              tab={tab}
              onPress={() => setSelected({ person: item, tab })}
            />
          )}
        />
      )}

      {/* ── Detail sheet ── */}
      {selected && (
        <DetailSheet
          person={selected.person}
          tab={selected.tab}
          onClose={() => setSelected(null)}
          onApprove={() => approveMut.mutate(selected.person.id)}
          onDeactivate={() =>
            Alert.alert(
              `Deactivate ${TAB_CONFIG[selected.tab].noun}`,
              `Remove ${selected.person.name}'s access?`,
              [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Deactivate', style: 'destructive', onPress: () => deactivateMut.mutate(selected.person.id) },
              ],
            )
          }
          approving={approveMut.isPending && approveMut.variables === selected.person.id}
          deactivating={deactivateMut.isPending && deactivateMut.variables === selected.person.id}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const CARD_W = '48%';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centerText: { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },

  // Header
  header: {
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingTop: 18, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0a0f1c', marginBottom: 6 },
  headerStatRow: { flexDirection: 'row', gap: 8 },
  statPill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statPillText: { fontSize: 12, fontWeight: '700' },

  // Segment
  segmentWrap: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, paddingTop: 10 },
  segment: {
    flexDirection: 'row', backgroundColor: '#f1f5f9',
    borderRadius: 14, padding: 4, gap: 4,
  },
  segTab: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 10, borderRadius: 11,
  },
  segTabText: { fontSize: 13, fontWeight: '700', color: '#94a3b8' },
  segTabTextActive: { color: '#fff' },
  segCount: {
    minWidth: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center', paddingHorizontal: 5,
  },
  segCountActive: { backgroundColor: 'rgba(255,255,255,0.25)' },
  segCountInactive: { backgroundColor: '#e2e8f0' },
  segCountText: { fontSize: 11, fontWeight: '800', color: '#64748b' },

  // Grid
  grid: { padding: 14, paddingBottom: 40 },
  colWrap: { justifyContent: 'space-between', marginBottom: 12 },

  // Card
  card: {
    width: CARD_W,
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 14,
    borderTopWidth: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
    gap: 6,
  },
  cardTopRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 4 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 15, fontWeight: '800' },
  statusDot: { width: 9, height: 9, borderRadius: 5, marginTop: 4 },
  cardName: { fontSize: 14, fontWeight: '800', color: '#0a0f1c' },
  cardRoleLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.4 },
  cardPhone: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardPhoneText: { fontSize: 12, color: '#64748b', flex: 1 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, marginTop: 2 },
  statusPillText: { fontSize: 11, fontWeight: '700' },

  // Detail sheet
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24,
  },
  sheetHandle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginBottom: 24,
  },
  sheetHero: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20 },
  sheetAvatar: {
    width: 60, height: 60, borderRadius: 30,
    alignItems: 'center', justifyContent: 'center',
  },
  sheetAvatarText: { fontSize: 20, fontWeight: '900' },
  sheetHeroInfo: { flex: 1 },
  sheetName: { fontSize: 18, fontWeight: '800', color: '#0a0f1c' },
  sheetRoleLabel: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5, marginTop: 2 },
  sheetStatusBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  sheetStatusDot: { width: 7, height: 7, borderRadius: 4 },
  sheetStatusText: { fontSize: 12, fontWeight: '700' },
  infoBlock: {
    backgroundColor: '#f8fafc', borderRadius: 16, padding: 14,
    gap: 12, marginBottom: 20,
  },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  infoIconWrap: {
    width: 32, height: 32, borderRadius: 10,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#e2e8f0',
  },
  infoValue: { fontSize: 14, color: '#0a0f1c', fontWeight: '500', flex: 1 },
  sheetActions: { flexDirection: 'row', gap: 12 },
  sheetBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 7, paddingVertical: 14, borderRadius: 14,
  },
  sheetBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  btnDisabled: { opacity: 0.5 },

  // Empty
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0a0f1c', marginTop: 16, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },

  // Search
  searchWrap: {
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e8edf5',
    gap: 6,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#0a0f1c',
    padding: 0,
  },
  searchResult: {
    fontSize: 12,
    color: '#94a3b8',
    fontWeight: '600',
    paddingHorizontal: 4,
  },
});
