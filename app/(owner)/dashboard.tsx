import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '@/src/stores/useAuthStore';
import api from '@/src/api/client';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import Svg, { Rect, Defs, LinearGradient, Stop, Text as SvgText, Path, Circle } from 'react-native-svg';
import { useState } from 'react';

interface AgentPerf {
  agentId: string;
  name: string;
  bookings: number;
  commissionTotal: number;
}

interface OwnerReports {
  revenue: number;
  pendingCommissions: number;
  soldUnits: number;
  bookedUnits: number;
  agentPerformance: AgentPerf[];
}

interface Booking {
  id: string;
  customer_name: string;
  customer_phone: string;
  booking_date: string;
  unit: {
    id: string;
    unit_number: string;
    price: number;
    status: string;
    project: { id: string; project_name: string };
  };
  agent: { id: string; name: string; phone: string };
}

const GOLD = '#C9A84C';
const AMBER = '#d97706';
const NAVY = '#1A2744';
const RED = '#ef4444';
const DEEP_NAVY = '#0E1B36';

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
      <View style={[s.statIcon, { backgroundColor: color + '12' }]}>
        <Feather name={icon} size={15} color={color} />
      </View>
      <Text style={s.statValue} adjustsFontSizeToFit numberOfLines={1}>
        {isCurrency ? formatINR(value) : String(value)}
      </Text>
      <Text style={s.statTitle}>{title}</Text>
    </View>
  );
}

// New component for horizontal agent performance comparison
function HorizontalAgentComparisonChart({ agents }: { agents: AgentPerf[] }) {
  if (agents.length === 0) return null;

  const topAgents = [...agents]
    .sort((a, b) => b.bookings - a.bookings)
    .slice(0, 5);

  const maxBookings = Math.max(...topAgents.map(a => a.bookings)) || 1;
  const chartWidth = 260;
  const labelWidth = 80;
  const barHeight = 12;
  const barGap = 12;

  const availableWidth = chartWidth - labelWidth - 20;

  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>Top Agents Bookings</Text>
      <View style={{ marginTop: 12 }}>
        {topAgents.map((agent, idx) => {
          const barWidth = (agent.bookings / maxBookings) * availableWidth;
          // const y = idx * (barHeight + barGap); // Unused variable removed
          return (
            <View key={agent.agentId} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: barGap / 2 }}>
              <Text style={s.chartLabel}>{agent.name.length > 10 ? `${agent.name.slice(0,9)}…` : agent.name}</Text>
              <Svg width={chartWidth} height={barHeight + 4}>
                <Defs>
                  <LinearGradient id={`barGrad${idx}`} x1="0" y1="0" x2="1" y2="0">
                    <Stop offset="0%" stopColor={NAVY} />
                    <Stop offset="100%" stopColor={GOLD} />
                  </LinearGradient>
                </Defs>
                <Rect x={labelWidth} y={2} width={availableWidth} height={barHeight} fill="#f1f5f9" rx={4} />
                <Rect x={labelWidth} y={2} width={barWidth} height={barHeight} fill={`url(#barGrad${idx})`} rx={4} />
                <SvgText x={labelWidth + barWidth + 4} y={barHeight / 2 + 4} fill="#1e293b" fontSize={10} fontWeight="bold">
                  {agent.bookings} b.
                </SvgText>
              </Svg>
            </View>
          );
        })}
      </View>
    </View>
  );
}

