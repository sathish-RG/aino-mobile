import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/useAuthStore';
import api from '@/src/api/client';

interface DashboardStats {
  totalProjects: number;
  publishedProjects: number;
  totalUnits: number;
  availableUnits: number;
  bookedUnits: number;
  soldUnits: number;
  totalAgents: number;
  approvedAgents: number;
  totalBookings: number;
  totalRevenue: number;
}

const GREEN = '#1e3c6e';

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);


function MetricCard({
  title, value, sub, icon, color,
}: {
  title: string; value: string; sub?: string;
  icon: React.ComponentProps<typeof Feather>['name']; color: string;
}) {
  return (
    <View style={[s.card, { borderLeftColor: color }]}>
      <View style={[s.cardIcon, { backgroundColor: color + '14' }]}>
        <Feather name={icon} size={17} color={color} />
      </View>
      <Text style={s.cardValue} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      <Text style={s.cardTitle}>{title}</Text>
      {sub ? <Text style={s.cardSub}>{sub}</Text> : null}
    </View>
  );
}

export default function AdminDashboard() {
  const { user } = useAuthStore();

  const { data, isLoading, isError, refetch } = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
    staleTime: 60_000,
  });

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false}>

        {/* ── Header banner ── */}
        <View style={s.banner}>
          <View style={s.bannerLeft}>
            <Text style={s.bannerRole}>ADMIN PANEL</Text>
            <Text style={s.bannerName}>{user?.name ?? 'Admin'}</Text>
            <Text style={s.bannerSub}>Platform overview</Text>
          </View>
          <Image
            source={require('@/assets/images/aino-logo.png')}
            style={s.bannerLogo}
            resizeMode="contain"
          />
        </View>

        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={GREEN} />
          </View>
        )}

        {isError && (
          <View style={s.errorBanner}>
            <Feather name="alert-circle" size={16} color="#ef4444" />
            <Text style={s.errorText}>Could not load stats</Text>
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
                <Text style={s.revValue}>{formatINR(data.totalRevenue)}</Text>
                <Text style={s.revSub}>{data.totalBookings} bookings total</Text>
              </View>
              <View style={s.revIcon}>
                <Feather name="trending-up" size={28} color={GREEN} />
              </View>
            </View>

            {/* Stats grid */}
            <Text style={s.sectionLabel}>PROJECTS & UNITS</Text>
            <View style={s.grid}>
              <MetricCard
                title="Projects"
                value={String(data.totalProjects)}
                sub={`${data.publishedProjects} live`}
                icon="briefcase"
                color="#3b82f6"
              />
              <MetricCard
                title="Total Units"
                value={String(data.totalUnits)}
                icon="layers"
                color="#8b5cf6"
              />
              <MetricCard
                title="Available"
                value={String(data.availableUnits)}
                icon="check-circle"
                color={GREEN}
              />
              <MetricCard
                title="Booked"
                value={String(data.bookedUnits)}
                icon="clock"
                color="#f59e0b"
              />
              <MetricCard
                title="Sold"
                value={String(data.soldUnits)}
                icon="trending-up"
                color="#10b981"
              />
              <MetricCard
                title="Active Agents"
                value={String(data.approvedAgents)}
                sub={`${data.totalAgents} registered`}
                icon="users"
                color="#ec4899"
              />
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  scroll: { paddingBottom: 40 },
  banner: {
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 28,
  },
  bannerLeft: {},
  bannerRole: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  bannerName: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 2 },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.65)' },
  bannerLogo: { width: 72, height: 72 },
  center: { paddingVertical: 60, alignItems: 'center' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 20,
    padding: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
  },
  errorText: { flex: 1, fontSize: 13, color: '#ef4444' },
  errorRetry: { fontSize: 13, color: '#ef4444', fontWeight: '700', textDecorationLine: 'underline' },
  revCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 4,
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  revLabel: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 6 },
  revValue: { fontSize: 30, fontWeight: '900', color: '#0a0f1c', marginBottom: 4 },
  revSub: { fontSize: 12, color: '#94a3b8' },
  revIcon: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: '#edfaf4',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
    marginHorizontal: 20,
    marginTop: 24,
    marginBottom: 12,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 20,
  },
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
  cardValue: { fontSize: 26, fontWeight: '900', color: '#0a0f1c', marginBottom: 3 },
  cardTitle: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  cardSub: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
});
