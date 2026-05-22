import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/api/client';

interface Commission {
  id: string;
  amount: number;
  status: 'Unpaid' | 'Paid';
  settled_at: string | null;
  unit: {
    id: string;
    unit_number: string;
    price: number;
    project: { id: string; project_name: string };
  };
}

const GREEN = '#1e3c6e';
const AMBER = '#f59e0b';

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

function CommissionCard({ item }: { item: Commission }) {
  const isPaid = item.status === 'Paid';
  const accentColor = isPaid ? GREEN : AMBER;

  return (
    <View style={[s.card, { borderLeftColor: accentColor }]}>
      <View style={s.cardInner}>
        <View style={s.cardLeft}>
          <Text style={s.unitLabel}>Unit #{item.unit.unit_number}</Text>
          <Text style={s.projectName} numberOfLines={1}>{item.unit.project.project_name}</Text>
          <View style={s.dateRow}>
            <Feather name={isPaid ? 'check-circle' : 'clock'} size={11} color={accentColor} />
            <Text style={[s.dateText, { color: accentColor }]}>
              {isPaid && item.settled_at
                ? `Paid ${formatDate(item.settled_at)}`
                : 'Pending settlement'}
            </Text>
          </View>
        </View>

        <View style={s.cardRight}>
          <Text style={[s.amount, { color: accentColor }]}>{formatINR(item.amount)}</Text>
          <View style={[s.badge, { backgroundColor: accentColor + '14' }]}>
            <View style={[s.dot, { backgroundColor: accentColor }]} />
            <Text style={[s.badgeText, { color: accentColor }]}>{item.status}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

export default function CommissionsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const { data: commissions = [], isLoading, isError, refetch } = useQuery<Commission[]>({
    queryKey: ['my-commissions'],
    queryFn: () => api.get('/commissions/my').then((r) => r.data.data),
  });

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  const totalEarned = commissions.filter((c) => c.status === 'Paid').reduce((s, c) => s + c.amount, 0);
  const totalPending = commissions.filter((c) => c.status === 'Unpaid').reduce((s, c) => s + c.amount, 0);

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.errText}>Could not load commissions</Text>
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
        <Text style={s.headerTitle}>Commissions</Text>
        {commissions.length > 0 && (
          <Text style={s.headerCount}>{commissions.length} total</Text>
        )}
      </View>

      <FlatList
        data={commissions}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListHeaderComponent={
          commissions.length > 0 ? (
            <View style={s.summaryCard}>
              <View style={s.summaryHalf}>
                <Text style={s.summaryLabel}>Total Earned</Text>
                <Text style={[s.summaryValue, { color: GREEN }]}>{formatINR(totalEarned)}</Text>
              </View>
              <View style={s.summaryDivider} />
              <View style={s.summaryHalf}>
                <Text style={s.summaryLabel}>Pending</Text>
                <Text style={[s.summaryValue, { color: AMBER }]}>{formatINR(totalPending)}</Text>
              </View>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Feather name="dollar-sign" size={48} color="#cbd5e1" />
            <Text style={s.emptyTitle}>No commissions yet</Text>
            <Text style={s.emptyHint}>Commissions appear once bookings are confirmed</Text>
          </View>
        }
        renderItem={({ item }) => <CommissionCard item={item} />}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  errText: { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: GREEN },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
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
  headerCount: {
    fontSize: 12, fontWeight: '700', color: '#64748b',
    backgroundColor: '#f1f5f9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  list: { padding: 16, gap: 12, paddingBottom: 40 },
  summaryCard: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 20,
    marginBottom: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    overflow: 'hidden',
  },
  summaryHalf: { flex: 1, alignItems: 'center', paddingVertical: 20 },
  summaryDivider: { width: 1, backgroundColor: '#e8edf5', marginVertical: 12 },
  summaryLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 6 },
  summaryValue: { fontSize: 22, fontWeight: '800' },
  card: {
    backgroundColor: '#fff',
    borderRadius: 18,
    borderLeftWidth: 4,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  cardLeft: { flex: 1, marginRight: 12 },
  unitLabel: { fontSize: 14, fontWeight: '700', color: '#0a0f1c', marginBottom: 3 },
  projectName: { fontSize: 12, color: '#64748b', marginBottom: 6 },
  dateRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dateText: { fontSize: 11, fontWeight: '600' },
  cardRight: { alignItems: 'flex-end', gap: 8 },
  amount: { fontSize: 17, fontWeight: '900' },
  badge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 60 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0a0f1c', marginTop: 16, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
