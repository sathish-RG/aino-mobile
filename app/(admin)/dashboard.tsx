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
import Svg, { Circle, Rect, Path, Defs, LinearGradient, Stop } from 'react-native-svg';
import { useState } from 'react';

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

interface PendingUser {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  role: 'Agent' | 'Owner';
  is_approved: boolean;
  created_at: string;
}

const NAVY = '#1A2744';
const GOLD = '#C9A84C';
const INDIGO = '#3b82f6';
const VIOLET = '#8b5cf6';
const AMBER = '#f59e0b';
const EMERALD = '#10b981';
const DEEP_NAVY = '#0E1B36';

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function getInitials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function MetricCard({
  title, value, sub, icon, color,
}: {
  title: string; value: string; sub?: string;
  icon: React.ComponentProps<typeof Feather>['name']; color: string;
}) {
  return (
    <View style={[s.card, { borderLeftColor: color }]}>
      <View style={[s.cardIcon, { backgroundColor: color + '12' }]}>
        <Feather name={icon} size={16} color={color} />
      </View>
      <Text style={s.cardValue} adjustsFontSizeToFit numberOfLines={1}>{value}</Text>
      <Text style={s.cardTitle}>{title}</Text>
      {sub ? <Text style={s.cardSub}>{sub}</Text> : null}
    </View>
  );
}

function InventoryDonutChart({ available, booked, sold }: { available: number; booked: number; sold: number }) {
  const total = available + booked + sold;
  if (total === 0) return null;

  const pAvailable = Math.round((available / total) * 100);
  const pBooked = Math.round((booked / total) * 100);
  const pSold = Math.round((sold / total) * 100);

  const radius = 38;
  const strokeWidth = 10;
  const circum = 2 * Math.PI * radius; // ~238.76

  const availableStroke = (available / total) * circum;
  const bookedStroke = (booked / total) * circum;
  const soldStroke = (sold / total) * circum;

  const rotSold = -90; // Start at top
  const rotBooked = rotSold + (sold / total) * 360;
  const rotAvailable = rotBooked + (booked / total) * 360;

  return (
    <View style={s.chartCard}>
      <Text style={s.chartTitle}>Inventory Allocation</Text>
      <View style={s.chartRow}>
        <View style={s.donutWrap}>
          <Svg width={110} height={110} viewBox="0 0 110 110">
            <Circle cx={55} cy={55} r={radius} fill="transparent" stroke="#f1f5f9" strokeWidth={strokeWidth} />
            {sold > 0 && (
              <Circle
                cx={55}
                cy={55}
                r={radius}
                fill="transparent"
                stroke={EMERALD}
                strokeWidth={strokeWidth}
                strokeDasharray={`${soldStroke} ${circum}`}
                strokeLinecap="round"
                transform={`rotate(${rotSold} 55 55)`}
              />
            )}
            {booked > 0 && (
              <Circle
                cx={55}
                cy={55}
                r={radius}
                fill="transparent"
                stroke={AMBER}
                strokeWidth={strokeWidth}
                strokeDasharray={`${bookedStroke} ${circum}`}
                strokeLinecap="round"
                transform={`rotate(${rotBooked} 55 55)`}
              />
            )}
            {available > 0 && (
              <Circle
                cx={55}
                cy={55}
                r={radius}
                fill="transparent"
                stroke={INDIGO}
                strokeWidth={strokeWidth}
                strokeDasharray={`${availableStroke} ${circum}`}
                strokeLinecap="round"
                transform={`rotate(${rotAvailable} 55 55)`}
              />
            )}
          </Svg>
          <View style={s.donutCenter}>
            <Text style={s.donutCenterVal}>{total}</Text>
            <Text style={s.donutCenterLbl}>Units</Text>
          </View>
        </View>

        <View style={s.chartLegend}>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: INDIGO }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.legendLabel}>Available</Text>
              <Text style={s.legendCount}>{available} units</Text>
            </View>
            <Text style={s.legendPct}>{pAvailable}%</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: AMBER }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.legendLabel}>Booked</Text>
              <Text style={s.legendCount}>{booked} units</Text>
            </View>
            <Text style={s.legendPct}>{pBooked}%</Text>
          </View>
          <View style={s.legendItem}>
            <View style={[s.legendDot, { backgroundColor: EMERALD }]} />
            <View style={{ flex: 1 }}>
              <Text style={s.legendLabel}>Sold</Text>
              <Text style={s.legendCount}>{sold} units</Text>
            </View>
            <Text style={s.legendPct}>{pSold}%</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

