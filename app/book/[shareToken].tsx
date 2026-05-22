import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/api/client';

// ─── Types ───────────────────────────────────────────────────────────────────

interface PublicProject {
  name: string;
  type: string;
  location: string;
  reraNumber: string | null;
  layoutImageUrl: string | null;
}

interface PublicUnit {
  id: string;
  unit_number: string;
  sq_ft: number;
  price: number;
  facing: string | null;
  status: 'Available' | 'Booked' | 'Sold';
}

interface PageData {
  agentId: string;
  project: PublicProject;
  units: PublicUnit[];
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);

const STATUS_COLOR: Record<PublicUnit['status'], string> = {
  Available: '#16a34a',
  Booked: '#f59e0b',
  Sold: '#94a3b8',
};

const STATUS_BG: Record<PublicUnit['status'], string> = {
  Available: '#f0fdf4',
  Booked: '#fffbeb',
  Sold: '#f8fafc',
};

// ─── Unit card ────────────────────────────────────────────────────────────────

function UnitCard({
  unit,
  onBook,
}: {
  unit: PublicUnit;
  onBook: (unit: PublicUnit) => void;
}) {
  const isAvailable = unit.status === 'Available';
  const color = STATUS_COLOR[unit.status];
  const bg = STATUS_BG[unit.status];

  return (
    <TouchableOpacity
      style={[s.unitCard, { borderColor: isAvailable ? color : '#e2e8f0' }]}
      onPress={() => isAvailable && onBook(unit)}
      disabled={!isAvailable}
      activeOpacity={0.75}
    >
      <View style={[s.unitHeader, { backgroundColor: bg }]}>
        <Text style={[s.unitNumber, { color: isAvailable ? '#000' : '#94a3b8' }]}>
          #{unit.unit_number}
        </Text>
        <View style={[s.statusDot, { backgroundColor: color }]} />
      </View>

      <View style={s.unitBody}>
        <Text style={[s.unitPrice, !isAvailable && s.muted]}>{formatINR(unit.price)}</Text>
        <Text style={s.unitSqft}>{unit.sq_ft.toLocaleString()} sq.ft</Text>
        {unit.facing && <Text style={s.unitFacing}>{unit.facing} facing</Text>}
        <View style={[s.statusBadge, { backgroundColor: bg }]}>
          <Text style={[s.statusText, { color }]}>{unit.status}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Success screen ───────────────────────────────────────────────────────────

function SuccessScreen({ unit, project }: { unit: PublicUnit; project: PublicProject }) {
  return (
    <View style={s.successContainer}>
      <View style={s.successIcon}>
        <Feather name="check" size={40} color="#fff" />
      </View>
      <Text style={s.successTitle}>Booking Confirmed!</Text>
      <Text style={s.successSub}>
        Unit #{unit.unit_number} at {project.name}
      </Text>
      <Text style={s.successNote}>
        Our team will contact you shortly to complete the process.
      </Text>
      <View style={s.successCard}>
        <Row label="Project" value={project.name} />
        <Row label="Unit" value={`#${unit.unit_number}`} />
        <Row label="Size" value={`${unit.sq_ft.toLocaleString()} sq.ft`} />
        <Row label="Price" value={formatINR(unit.price)} />
      </View>
    </View>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={s.row}>
      <Text style={s.rowLabel}>{label}</Text>
      <Text style={s.rowValue}>{value}</Text>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function BookScreen() {
  const { shareToken } = useLocalSearchParams<{ shareToken: string }>();
  const insets = useSafeAreaInsets();

  const [selectedUnit, setSelectedUnit] = useState<PublicUnit | null>(null);
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [booking, setBooking] = useState(false);
  const [bookedUnit, setBookedUnit] = useState<PublicUnit | null>(null);

  const { data, isLoading, isError } = useQuery<PageData>({
    queryKey: ['public-lead', shareToken],
    queryFn: async () => {
      const [trackRes, publicRes] = await Promise.all([
        api.post(`/leads/track/${shareToken}`),
        api.get(`/leads/public/${shareToken}`),
      ]);
      const { agentId } = trackRes.data.data as { agentId: string };
      const { project, units } = publicRes.data.data as {
        project: PublicProject;
        units: PublicUnit[];
      };
      return { agentId, project, units };
    },
    staleTime: Infinity,
    retry: 1,
  });

  const handleBookingSubmit = async () => {
    if (!selectedUnit || !data) return;

    const name = customerName.trim();
    const digits = customerPhone.trim();

    if (!name) return Alert.alert('Required', 'Please enter your name.');
    if (!digits) return Alert.alert('Required', 'Please enter your phone number.');

    try {
      setBooking(true);
      await api.post('/bookings', {
        unitId: selectedUnit.id,
        agentId: data.agentId,
        customerName: name,
        customerPhone: '+91' + digits,
        shareToken,
      });
      setBookedUnit(selectedUnit);
      setSelectedUnit(null);
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Booking failed. Please try again.';
      Alert.alert('Booking failed', msg);
    } finally {
      setBooking(false);
    }
  };

  // ── Loading ──
  if (isLoading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <ActivityIndicator size="large" color="#1e3c6e" />
          <Text style={s.loadingText}>Loading project details…</Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Error / invalid token ──
  if (isError || !data) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.center}>
          <Feather name="alert-circle" size={48} color="#cbd5e1" />
          <Text style={s.errTitle}>Link not found</Text>
          <Text style={s.errSub}>
            This link may be invalid or expired. Please contact your agent.
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  // ── Success after booking ──
  if (bookedUnit) {
    return (
      <SafeAreaView style={s.safe}>
        <ScrollView contentContainerStyle={s.successScroll}>
          <SuccessScreen unit={bookedUnit} project={data.project} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  const { project, units } = data;
  const available = units.filter((u) => u.status === 'Available').length;

  return (
    <SafeAreaView style={s.safe}>
      {/* ── Project header ── */}
      <View style={s.projectHeader}>
        <Text style={s.brandLabel}>AINO</Text>
        <Text style={s.projectType}>{project.type}</Text>
        <Text style={s.projectName}>{project.name}</Text>
        <View style={s.projectMeta}>
          <View style={s.metaItem}>
            <Feather name="map-pin" size={13} color="#8a95a5" />
            <Text style={s.metaText}>{project.location}</Text>
          </View>
          {project.reraNumber && (
            <View style={s.metaItem}>
              <Feather name="shield" size={13} color="#8a95a5" />
              <Text style={s.metaText}>RERA: {project.reraNumber}</Text>
            </View>
          )}
        </View>
      </View>

      {/* ── Unit availability bar ── */}
      <View style={s.availBar}>
        <Text style={s.availText}>
          <Text style={s.availCount}>{available}</Text> unit{available !== 1 ? 's' : ''} available
        </Text>
        <View style={s.legend}>
          {(['Available', 'Booked', 'Sold'] as const).map((st) => (
            <View key={st} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: STATUS_COLOR[st] }]} />
              <Text style={s.legendText}>{st}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* ── Unit grid ── */}
      <FlatList
        data={units}
        keyExtractor={(u) => u.id}
        numColumns={2}
        columnWrapperStyle={s.columnWrapper}
        contentContainerStyle={s.unitList}
        renderItem={({ item }) => (
          <UnitCard unit={item} onBook={setSelectedUnit} />
        )}
        ListEmptyComponent={
          <View style={s.center}>
            <Text style={s.errSub}>No units listed for this project yet.</Text>
          </View>
        }
      />

      {/* ── Booking form modal ── */}
      <Modal
        visible={selectedUnit !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedUnit(null)}
      >
        <View style={s.modalOuter}>
          <Pressable style={s.backdrop} onPress={() => !booking && setSelectedUnit(null)} />
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <View style={[s.formSheet, { paddingBottom: insets.bottom + 24 }]}>
              <View style={s.handle} />

              <Text style={s.formTitle}>
                Book Unit #{selectedUnit?.unit_number}
              </Text>
              <Text style={s.formSub}>
                {formatINR(selectedUnit?.price ?? 0)} · {selectedUnit?.sq_ft} sq.ft
              </Text>

              <Text style={s.fieldLabel}>YOUR NAME</Text>
              <View style={s.fieldRow}>
                <Feather name="user" size={16} color="#a0aabf" style={s.fieldIcon} />
                <TextInput
                  style={s.fieldInput}
                  placeholder="Full name"
                  placeholderTextColor="#a0aabf"
                  value={customerName}
                  onChangeText={setCustomerName}
                  autoFocus
                  editable={!booking}
                />
              </View>

              <Text style={s.fieldLabel}>PHONE NUMBER</Text>
              <View style={s.fieldRow}>
                <Feather name="phone" size={16} color="#a0aabf" style={s.fieldIcon} />
                <Text style={s.dialCode}>+91</Text>
                <View style={s.dialDiv} />
                <TextInput
                  style={s.fieldInput}
                  placeholder="XXXXX XXXXX"
                  placeholderTextColor="#a0aabf"
                  keyboardType="phone-pad"
                  value={customerPhone}
                  onChangeText={(v) => setCustomerPhone(v.replace(/\D/g, '').slice(0, 10))}
                  editable={!booking}
                />
              </View>

              <TouchableOpacity
                style={[s.submitBtn, booking && s.submitBtnDisabled]}
                onPress={handleBookingSubmit}
                disabled={booking}
                activeOpacity={0.85}
              >
                {booking ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={s.submitBtnText}>Confirm Booking</Text>
                    <Feather name="check" size={18} color="#fff" />
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={s.cancelBtn}
                onPress={() => setSelectedUnit(null)}
                disabled={booking}
              >
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const GREEN = '#1e3c6e';

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f8f9fb' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  loadingText: { fontSize: 14, color: '#8a95a5', marginTop: 12 },
  errTitle: { fontSize: 20, fontWeight: '700', color: '#000', marginTop: 16, marginBottom: 8 },
  errSub: { fontSize: 14, color: '#8a95a5', textAlign: 'center', lineHeight: 20 },
  // Project header
  projectHeader: {
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  brandLabel: { fontSize: 11, fontWeight: '900', color: GREEN, letterSpacing: 2, marginBottom: 6 },
  projectType: { fontSize: 12, color: '#8a95a5', fontWeight: '600', marginBottom: 4, textTransform: 'uppercase' },
  projectName: { fontSize: 22, fontWeight: '800', color: '#000', marginBottom: 10 },
  projectMeta: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 12, color: '#5b6475' },
  // Availability bar
  availBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  availText: { fontSize: 13, color: '#5b6475' },
  availCount: { fontWeight: '800', color: GREEN },
  legend: { flexDirection: 'row', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendText: { fontSize: 10, color: '#8a95a5', fontWeight: '600' },
  // Unit grid
  unitList: { padding: 12, paddingBottom: 40 },
  columnWrapper: { gap: 10, marginBottom: 10 },
  unitCard: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1.5,
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  unitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  unitNumber: { fontSize: 14, fontWeight: '800' },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  unitBody: { padding: 12 },
  unitPrice: { fontSize: 14, fontWeight: '700', color: '#000', marginBottom: 2 },
  muted: { color: '#94a3b8' },
  unitSqft: { fontSize: 11, color: '#8a95a5', marginBottom: 2 },
  unitFacing: { fontSize: 11, color: '#8a95a5', marginBottom: 8 },
  statusBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusText: { fontSize: 10, fontWeight: '700' },
  // Booking modal
  modalOuter: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  formSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 24 },
  formTitle: { fontSize: 20, fontWeight: '800', color: '#000', marginBottom: 2 },
  formSub: { fontSize: 13, color: '#8a95a5', marginBottom: 24 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#8a95a5', letterSpacing: 0.5, marginBottom: 8 },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 14,
    marginBottom: 20,
    backgroundColor: '#fafafa',
  },
  fieldIcon: { marginRight: 10 },
  dialCode: { paddingHorizontal: 10, fontSize: 15, fontWeight: '700', color: '#0a0f1c' },
  dialDiv: { width: 1, height: 28, backgroundColor: '#e2e8f0' },
  fieldInput: { flex: 1, fontSize: 15, color: '#000' },
  submitBtn: {
    backgroundColor: GREEN,
    height: 56,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 12,
  },
  submitBtnDisabled: { opacity: 0.55 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cancelBtn: { alignItems: 'center', paddingVertical: 10 },
  cancelBtnText: { color: '#8a95a5', fontSize: 14, fontWeight: '600' },
  // Success
  successScroll: { flexGrow: 1, padding: 24, justifyContent: 'center', alignItems: 'center' },
  successContainer: { alignItems: 'center', width: '100%' },
  successIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  successTitle: { fontSize: 26, fontWeight: '800', color: '#000', marginBottom: 6 },
  successSub: { fontSize: 15, color: '#5b6475', textAlign: 'center', marginBottom: 8 },
  successNote: {
    fontSize: 13,
    color: '#8a95a5',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    maxWidth: 280,
  },
  successCard: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  rowLabel: { fontSize: 13, color: '#8a95a5' },
  rowValue: { fontSize: 13, fontWeight: '700', color: '#000' },
});
