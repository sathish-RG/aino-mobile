import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import * as Haptics from 'expo-haptics';
import api from '@/src/api/client';

const NAVY = '#1A2744';
const GOLD = '#C9A84C';
const EMERALD = '#10b981';
const AMBER = '#f59e0b';
const RED = '#ef4444';

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

type NotifType = {
  icon: React.ComponentProps<typeof Feather>['name'];
  color: string;
};

function getTypeStyle(type: string): NotifType {
  switch (type) {
    case 'booking_new':    return { icon: 'check-circle', color: EMERALD };
    case 'booking_verify': return { icon: 'clock',        color: AMBER };
    case 'booking_sold':   return { icon: 'star',         color: GOLD };
    case 'booking_rejected': return { icon: 'x-circle',  color: RED };
    case 'user_approved':  return { icon: 'user-check',   color: NAVY };
    case 'commission_paid': return { icon: 'dollar-sign', color: GOLD };
    default:               return { icon: 'bell',         color: NAVY };
  }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationsScreen() {
  const queryClient = useQueryClient();

  const { data, isLoading, refetch, isRefetching } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => api.get('/notifications').then((r) => r.data.data),
  });

  const markAllMutation = useMutation({
    mutationFn: () => api.put('/notifications/read-all'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notif-unread'] });
    },
  });

  const markOneMutation = useMutation({
    mutationFn: (id: string) => api.put(`/notifications/${id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['notif-unread'] });
    },
  });

  const notifications = data ?? [];
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  function handleMarkAll() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    markAllMutation.mutate();
  }

  function handleTap(n: Notification) {
    if (!n.is_read) {
      markOneMutation.mutate(n.id);
    }
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity style={s.backBtn} onPress={() => router.back()}>
          <Feather name="arrow-left" size={20} color="#fff" />
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={s.unreadBadge}>
              <Text style={s.unreadBadgeText}>{unreadCount}</Text>
            </View>
          )}
        </View>
        {unreadCount > 0 ? (
          <TouchableOpacity style={s.markAllBtn} onPress={handleMarkAll} disabled={markAllMutation.isPending}>
            <Text style={s.markAllText}>Mark all read</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 90 }} />
        )}
      </View>

      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={NAVY} />
        </View>
      ) : notifications.length === 0 ? (
        <View style={s.center}>
          <View style={s.emptyIcon}>
            <Feather name="bell-off" size={32} color="#94a3b8" />
          </View>
          <Text style={s.emptyTitle}>No notifications yet</Text>
          <Text style={s.emptyBody}>You'll see booking updates and alerts here.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.id}
          contentContainerStyle={s.list}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={NAVY} />
          }
          renderItem={({ item }) => {
            const ts = getTypeStyle(item.type);
            return (
              <TouchableOpacity
                style={[s.card, !item.is_read && s.cardUnread]}
                onPress={() => handleTap(item)}
                activeOpacity={0.75}
              >
                <View style={[s.iconWrap, { backgroundColor: ts.color + '15' }]}>
                  <Feather name={ts.icon} size={18} color={ts.color} />
                </View>
                <View style={s.cardBody}>
                  <Text style={[s.cardTitle, !item.is_read && s.cardTitleUnread]}>
                    {item.title}
                  </Text>
                  <Text style={s.cardText}>{item.body}</Text>
                  <Text style={s.cardTime}>{timeAgo(item.created_at)}</Text>
                </View>
                {!item.is_read && <View style={s.dot} />}
              </TouchableOpacity>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f3f4f6' },
  header: {
    backgroundColor: NAVY,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    paddingBottom: 18,
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  unreadBadge: {
    backgroundColor: GOLD,
    borderRadius: 10,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  unreadBadgeText: { fontSize: 11, fontWeight: '800', color: '#fff' },
  markAllBtn: {
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  markAllText: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.85)' },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingBottom: 60,
  },
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#334155' },
  emptyBody: { fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 240 },
  list: { padding: 14, gap: 10 },
  card: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 14,
    gap: 12,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardUnread: {
    borderLeftWidth: 3,
    borderLeftColor: GOLD,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  cardBody: { flex: 1, gap: 3 },
  cardTitle: { fontSize: 13, fontWeight: '600', color: '#475569' },
  cardTitleUnread: { fontWeight: '800', color: '#0f172a' },
  cardText: { fontSize: 13, color: '#64748b', lineHeight: 18 },
  cardTime: { fontSize: 11, color: '#94a3b8', fontWeight: '600', marginTop: 2 },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: GOLD,
    marginTop: 4,
    flexShrink: 0,
  },
});