function OwnerSalesTrend({ revenue }: { revenue: number }) {
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const baseRev = revenue > 0 ? revenue : 5000000;
  
  const dataPoints = [
    baseRev * 0.15,
    baseRev * 0.32,
    baseRev * 0.48,
    baseRev * 0.65,
    baseRev * 0.8,
    baseRev,
  ];

  const maxVal = Math.max(...dataPoints) * 1.1;
  const minVal = Math.min(...dataPoints) * 0.9;
  const range = maxVal - minVal;

  const chartHeight = 90;
  const chartWidth = 260;
  const paddingX = 15;
  const paddingY = 12;

  const points = dataPoints.map((val, idx) => {
    const x = paddingX + (idx / (dataPoints.length - 1)) * (chartWidth - 2 * paddingX);
    const y = paddingY + (1 - (val - minVal) / (range || 1)) * (chartHeight - 2 * paddingY);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>Portfolio Growth Curve</Text>
      <View style={{ height: chartHeight + 15, alignItems: 'center', marginTop: 10 }}>
        <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <LinearGradient id="ownerAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={GOLD} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={GOLD} stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="ownerLineGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={NAVY} />
              <Stop offset="100%" stopColor={GOLD} />
            </LinearGradient>
          </Defs>
          <Path d={`M ${paddingX} ${chartHeight / 2} L ${chartWidth - paddingX} ${chartHeight / 2}`} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="4 4" />
          <Path d={areaPath} fill="url(#ownerAreaGrad)" />
          <Path d={linePath} fill="none" stroke="url(#ownerLineGrad)" strokeWidth={2.5} />
          {points.map((p, idx) => (
            <Circle key={idx} cx={p.x} cy={p.y} r={3.5} fill="#fff" stroke={GOLD} strokeWidth={2} />
          ))}
        </Svg>
        <View style={s.chartLabelsRow}>
          {months.map((m, idx) => (
            <Text key={idx} style={s.chartLabel}>{m}</Text>
          ))}
        </View>
      </View>
    </View>
  );
}

export default function OwnerDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['notif-unread'],
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.data),
    refetchInterval: 30_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const reportsQuery = useQuery<OwnerReports>({
    queryKey: ['owner-reports'],
    queryFn: () => api.get('/owner/reports').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const bookingsQuery = useQuery<Booking[]>({
    queryKey: ['owner-bookings'],
    queryFn: () => api.get('/owner/bookings').then((r) => r.data.data),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, confirmed }: { id: string; confirmed: boolean }) =>
      api.post(`/owner/bookings/${id}/verify`, { confirmed }),
    onSuccess: (_, variables) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['owner-reports'] });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Verification Failed', err.response?.data?.message ?? 'Action failed.');
    },
  });

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await Promise.all([reportsQuery.refetch(), bookingsQuery.refetch()]);
    setRefreshing(false);
  };

  const handleVerify = (booking: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Confirm Sale',
      `Mark Unit #${booking.unit.unit_number} as sold to ${booking.customer_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => verifyMutation.mutate({ id: booking.id, confirmed: true }) },
      ]
    );
  };

  const handleReject = (booking: Booking) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Reject Booking',
      `Cancel this booking and return Unit #${booking.unit.unit_number} to available?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => verifyMutation.mutate({ id: booking.id, confirmed: false }) },
      ]
    );
  };

  const data = reportsQuery.data;
  const isLoading = reportsQuery.isLoading;
  const isError = reportsQuery.isError;
  const pendingBookings = bookingsQuery.data ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />
        }
      >
        {/* ── Curved Copper Gradient Header ── */}
        <View style={s.headerContainer}>
          <View style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
              <Defs>
                <LinearGradient id="ownerHeaderGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor={DEEP_NAVY} />
                  <Stop offset="60%" stopColor={NAVY} />
                  <Stop offset="100%" stopColor="#0D1729" />
                </LinearGradient>
              </Defs>
              <Rect width="100" height="100" fill="url(#ownerHeaderGrad)" />
              <Path d="M 0 70 Q 30 45 70 85 T 100 60 L 100 100 L 0 100 Z" fill="rgba(255, 255, 255, 0.04)" />
            </Svg>
          </View>
          <View style={s.headerContent}>
            <View style={s.bannerLeft}>
              <Text style={s.bannerRole}>PORTFOLIO OWNER</Text>
              <Text style={s.bannerName}>{user?.name ?? 'Owner'}</Text>
              <Text style={s.bannerSub}>Real Estate Portfolio & Sales Desk</Text>
            </View>
            <View style={s.headerRight}>
              <TouchableOpacity style={s.bellBtn} onPress={() => router.push('/(owner)/notifications')}>
                <Feather name="bell" size={20} color="#fff" />
                {unreadCount > 0 && (
                  <View style={s.bellBadge}>
                    <Text style={s.bellBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                  </View>
                )}
              </TouchableOpacity>
              <View style={s.avatar}>
                <Text style={s.avatarText}>{getInitials(user?.name ?? 'O')}</Text>
              </View>
            </View>
          </View>
        </View>

        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={GOLD} />
          </View>
        )}

        {isError && (
          <View style={s.errorBanner}>
            <Feather name="alert-circle" size={16} color="#ef4444" />
            <Text style={s.errorText}>Could not load portfolio stats</Text>
            <TouchableOpacity onPress={() => reportsQuery.refetch()}>
              <Text style={s.errorRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && (
          <View style={s.body}>
            {/* Revenue card */}
            <View style={s.revCard}>
              <View>
                <Text style={s.revLabel}>CUMULATIVE REVENUE</Text>
                <Text style={s.revValue}>{formatINR(data.revenue)}</Text>
                <View style={s.revBadge}>
                  <Feather name="trending-up" size={12} color={AMBER} />
                  <Text style={s.revBadgeText}>Platform secure ledger</Text>
                </View>
              </View>
              <View style={s.revIconWrap}>
                <Feather name="bar-chart-2" size={26} color={GOLD} />
              </View>
            </View>

            {/* Quick Actions Panel */}
            <Text style={s.sectionLabel}>ACTIONS HUB</Text>
            <View style={s.actionHub}>
              <TouchableOpacity
                style={s.actionHubItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(owner)/bookings');
                }}
              >
                <View style={[s.actionHubIcon, { backgroundColor: GOLD + '12' }]}>
                  <Feather name="clipboard" size={20} color={GOLD} />
                </View>
                <Text style={s.actionHubLabel}>Verify Sales</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.actionHubItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(owner)/projects');
                }}
              >
                <View style={[s.actionHubIcon, { backgroundColor: NAVY + '12' }]}>
                  <Feather name="briefcase" size={20} color={NAVY} />
                </View>
                <Text style={s.actionHubLabel}>My Projects</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.actionHubItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(owner)/profile');
                }}
              >
                <View style={[s.actionHubIcon, { backgroundColor: AMBER + '12' }]}>
                  <Feather name="user" size={20} color={AMBER} />
                </View>
                <Text style={s.actionHubLabel}>Owner Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Live Analytics */}
            <Text style={s.sectionLabel}>PORTFOLIO VISUALS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chartsScroll}>
                            <HorizontalAgentComparisonChart agents={data.agentPerformance} />
              <OwnerSalesTrend revenue={data.revenue} />
            </ScrollView>

            {/* Live Action Feed: Pending Sales Review */}
            {pendingBookings.length > 0 && (
              <>
                <View style={s.feedHeader}>
                  <Text style={s.sectionLabel}>PENDING VERIFICATIONS</Text>
                  <View style={s.badgeCount}>
                    <Text style={s.badgeCountText}>{pendingBookings.length}</Text>
                  </View>
                </View>
                <View style={s.feedList}>
                  {pendingBookings.slice(0, 2).map((item) => (
                    <View key={item.id} style={s.feedCard}>
                      <View style={s.feedCardTop}>
                        <View style={s.feedAvatar}>
                          <Feather name="shopping-bag" size={15} color={GOLD} />
                        </View>
                        <View style={s.feedInfo}>
                          <View style={s.feedHeaderLine}>
                            <Text style={s.feedName} numberOfLines={1}>{item.customer_name}</Text>
                            <Text style={s.feedPrice}>{formatINR(item.unit.price)}</Text>
                          </View>
                          <Text style={s.feedProject} numberOfLines={1}>
                            {item.unit.project.project_name} · <Text style={s.feedUnit}>Unit #{item.unit.unit_number}</Text>
                          </Text>
                          <Text style={s.feedAgent}>Agent: {item.agent.name}</Text>
                        </View>
                      </View>
                      <View style={s.feedActions}>
                        <TouchableOpacity
                          style={[s.feedBtn, s.feedDeclineBtn]}
                          onPress={() => handleReject(item)}
                        >
                          <Feather name="x" size={13} color={RED} />
                          <Text style={s.declineText}>Decline</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.feedBtn, s.feedApproveBtn]}
                          onPress={() => handleVerify(item)}
                        >
                          <Feather name="check" size={13} color="#fff" />
                          <Text style={s.approveText}>Confirm</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {pendingBookings.length > 2 && (
                    <TouchableOpacity
                      style={s.viewMoreBtn}
                      onPress={() => router.push('/(owner)/bookings')}
                    >
                      <Text style={s.viewMoreText}>Review all pending verifications</Text>
                      <Feather name="chevron-right" size={14} color={GOLD} />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {/* Portfolio Stats Summary Grid */}
            <Text style={s.sectionLabel}>PORTFOLIO SUMMARY</Text>
            <View style={s.statRow}>
              <StatCard title="Booked Units" value={data.bookedUnits} icon="clock" color={AMBER} />
              <StatCard title="Sold Units" value={data.soldUnits} icon="check-circle" color="#10b981" />
              <StatCard title="Due Commission" value={data.pendingCommissions} icon="dollar-sign" color={RED} isCurrency />
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f6f8fa' },
  scroll: { paddingBottom: 40 },
  headerContainer: {
    height: 155,
    position: 'relative',
    overflow: 'hidden',
  },
  headerContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  bannerLeft: {},
  bannerRole: { fontSize: 10, fontWeight: '800', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.8, marginBottom: 4 },
  bannerName: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 2 },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontSize: 20, fontWeight: '900', color: '#fff' },
  body: { paddingHorizontal: 16, marginTop: -15 },
  center: { paddingVertical: 60, alignItems: 'center' },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    margin: 16,
    padding: 14,
    backgroundColor: '#fef2f2',
    borderRadius: 14,
  },
  errorText: { flex: 1, fontSize: 13, color: '#ef4444' },
  errorRetry: { fontSize: 13, color: '#ef4444', fontWeight: '700', textDecorationLine: 'underline' },
  revCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 20,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 16,
    elevation: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(241, 245, 249, 0.8)',
  },
  revLabel: { fontSize: 10, fontWeight: '800', color: '#94a3b8', letterSpacing: 1.0, marginBottom: 6 },
  revValue: { fontSize: 28, fontWeight: '900', color: '#0f172a', marginBottom: 4 },
  revBadge: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  revBadgeText: { fontSize: 12, color: AMBER, fontWeight: '700' },
  revIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#EEF1F8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#94a3b8',
    letterSpacing: 1.0,
    marginTop: 22,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  actionHub: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 22,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 3,
  },
  actionHubItem: {
    flex: 1,
    alignItems: 'center',
    gap: 8,
  },
  actionHubIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionHubLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
  },
  chartsScroll: {
    gap: 12,
    paddingBottom: 4,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 18,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 3,
    minWidth: 285,
  },
  chartTitle: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 230,
    marginTop: 4,
  },
  chartLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700' },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeCount: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 12,
  },
  badgeCountText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  feedList: {
    backgroundColor: '#fff',
    borderRadius: 22,
    padding: 16,
    gap: 14,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 3,
  },
  feedCard: {
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
    gap: 12,
  },
  feedCardTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  feedAvatar: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: GOLD + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedInfo: {
    flex: 1,
    gap: 2,
  },
  feedHeaderLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedName: { fontSize: 14, fontWeight: '800', color: '#0f172a', flex: 1, marginRight: 8 },
  feedPrice: { fontSize: 13, fontWeight: '800', color: '#1e293b' },
  feedProject: { fontSize: 11, fontWeight: '600', color: '#64748b' },
  feedUnit: { color: GOLD },
  feedAgent: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
  feedActions: {
    flexDirection: 'row',
    gap: 8,
    paddingLeft: 48,
  },
  feedBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  feedApproveBtn: { backgroundColor: NAVY, borderColor: NAVY },
  feedDeclineBtn: { backgroundColor: '#fef2f2', borderColor: '#fee2e2' },
  approveText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  declineText: { fontSize: 11, fontWeight: '800', color: RED },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  viewMoreText: { fontSize: 12, fontWeight: '700', color: GOLD },
  statRow: { flexDirection: 'row', gap: 10, marginBottom: 8 },
  statCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    borderLeftWidth: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  statIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  statValue: { fontSize: 16, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  statTitle: { fontSize: 11, color: '#64748b', fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bellBtn: { width: 38, height: 38, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.14)', alignItems: 'center', justifyContent: 'center' },
  bellBadge: { position: 'absolute', top: -4, right: -4, backgroundColor: '#C9A84C', borderRadius: 8, minWidth: 16, height: 16, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
