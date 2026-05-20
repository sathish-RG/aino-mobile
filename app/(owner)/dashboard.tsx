import {
  View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/useAuthStore';
import api from '@/src/api/client';

interface AgentPerf { agentId: string; name: string; bookings: number; commissionTotal: number }
interface OwnerReports {
  revenue: number; pendingCommissions: number; soldUnits: number;
  bookedUnits: number; agentPerformance: AgentPerf[];
}

const GREEN = '#066a46';
const AMBER = '#f59e0b';
const ORANGE = '#ea580c';

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function StatCard({
  title, value, icon, color, isCurrency,
}: {
  title: string; value: number;
  icon: React.ComponentProps<typeof Feather>['name']; color: string; isCurrency?: boolean;
}) {
  return (
    <View style={[s.statCard, { borderLeftColor: color }]}>
      <View style={[s.statIcon, { backgroundColor: color + '14' }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={s.statValue} adjustsFontSizeToFit numberOfLines={1}>
        {isCurrency ? formatINR(value) : String(value)}
      </Text>
      <Text style={s.statTitle}>{title}</Text>
    </View>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery<OwnerReports>({
    queryKey: ['owner-reports'],
    queryFn: () => api.get('/owner/reports').then((r) => r.data.data),
    staleTime: 60_000,
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header banner ── */}
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            <Text style={s.bannerRole}>PROPERTY OWNER</Text>
            <Text style={s.bannerName}>{user?.name ?? 'Owner'}</Text>
            <Text style={s.bannerSub}>Portfolio overview</Text>
          </View>
          <View style={s.avatar}>
            <Text style={s.avatarText}>{getInitials(user?.name ?? 'O')}</Text>
          </View>
        </View>

        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={ORANGE} />
          </View>
        )}

        {isError && (
          <View style={s.errorBanner}>
            <Feather name="alert-circle" size={16} color="#ef4444" />
            <Text style={s.errorText}>Could not load reports</Text>
            <TouchableOpacity onPress={() => refetch()}>
              <Text style={s.errorRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && (
          <>
            {/* Revenue card */}
            <View style={s.revCard}>
              <View>
                <Text style={s.revLabel}>TOTAL REVENUE</Text>
                <Text style={s.revValue}>{formatINR(data.revenue)}</Text>
                <View style={s.revBadge}>
                  <Feather name="trending-up" size={12} color={GREEN} />
                  <Text style={s.revBadgeText}>All time</Text>
                </View>
              </View>
              <View style={s.revIconWrap}>
                <Feather name="bar-chart-2" size={28} color={ORANGE} />
              </View>
            </View>

            {/* Unit stats */}
            <Text style={s.sectionLabel}>UNIT SUMMARY</Text>
            <View style={s.statRow}>
              <StatCard title="Booked" value={data.bookedUnits} icon="clock" color={AMBER} />
              <StatCard title="Sold" value={data.soldUnits} icon="check-circle" color={GREEN} />
              <StatCard title="Due Commission" value={data.pendingCommissions} icon="dollar-sign" color="#ef4444" isCurrency />
            </View>

            {/* Agent performance */}
            {data.agentPerformance.length > 0 && (
              <>
                <Text style={s.sectionLabel}>AGENT PERFORMANCE</Text>
                <View style={s.agentTable}>
                  <View style={s.tableHead}>
                    <Text style={[s.headCell, { flex: 2 }]}>Agent</Text>
                    <Text style={s.headCell}>Bookings</Text>
                    <Text style={[s.headCell, { textAlign: 'right' }]}>Commission</Text>
                  </View>
                  {data.agentPerformance.map((a, i) => (
                    <View
                      key={a.agentId}
                      style={[s.tableRow, i === data.agentPerformance.length - 1 && s.tableRowLast]}
                    >
                      <View style={s.agentCell}>
                        <View style={s.agentAvatar}>
                          <Text style={s.agentAvatarText}>
                            {a.name.split(' ').slice(0, 2).map((w) => w[0]).join('').toUpperCase()}
                          </Text>
                        </View>
                        <Text style={s.agentName} numberOfLines={1}>{a.name}</Text>
                      </View>
                      <Text style={s.tableCell}>{a.bookings}</Text>
                      <Text style={[s.tableCell, { textAlign: 'right', fontWeight: '700', color: GREEN }]}>
                        {formatINR(a.commissionTotal)}
                      </Text>
                    </View>
                  ))}
                </View>
              </>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { paddingBottom: 48 },
  banner: {
    backgroundColor: ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  bannerLeft: {},
  bannerRole: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, marginBottom: 4 },
  bannerName: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 2 },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  avatar: {
    width: 52, height: 52, borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '800', color: '#fff' },
  center: { paddingVertical: 60, alignItems: 'center' },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    margin: 20, padding: 14, backgroundColor: '#fef2f2', borderRadius: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: '#ef4444' },
  errorRetry: { fontSize: 13, color: '#ef4444', fontWeight: '700', textDecorationLine: 'underline' },
  revCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', marginHorizontal: 20, marginTop: 20, marginBottom: 4,
    borderRadius: 20, padding: 20,
    shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 3,
  },
  revLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 6 },
  revValue: { fontSize: 30, fontWeight: '900', color: '#0a0f1c', marginBottom: 8 },
  revBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  revBadgeText: { fontSize: 12, color: GREEN, fontWeight: '600' },
  revIconWrap: {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: '#fff3ed', alignItems: 'center', justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8,
    marginHorizontal: 20, marginTop: 24, marginBottom: 12,
  },
  statRow: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 14, borderLeftWidth: 4,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
  },
  statIcon: { width: 32, height: 32, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  statValue: { fontSize: 18, fontWeight: '900', color: '#0a0f1c', marginBottom: 3 },
  statTitle: { fontSize: 11, color: '#64748b', fontWeight: '500' },
  agentTable: {
    marginHorizontal: 20, backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  tableHead: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 11,
    backgroundColor: '#f8fafc', borderBottomWidth: 1, borderBottomColor: '#e8edf5',
  },
  headCell: { flex: 1, fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5 },
  tableRow: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f5f7fa',
  },
  tableRowLast: { borderBottomWidth: 0 },
  agentCell: { flex: 2, flexDirection: 'row', alignItems: 'center', gap: 10 },
  agentAvatar: {
    width: 30, height: 30, borderRadius: 15, backgroundColor: '#e2e8f0',
    alignItems: 'center', justifyContent: 'center',
  },
  agentAvatarText: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  agentName: { flex: 1, fontSize: 13, fontWeight: '600', color: '#0a0f1c' },
  tableCell: { flex: 1, fontSize: 13, color: '#64748b', fontWeight: '500' },
});
