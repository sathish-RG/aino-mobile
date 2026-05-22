import { View, Text, StyleSheet, ScrollView, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/useAuthStore';
import api from '@/src/api/client';

interface Lead { id: string; customer_name: string | null; first_click_at: string | null }
interface Commission { id: string; amount: number; status: 'Unpaid' | 'Paid' }

const GREEN = '#1e3c6e';
const AMBER = '#f59e0b';
const BLUE = '#3b82f6';
const EMERALD = '#10b981';

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function MetricCard({
  title, value, icon, color, loading,
}: {
  title: string; value: string;
  icon: React.ComponentProps<typeof Feather>['name']; color: string; loading: boolean;
}) {
  return (
    <View style={[s.card, { borderLeftColor: color }]}>
      <View style={[s.cardIcon, { backgroundColor: color + '14' }]}>
        <Feather name={icon} size={17} color={color} />
      </View>
      {loading ? (
        <ActivityIndicator size="small" color={color} style={{ marginVertical: 8 }} />
      ) : (
        <Text style={s.cardValue} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      )}
      <Text style={s.cardTitle}>{title}</Text>
    </View>
  );
}

export default function AgentDashboard() {
  const { user } = useAuthStore();

  const leadsQuery = useQuery<Lead[]>({
    queryKey: ['my-leads'],
    queryFn: () => api.get('/leads/my').then((r) => r.data.data),
  });

  const commissionsQuery = useQuery<Commission[]>({
    queryKey: ['my-commissions'],
    queryFn: () => api.get('/commissions/my').then((r) => r.data.data),
  });

  const leads = leadsQuery.data ?? [];
  const commissions = commissionsQuery.data ?? [];
  const loading = leadsQuery.isLoading || commissionsQuery.isLoading;

  const totalLeads = leads.length;
  const converted = leads.filter((l) => l.customer_name).length;
  const convRate = totalLeads > 0 ? Math.round((converted / totalLeads) * 100) : 0;
  const pending = commissions.filter((c) => c.status === 'Unpaid').reduce((s, c) => s + c.amount, 0);
  const paid = commissions.filter((c) => c.status === 'Paid').reduce((s, c) => s + c.amount, 0);

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header banner ── */}
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            <Text style={s.greeting}>{getGreeting()}</Text>
            <Text style={s.name}>{user?.name ?? 'Agent'}</Text>
            <View style={s.rolePill}>
              <View style={s.roleDot} />
              <Text style={s.roleText}>Agent</Text>
            </View>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{getInitials(user?.name ?? 'A')}</Text>
          </View>
        </View>

        {/* ── Earnings summary ── */}
        {!loading && (paid > 0 || pending > 0) && (
          <View style={s.earningsRow}>
            <View style={s.earningsCard}>
              <Text style={s.earningsLabel}>Paid Out</Text>
              <Text style={[s.earningsValue, { color: GREEN }]}>{formatINR(paid)}</Text>
            </View>
            <View style={s.earningsDivider} />
            <View style={s.earningsCard}>
              <Text style={s.earningsLabel}>Pending</Text>
              <Text style={[s.earningsValue, { color: AMBER }]}>{formatINR(pending)}</Text>
            </View>
          </View>
        )}

        <Text style={s.sectionLabel}>YOUR PERFORMANCE</Text>

        <View style={s.grid}>
          <MetricCard title="Total Leads" value={String(totalLeads)} icon="activity" color={GREEN} loading={loading} />
          <MetricCard title="Converted" value={String(converted)} icon="user-check" color={BLUE} loading={loading} />
          <MetricCard title="Conv. Rate" value={`${convRate}%`} icon="percent" color={EMERALD} loading={loading} />
          <MetricCard title="Pending ₹" value={loading ? '…' : formatINR(pending)} icon="clock" color={AMBER} loading={loading} />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { paddingBottom: 40 },
  banner: {
    backgroundColor: '#1e3c6e',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  bannerLeft: {},
  greeting: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 4 },
  name: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 8 },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  roleDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#4ade80' },
  roleText: { fontSize: 11, fontWeight: '700', color: '#fff', letterSpacing: 0.3 },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  earningsRow: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  earningsCard: { flex: 1, alignItems: 'center', paddingVertical: 18 },
  earningsDivider: { width: 1, backgroundColor: '#e8edf5', marginVertical: 12 },
  earningsLabel: { fontSize: 11, fontWeight: '600', color: '#94a3b8', letterSpacing: 0.4, marginBottom: 4 },
  earningsValue: { fontSize: 20, fontWeight: '800' },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, paddingHorizontal: 20 },
  card: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 18,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardIcon: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  cardValue: { fontSize: 24, fontWeight: '900', color: '#0a0f1c', marginBottom: 3 },
  cardTitle: { fontSize: 12, color: '#64748b', fontWeight: '500' },
});
