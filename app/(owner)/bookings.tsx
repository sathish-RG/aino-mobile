import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/api/client';

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

const GREEN = '#1e3c6e';
const ORANGE = '#ea580c';
const RED = '#ef4444';

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function InfoItem({ icon, label, value }: { icon: React.ComponentProps<typeof Feather>['name']; label: string; value: string }) {
  return (
    <View style={s.infoItem}>
      <View style={s.infoIconWrap}>
        <Feather name={icon} size={12} color="#94a3b8" />
      </View>
      <View>
        <Text style={s.infoLabel}>{label}</Text>
        <Text style={s.infoValue}>{value}</Text>
      </View>
    </View>
  );
}

function BookingCard({
  booking, onVerify, onReject, loading,
}: {
  booking: Booking; onVerify: () => void; onReject: () => void; loading: boolean;
}) {
  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <View style={s.cardHeaderLeft}>
          <Text style={s.projectName}>{booking.unit.project.project_name}</Text>
          <View style={s.unitPill}>
            <Text style={s.unitPillText}>Unit #{booking.unit.unit_number}</Text>
          </View>
        </View>
        <View style={s.priceWrap}>
          <Text style={s.priceLabel}>VALUE</Text>
          <Text style={s.price}>{formatINR(booking.unit.price)}</Text>
        </View>
      </View>

      <View style={s.divider} />

      <View style={s.infoGrid}>
        <InfoItem icon="user" label="Customer" value={booking.customer_name} />
        <InfoItem icon="phone" label="Phone" value={booking.customer_phone} />
        <InfoItem icon="briefcase" label="Agent" value={booking.agent.name} />
        <InfoItem icon="calendar" label="Booked on" value={formatDate(booking.booking_date)} />
      </View>

      <View style={s.divider} />

      <View style={s.actionRow}>
        <TouchableOpacity
          style={[s.actionBtn, s.rejectBtn, loading && s.btnDisabled]}
          onPress={onReject}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="x" size={15} color="#fff" />
              <Text style={s.actionBtnText}>Reject</Text>
            </>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.actionBtn, s.verifyBtn, loading && s.btnDisabled]}
          onPress={onVerify}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Feather name="check" size={15} color="#fff" />
              <Text style={s.actionBtnText}>Confirm Sale</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function OwnerBookings() {
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data: bookings = [], isLoading, isError, refetch } = useQuery<Booking[]>({
    queryKey: ['owner-bookings'],
    queryFn: () => api.get('/owner/bookings').then((r) => r.data.data),
  });

  const verifyMutation = useMutation({
    mutationFn: ({ id, confirmed }: { id: string; confirmed: boolean }) =>
      api.post(`/owner/bookings/${id}/verify`, { confirmed }),
    onMutate: async ({ id }) => {
      setProcessingId(id);
      await queryClient.cancelQueries({ queryKey: ['owner-bookings'] });
      const prev = queryClient.getQueryData<Booking[]>(['owner-bookings']);
      queryClient.setQueryData<Booking[]>(['owner-bookings'], (old) => old?.filter((b) => b.id !== id));
      return { prev };
    },
    onError: (err: any, _, ctx) => {
      queryClient.setQueryData(['owner-bookings'], ctx?.prev);
      Alert.alert('Error', err.response?.data?.message ?? 'Action failed. Please try again.');
    },
    onSettled: () => {
      setProcessingId(null);
      queryClient.invalidateQueries({ queryKey: ['owner-bookings'] });
      queryClient.invalidateQueries({ queryKey: ['owner-reports'] });
    },
  });

  const handleVerify = (booking: Booking) => {
    Alert.alert(
      'Confirm Sale',
      `Mark Unit #${booking.unit.unit_number} as sold to ${booking.customer_name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Confirm', onPress: () => verifyMutation.mutate({ id: booking.id, confirmed: true }) },
      ],
    );
  };

  const handleReject = (booking: Booking) => {
    Alert.alert(
      'Reject Booking',
      `Cancel this booking and return Unit #${booking.unit.unit_number} to available?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Reject', style: 'destructive', onPress: () => verifyMutation.mutate({ id: booking.id, confirmed: false }) },
      ],
    );
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color={ORANGE} /></View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.centerText}>Could not load bookings</Text>
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
          <Text style={s.headerTitle}>Pending Bookings</Text>
          <Text style={s.headerSub}>Review and confirm each booking</Text>
        </View>
        {bookings.length > 0 && (
          <View style={s.countBadge}>
            <Text style={s.countBadgeText}>{bookings.length}</Text>
          </View>
        )}
      </View>

      <FlatList
        data={bookings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        onRefresh={handleRefresh}
        refreshing={refreshing}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <View style={s.emptyIcon}>
              <Feather name="check-circle" size={36} color={GREEN} />
            </View>
            <Text style={s.emptyTitle}>All caught up!</Text>
            <Text style={s.emptyHint}>No bookings pending your review</Text>
          </View>
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onVerify={() => handleVerify(item)}
            onReject={() => handleReject(item)}
            loading={processingId === item.id}
          />
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centerText: { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: ORANGE },
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
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  countBadge: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center',
  },
  countBadgeText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  list: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 18,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 14,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 14,
  },
  cardHeaderLeft: { flex: 1, marginRight: 12 },
  projectName: { fontSize: 16, fontWeight: '800', color: '#0a0f1c', marginBottom: 6 },
  unitPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10, paddingVertical: 4,
    backgroundColor: '#f1f5f9', borderRadius: 20,
  },
  unitPillText: { fontSize: 12, fontWeight: '700', color: '#64748b' },
  priceWrap: { alignItems: 'flex-end' },
  priceLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.5, marginBottom: 2 },
  price: { fontSize: 16, fontWeight: '800', color: '#0a0f1c' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 14 },
  infoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  infoItem: { width: '46%', flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  infoIconWrap: {
    width: 26, height: 26, borderRadius: 8,
    backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center', marginTop: 1,
  },
  infoLabel: { fontSize: 10, color: '#94a3b8', fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 },
  infoValue: { fontSize: 13, color: '#0a0f1c', fontWeight: '600' },
  actionRow: { flexDirection: 'row', gap: 10 },
  actionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, borderRadius: 14,
  },
  verifyBtn: { backgroundColor: GREEN },
  rejectBtn: { backgroundColor: RED },
  btnDisabled: { opacity: 0.5 },
  actionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyIcon: {
    width: 72, height: 72, borderRadius: 24,
    backgroundColor: '#edfaf4', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 20, fontWeight: '800', color: '#0a0f1c', marginBottom: 6 },
  emptyHint: { fontSize: 14, color: '#94a3b8' },
});