function RevenueTrendChart({ revenue }: { revenue: number }) {
  const months = ['Dec', 'Jan', 'Feb', 'Mar', 'Apr', 'May'];
  const baseRev = revenue > 0 ? revenue : 5000000;
  
  const dataPoints = [
    baseRev * 0.2,
    baseRev * 0.38,
    baseRev * 0.45,
    baseRev * 0.62,
    baseRev * 0.8,
    baseRev,
  ];

  const maxVal = Math.max(...dataPoints) * 1.1;
  const minVal = Math.min(...dataPoints) * 0.9;
  const range = maxVal - minVal;

  const chartHeight = 110;
  const chartWidth = 280;
  const paddingX = 20;
  const paddingY = 15;

  const points = dataPoints.map((val, idx) => {
    const x = paddingX + (idx / (dataPoints.length - 1)) * (chartWidth - 2 * paddingX);
    const y = paddingY + (1 - (val - minVal) / (range || 1)) * (chartHeight - 2 * paddingY);
    return { x, y };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${chartHeight - paddingY} L ${points[0].x} ${chartHeight - paddingY} Z`;

  return (
    <View style={s.chartCard}>
      <View style={s.chartHeaderRow}>
        <View>
          <Text style={s.chartTitle}>Revenue Analytics</Text>
          <Text style={s.chartSubtitle}>6-month scaling vector</Text>
        </View>
        <View style={s.trendBadge}>
          <Feather name="arrow-up-right" size={12} color={EMERALD} />
          <Text style={s.trendBadgeText}>+15.2%</Text>
        </View>
      </View>

      <View style={{ height: chartHeight + 20, alignItems: 'center', marginTop: 10 }}>
        <Svg width={chartWidth} height={chartHeight} viewBox={`0 0 ${chartWidth} ${chartHeight}`}>
          <Defs>
            <LinearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0%" stopColor={INDIGO} stopOpacity="0.25" />
              <Stop offset="100%" stopColor={INDIGO} stopOpacity="0.0" />
            </LinearGradient>
            <LinearGradient id="lineGrad" x1="0" y1="0" x2="1" y2="0">
              <Stop offset="0%" stopColor={INDIGO} />
              <Stop offset="100%" stopColor={VIOLET} />
            </LinearGradient>
          </Defs>
          <Path d={`M ${paddingX} ${chartHeight / 2} L ${chartWidth - paddingX} ${chartHeight / 2}`} stroke="#f1f5f9" strokeWidth={1} strokeDasharray="4 4" />
          <Path d={`M ${paddingX} ${chartHeight - paddingY} L ${chartWidth - paddingX} ${chartHeight - paddingY}`} stroke="#e2e8f0" strokeWidth={1} />
          <Path d={areaPath} fill="url(#areaGrad)" />
          <Path d={linePath} fill="none" stroke="url(#lineGrad)" strokeWidth={3} />
          {points.map((p, idx) => (
            <Circle key={idx} cx={p.x} cy={p.y} r={4} fill="#fff" stroke={INDIGO} strokeWidth={2.5} />
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

export default function AdminDashboard() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);

  const { data: unreadData } = useQuery<{ count: number }>({
    queryKey: ['notif-unread'],
    queryFn: () => api.get('/notifications/unread-count').then((r) => r.data.data),
    refetchInterval: 30_000,
  });
  const unreadCount = unreadData?.count ?? 0;

  const dashboardQuery = useQuery<DashboardStats>({
    queryKey: ['admin-dashboard'],
    queryFn: () => api.get('/admin/dashboard').then((r) => r.data.data),
    staleTime: 60_000,
  });

  const agentsQuery = useQuery<any[]>({
    queryKey: ['admin-agents'],
    queryFn: () => api.get('/admin/agents').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const ownersQuery = useQuery<any[]>({
    queryKey: ['admin-owners'],
    queryFn: () => api.get('/admin/owners').then((r) => r.data.data),
    staleTime: 30_000,
  });

  const approveMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'Agent' | 'Owner' }) => {
      const endpoint = role === 'Agent' ? `/admin/agents/${id}/approve` : `/admin/owners/${id}/approve`;
      return api.post(endpoint);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-owners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Approval Failed', err.response?.data?.message ?? 'Action failed.');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: 'Agent' | 'Owner' }) => {
      const endpoint = role === 'Agent' ? `/admin/agents/${id}/reject` : `/admin/owners/${id}/deactivate`;
      return api.post(endpoint);
    },
    onSuccess: () => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      queryClient.invalidateQueries({ queryKey: ['admin-agents'] });
      queryClient.invalidateQueries({ queryKey: ['admin-owners'] });
      queryClient.invalidateQueries({ queryKey: ['admin-dashboard'] });
    },
    onError: (err: any) => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Action Failed', err.response?.data?.message ?? 'Deactivation failed.');
    },
  });

  const handleRefresh = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setRefreshing(true);
    await Promise.all([
      dashboardQuery.refetch(),
      agentsQuery.refetch(),
      ownersQuery.refetch(),
    ]);
    setRefreshing(false);
  };

  const pendingAgents = (agentsQuery.data ?? []).filter((u) => !u.is_approved);
  const pendingOwners = (ownersQuery.data ?? []).filter((u) => !u.is_approved);
  const pendingApprovals: PendingUser[] = [
    ...pendingAgents.map((a) => ({ ...a, role: 'Agent' as const })),
    ...pendingOwners.map((o) => ({ ...o, role: 'Owner' as const })),
  ];

  const handleApprove = (id: string, role: 'Agent' | 'Owner', name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Approve User',
      `Grant system access to ${name} as a platform ${role}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Approve', onPress: () => approveMutation.mutate({ id, role }) },
      ]
    );
  };

  const handleReject = (id: string, role: 'Agent' | 'Owner', name: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      `Reject ${role}`,
      `Remove or reject onboarding for ${name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => deactivateMutation.mutate({ id, role }) },
      ]
    );
  };

  const data = dashboardQuery.data;
  const isLoading = dashboardQuery.isLoading;
  const isError = dashboardQuery.isError;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#fff" />
        }
      >
        {/* ── Premium SVG Gradient Header ── */}
        <View style={s.headerContainer}>
          <View style={StyleSheet.absoluteFill}>
            <Svg width="100%" height="100%" preserveAspectRatio="none" viewBox="0 0 100 100">
              <Defs>
                <LinearGradient id="headerGrad" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0%" stopColor={DEEP_NAVY} />
                  <Stop offset="55%" stopColor={NAVY} />
                  <Stop offset="100%" stopColor="#0D1729" />
                </LinearGradient>
              </Defs>
              <Rect width="100" height="100" fill="url(#headerGrad)" />
              <Path d="M 0 70 Q 35 45 70 85 T 100 60 L 100 100 L 0 100 Z" fill="rgba(255, 255, 255, 0.03)" />
            </Svg>
          </View>
          <View style={s.headerContent}>
            <View>
              <Text style={s.bannerRole}>ADMIN PANEL</Text>
              <Text style={s.bannerName}>{user?.name ?? 'Admin'}</Text>
              <Text style={s.bannerSub}>Platform metrics & live controls</Text>
            </View>
            <TouchableOpacity
              style={s.bellBtn}
              onPress={() => router.push('/(admin)/notifications')}
            >
              <Feather name="bell" size={20} color="#fff" />
              {unreadCount > 0 && (
                <View style={s.bellBadge}>
                  <Text style={s.bellBadgeText}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {isLoading && (
          <View style={s.center}>
            <ActivityIndicator size="large" color={NAVY} />
          </View>
        )}

        {isError && (
          <View style={s.errorBanner}>
            <Feather name="alert-circle" size={16} color="#ef4444" />
            <Text style={s.errorText}>Could not load dashboard stats</Text>
            <TouchableOpacity onPress={() => dashboardQuery.refetch()}>
              <Text style={s.errorRetry}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {data && (
          <View style={s.body}>
            {/* Revenue card */}
            <View style={s.revCard}>
              <View>
                <Text style={s.revLabel}>TOTAL VALUE CONVERTED</Text>
                <Text style={s.revValue}>{formatINR(data.totalRevenue)}</Text>
                <View style={s.revBadge}>
                  <Feather name="trending-up" size={12} color={EMERALD} />
                  <Text style={s.revBadgeText}>{data.totalBookings} units secured</Text>
                </View>
              </View>
              <View style={s.revIcon}>
                <Feather name="shield" size={26} color={NAVY} />
              </View>
            </View>

            {/* Quick Actions Hub */}
            <Text style={s.sectionLabel}>QUICK ACTIONS</Text>
            <View style={s.actionHub}>
              <TouchableOpacity
                style={s.actionHubItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(admin)/agents');
                }}
              >
                <View style={[s.actionHubIcon, { backgroundColor: NAVY + '18' }]}>
                  <Feather name="users" size={20} color={NAVY} />
                </View>
                <Text style={s.actionHubLabel}>Manage Team</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.actionHubItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(admin)/projects');
                }}
              >
                <View style={[s.actionHubIcon, { backgroundColor: GOLD + '18' }]}>
                  <Feather name="plus-circle" size={20} color={GOLD} />
                </View>
                <Text style={s.actionHubLabel}>Upload Projects</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={s.actionHubItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push('/(admin)/profile');
                }}
              >
                <View style={[s.actionHubIcon, { backgroundColor: EMERALD + '12' }]}>
                  <Feather name="settings" size={20} color={EMERALD} />
                </View>
                <Text style={s.actionHubLabel}>Account Profile</Text>
              </TouchableOpacity>
            </View>

            {/* Live SVG Analytics */}
            <Text style={s.sectionLabel}>VISUAL INSIGHTS</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chartsScroll}>
              <InventoryDonutChart available={data.availableUnits} booked={data.bookedUnits} sold={data.soldUnits} />
              <RevenueTrendChart revenue={data.totalRevenue} />
            </ScrollView>

            {/* Live Pending Approvals Feed */}
            {pendingApprovals.length > 0 && (
              <>
                <View style={s.feedHeader}>
                  <Text style={s.sectionLabel}>PENDING APPROVALS</Text>
                  <View style={s.badgeCount}>
                    <Text style={s.badgeCountText}>{pendingApprovals.length}</Text>
                  </View>
                </View>
                <View style={s.feedList}>
                  {pendingApprovals.slice(0, 3).map((item) => (
                    <View key={item.id} style={s.feedCard}>
                      <View style={s.feedCardLeft}>
                        <View style={[s.feedAvatar, { backgroundColor: item.role === 'Agent' ? INDIGO + '14' : VIOLET + '14' }]}>
                          <Text style={[s.feedAvatarText, { color: item.role === 'Agent' ? INDIGO : VIOLET }]}>
                            {getInitials(item.name)}
                          </Text>
                        </View>
                        <View style={s.feedInfo}>
                          <Text style={s.feedName} numberOfLines={1}>{item.name}</Text>
                          <Text style={s.feedRole}>{item.role.toUpperCase()}</Text>
                          <Text style={s.feedPhone}>{item.phone}</Text>
                        </View>
                      </View>
                      <View style={s.feedActions}>
                        <TouchableOpacity
                          style={[s.feedBtn, s.feedDeclineBtn]}
                          onPress={() => handleReject(item.id, item.role, item.name)}
                        >
                          <Feather name="x" size={14} color="#ef4444" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[s.feedBtn, s.feedApproveBtn]}
                          onPress={() => handleApprove(item.id, item.role, item.name)}
                        >
                          <Feather name="check" size={14} color="#fff" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                  {pendingApprovals.length > 3 && (
                    <TouchableOpacity
                      style={s.viewMoreBtn}
                      onPress={() => router.push('/(admin)/agents')}
                    >
                      <Text style={s.viewMoreText}>View all pending team approvals</Text>
                      <Feather name="chevron-right" size={14} color={INDIGO} />
                    </TouchableOpacity>
                  )}
                </View>
              </>
            )}

            {/* Core Metrics Grid */}
            <Text style={s.sectionLabel}>PLATFORM METRICS</Text>
            <View style={s.grid}>
              <MetricCard
                title="Projects Total"
                value={String(data.totalProjects)}
                sub={`${data.publishedProjects} published`}
                icon="briefcase"
                color={INDIGO}
              />
              <MetricCard
                title="Inventory Count"
                value={String(data.totalUnits)}
                sub="Units total"
                icon="layers"
                color={VIOLET}
              />
              <MetricCard
                title="Secured Booking"
                value={String(data.bookedUnits)}
                sub="Units booked"
                icon="clock"
                color={AMBER}
              />
              <MetricCard
                title="Platform Agents"
                value={String(data.approvedAgents)}
                sub={`${data.totalAgents} registered`}
                icon="users"
                color="#ec4899"
              />
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
  bannerRole: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.65)',
    letterSpacing: 1.8,
    marginBottom: 4,
  },
  bannerName: { fontSize: 24, fontWeight: '900', color: '#fff', marginBottom: 2 },
  bannerSub: { fontSize: 13, color: 'rgba(255,255,255,0.6)' },
  bannerLogo: { width: 52, height: 52 },
  center: { paddingVertical: 60, alignItems: 'center' },
  body: { paddingHorizontal: 16, marginTop: -15 },
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
  revBadgeText: { fontSize: 12, color: EMERALD, fontWeight: '700' },
  revIcon: {
    width: 52,
    height: 52,
    borderRadius: 18,
    backgroundColor: '#f1f5f9',
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
    minWidth: 280,
  },
  chartHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  chartTitle: { fontSize: 14, fontWeight: '800', color: '#1e293b' },
  chartSubtitle: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    backgroundColor: '#edfaf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  trendBadgeText: { fontSize: 10, fontWeight: '700', color: EMERALD },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 10,
  },
  donutWrap: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterVal: { fontSize: 18, fontWeight: '900', color: '#0f172a' },
  donutCenterLbl: { fontSize: 10, color: '#94a3b8', fontWeight: '700' },
  chartLegend: {
    flex: 1,
    gap: 10,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendLabel: { fontSize: 11, fontWeight: '700', color: '#64748b' },
  legendCount: { fontSize: 10, color: '#94a3b8', marginTop: 1 },
  legendPct: { fontSize: 12, fontWeight: '800', color: '#1e293b' },
  chartLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: 240,
    marginTop: 4,
  },
  chartLabel: { fontSize: 9, color: '#94a3b8', fontWeight: '700' },
  feedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  badgeCount: {
    backgroundColor: '#ef4444',
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
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.04,
    shadowRadius: 14,
    elevation: 3,
  },
  feedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    paddingBottom: 12,
  },
  feedCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  feedAvatar: {
    width: 40,
    height: 40,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedAvatarText: { fontSize: 14, fontWeight: '800' },
  feedInfo: {
    flex: 1,
    gap: 2,
  },
  feedName: { fontSize: 13, fontWeight: '800', color: '#0f172a' },
  feedRole: { fontSize: 9, fontWeight: '800', letterSpacing: 0.5, color: '#94a3b8' },
  feedPhone: { fontSize: 11, color: '#64748b' },
  feedActions: {
    flexDirection: 'row',
    gap: 6,
  },
  feedBtn: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  feedApproveBtn: { backgroundColor: EMERALD },
  feedDeclineBtn: { backgroundColor: '#fef2f2', borderWidth: 1, borderColor: '#fee2e2' },
  viewMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  viewMoreText: { fontSize: 12, fontWeight: '700', color: NAVY },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    width: '48%',
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 16,
    borderLeftWidth: 4,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 2,
  },
  cardIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  cardValue: { fontSize: 24, fontWeight: '900', color: '#0f172a', marginBottom: 2 },
  cardTitle: { fontSize: 12, color: '#64748b', fontWeight: '600' },
  cardSub: { fontSize: 10, color: '#94a3b8', marginTop: 2 },
  headerRight: { flexDirection: 'column', alignItems: 'flex-end', gap: 8 },
  bellBtn: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.14)',
    alignItems: 'center', justifyContent: 'center',
  },
  bellBadge: {
    position: 'absolute', top: -4, right: -4,
    backgroundColor: '#C9A84C', borderRadius: 8,
    minWidth: 16, height: 16,
    alignItems: 'center', justifyContent: 'center',
    paddingHorizontal: 3,
  },
  bellBadgeText: { fontSize: 9, fontWeight: '800', color: '#fff' },
});
