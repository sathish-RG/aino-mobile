import { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Switch,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/src/api/client';
import BulkUploadModal from '@/components/BulkUploadModal';
import * as DocumentPicker from 'expo-document-picker';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Owner { id: string; name: string; phone: string }
interface Project {
  id: string; project_name: string; project_type: string; location: string;
  is_published: boolean; rera_number: string | null; created_at: string;
  owner: Owner | null; _count?: { units: number };
}
type UnitStatus = 'Available' | 'Booked' | 'Sold';
interface Unit {
  id: string; unit_number: string; sq_ft: number; price: number;
  facing: string | null; status: UnitStatus;
}
interface ProjectDoc {
  name: string; url: string; type: 'pdf' | 'image'; uploadedAt: string;
}
interface ProjectDetail extends Project { units: Unit[]; documents: ProjectDoc[] }

interface CreateForm {
  project_name: string; project_type: string; location: string; rera_number: string; owner_id: string;
  block_phase: string; approval_authority: string; approval_number: string; approval_type: string;
}

interface AddUnitForm {
  unit_number: string; sq_ft: string; price: string; plot_type: string;
  length: string; width: string; dimension_format: string; rate_per_sqft: string;
  facing: string; corner_plot: boolean; road_width: string; road_type: string; plot_shape: string;
  booking_amount: string; commission_percentage: string; registration_ready: boolean; plot_color_status: string;
  water: boolean; electricity: boolean; drainage: boolean; street_lights: boolean;
  compound_wall: boolean; park: boolean; clubhouse: boolean; security: boolean;
  landmark: string; nearby_schools: string; nearby_hospitals: string;
  nearby_transport: string; distance_main_road: string; booking_notes: string;
}

type ScreenView = 'list' | 'detail' | 'create' | 'add-unit';

// ─── Constants ────────────────────────────────────────────────────────────────

const GREEN = '#1e3c6e';
const FACING_OPTIONS = ['East', 'West', 'North', 'South', 'NE', 'NW', 'SE', 'SW'];
const ROAD_TYPES = ['Tar', 'Cement', 'WBM', 'Gravel', 'Mud'];
const DIM_FORMATS = ['Feet', 'Meters', 'Yards'];
const PLOT_COLORS = ['Green', 'Orange', 'Red', 'Blue', 'Yellow'];
const PLOT_TYPES = ['Residential', 'Commercial', 'Industrial', 'Agricultural', 'Mixed Use'];

const AMENITIES: { key: keyof AddUnitForm; label: string; icon: React.ComponentProps<typeof Feather>['name'] }[] = [
  { key: 'water', label: 'Water', icon: 'droplet' },
  { key: 'electricity', label: 'Electricity', icon: 'zap' },
  { key: 'drainage', label: 'Drainage', icon: 'wind' },
  { key: 'street_lights', label: 'Street Lights', icon: 'sun' },
  { key: 'compound_wall', label: 'Compound Wall', icon: 'square' },
  { key: 'park', label: 'Park', icon: 'triangle' },
  { key: 'clubhouse', label: 'Clubhouse', icon: 'home' },
  { key: 'security', label: 'Security', icon: 'shield' },
];

const INITIAL_UNIT_FORM: AddUnitForm = {
  unit_number: '', sq_ft: '', price: '', plot_type: '',
  length: '', width: '', dimension_format: 'Feet', rate_per_sqft: '',
  facing: '', corner_plot: false, road_width: '', road_type: '', plot_shape: '',
  booking_amount: '', commission_percentage: '', registration_ready: false, plot_color_status: '',
  water: false, electricity: false, drainage: false, street_lights: false,
  compound_wall: false, park: false, clubhouse: false, security: false,
  landmark: '', nearby_schools: '', nearby_hospitals: '',
  nearby_transport: '', distance_main_road: '', booking_notes: '',
};

const STATUS_COLOR: Record<UnitStatus, string> = {
  Available: '#16a34a', Booked: '#f59e0b', Sold: '#94a3b8',
};
const STATUS_BG: Record<UnitStatus, string> = {
  Available: '#f0fdf4', Booked: '#fffbeb', Sold: '#f8fafc',
};

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

// ─── Reusable form components ─────────────────────────────────────────────────

function SectionHeader({
  title, isOpen, onToggle, hint,
}: { title: string; isOpen: boolean; onToggle: () => void; hint?: string }) {
  return (
    <TouchableOpacity style={f.sectionHeader} onPress={onToggle} activeOpacity={0.7}>
      <View style={f.sectionHeaderLeft}>
        <Text style={f.sectionTitle}>{title}</Text>
        {hint && !isOpen && <Text style={f.sectionHint}>{hint}</Text>}
      </View>
      <View style={[f.sectionChevron, isOpen && f.sectionChevronOpen]}>
        <Feather name="chevron-down" size={16} color={isOpen ? GREEN : '#94a3b8'} />
      </View>
    </TouchableOpacity>
  );
}

function FormField({
  label, value, onChangeText, placeholder, keyboardType, multiline, optional,
}: {
  label: string; value: string; onChangeText: (v: string) => void;
  placeholder: string; keyboardType?: any; multiline?: boolean; optional?: boolean;
}) {
  return (
    <View style={f.fieldGroup}>
      <Text style={f.fieldLabel}>
        {label}{optional ? <Text style={f.optional}> (optional)</Text> : null}
      </Text>
      <TextInput
        style={[f.textInput, multiline && f.textAreaInput]}
        placeholder={placeholder}
        placeholderTextColor="#94a3b8"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? 'default'}
        multiline={multiline}
        numberOfLines={multiline ? 3 : 1}
      />
    </View>
  );
}

function ChipSelector({
  options, selected, onSelect,
}: { options: string[]; selected: string; onSelect: (v: string) => void }) {
  return (
    <View style={f.chipRow}>
      {options.map((opt) => {
        const active = selected === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[f.chip, active && f.chipActive]}
            onPress={() => onSelect(active ? '' : opt)}
            activeOpacity={0.7}
          >
            {active && <Feather name="check" size={11} color={GREEN} />}
            <Text style={[f.chipText, active && f.chipTextActive]}>{opt}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function AmenityChip({
  label, icon, value, onToggle,
}: { label: string; icon: React.ComponentProps<typeof Feather>['name']; value: boolean; onToggle: () => void }) {
  return (
    <TouchableOpacity
      style={[f.amenityChip, value && f.amenityChipActive]}
      onPress={onToggle}
      activeOpacity={0.75}
    >
      <Feather name={icon} size={14} color={value ? GREEN : '#94a3b8'} />
      <Text style={[f.amenityText, value && f.amenityTextActive]}>{label}</Text>
      {value && <View style={f.amenityDot} />}
    </TouchableOpacity>
  );
}

function ToggleRow({ label, value, onToggle }: { label: string; value: boolean; onToggle: () => void }) {
  return (
    <View style={f.toggleRow}>
      <Text style={f.toggleLabel}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: '#e2e8f0', true: GREEN + '55' }}
        thumbColor={value ? GREEN : '#f1f5f9'}
      />
    </View>
  );
}

// ─── Build unit attributes payload ───────────────────────────────────────────

function buildUnitAttributes(f: AddUnitForm): Record<string, unknown> | undefined {
  const a: Record<string, unknown> = {};
  if (f.plot_type) a.plotType = f.plot_type;
  if (f.length) a.length = Number(f.length);
  if (f.width) a.width = Number(f.width);
  if (f.dimension_format !== 'Feet') a.dimensionFormat = f.dimension_format;
  if (f.rate_per_sqft) a.ratePerSqft = Number(f.rate_per_sqft);
  if (f.booking_amount) a.bookingAmount = Number(f.booking_amount);
  if (f.corner_plot) a.cornerPlot = true;
  if (f.road_type) a.roadType = f.road_type;
  if (f.plot_shape) a.plotShape = f.plot_shape;
  if (f.commission_percentage) a.commissionPercentage = Number(f.commission_percentage);
  if (f.registration_ready) a.registrationReady = true;
  if (f.plot_color_status) a.plotColorStatus = f.plot_color_status;
  if (f.water) a.water = true;
  if (f.electricity) a.electricity = true;
  if (f.drainage) a.drainage = true;
  if (f.street_lights) a.streetLights = true;
  if (f.compound_wall) a.compoundWall = true;
  if (f.park) a.park = true;
  if (f.clubhouse) a.clubhouse = true;
  if (f.security) a.security = true;
  if (f.landmark) a.landmark = f.landmark;
  if (f.nearby_schools) a.nearbySchools = f.nearby_schools;
  if (f.nearby_hospitals) a.nearbyHospitals = f.nearby_hospitals;
  if (f.nearby_transport) a.nearbyTransport = f.nearby_transport;
  if (f.distance_main_road) a.distanceFromMainRoad = f.distance_main_road;
  if (f.booking_notes) a.bookingNotes = f.booking_notes;
  return Object.keys(a).length > 0 ? a : undefined;
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function AdminProjectsScreen() {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [view, setView] = useState<ScreenView>('list');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [statusModal, setStatusModal] = useState<Unit | null>(null);
  const [pendingStatus, setPendingStatus] = useState<UnitStatus>('Available');
  const [reason, setReason] = useState('');
  const [ownerPickerVisible, setOwnerPickerVisible] = useState(false);

  // Create form
  const [form, setForm] = useState<CreateForm>({
    project_name: '', project_type: '', location: '', rera_number: '', owner_id: '',
    block_phase: '', approval_authority: '', approval_number: '', approval_type: '',
  });
  const [createSections, setCreateSections] = useState<Set<string>>(new Set(['basic']));

  // Add unit form
  const [unitForm, setUnitForm] = useState<AddUnitForm>(INITIAL_UNIT_FORM);
  const [unitSections, setUnitSections] = useState<Set<string>>(new Set(['required']));

  const toggleCreateSection = useCallback((s: string) => {
    setCreateSections((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }, []);

  const toggleUnitSection = useCallback((s: string) => {
    setUnitSections((prev) => {
      const n = new Set(prev);
      n.has(s) ? n.delete(s) : n.add(s);
      return n;
    });
  }, []);

  const setUnitField = useCallback(<K extends keyof AddUnitForm>(key: K, val: AddUnitForm[K]) => {
    setUnitForm((prev) => ({ ...prev, [key]: val }));
  }, []);

  // ── Queries ──────────────────────────────────────────────────────────────

  const projectsQuery = useQuery<Project[]>({
    queryKey: ['admin-projects'],
    queryFn: () => api.get('/admin/projects').then((r) => r.data.data),
  });

  const ownersQuery = useQuery<Owner[]>({
    queryKey: ['admin-owners'],
    queryFn: () => api.get('/admin/owners').then((r) => r.data.data),
    enabled: view === 'create',
  });

  const detailQuery = useQuery<ProjectDetail>({
    queryKey: ['admin-project', selectedId],
    queryFn: () => api.get(`/projects/${selectedId}`).then((r) => r.data.data),
    enabled: (view === 'detail' || view === 'add-unit') && !!selectedId,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────

  const createMutation = useMutation({
    mutationFn: (data: CreateForm) => {
      const configAttributes: Record<string, string> = {};
      if (data.block_phase) configAttributes.block = data.block_phase;
      if (data.approval_authority) configAttributes.approvalAuthority = data.approval_authority;
      if (data.approval_number) configAttributes.approvalNumber = data.approval_number;
      if (data.approval_type) configAttributes.approvalType = data.approval_type;
      return api.post('/projects', {
        name: data.project_name,
        type: data.project_type,
        location: data.location,
        ...(data.rera_number && { reraNumber: data.rera_number }),
        ...(data.owner_id && { ownerId: data.owner_id }),
        ...(Object.keys(configAttributes).length > 0 && { configAttributes }),
      });
    },
    onSuccess: (res) => {
      queryClient.setQueryData<Project[]>(['admin-projects'], (old) =>
        old ? [res.data.data, ...old] : [res.data.data],
      );
      setView('list');
      setForm({ project_name: '', project_type: '', location: '', rera_number: '', owner_id: '',
        block_phase: '', approval_authority: '', approval_number: '', approval_type: '' });
      setCreateSections(new Set(['basic']));
    },
    onError: (err: any) => Alert.alert('Error', err.response?.data?.message ?? 'Could not create project.'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ unitId, status, reason }: { unitId: string; status: UnitStatus; reason: string }) =>
      api.patch(`/units/${unitId}/status`, { status, reason }),
    onMutate: async ({ unitId, status }) => {
      await queryClient.cancelQueries({ queryKey: ['admin-project', selectedId] });
      const prev = queryClient.getQueryData<ProjectDetail>(['admin-project', selectedId]);
      queryClient.setQueryData<ProjectDetail>(['admin-project', selectedId], (old) =>
        old ? { ...old, units: old.units.map((u) => (u.id === unitId ? { ...u, status } : u)) } : old,
      );
      return { prev };
    },
    onError: (err: any, _, ctx) => {
      queryClient.setQueryData(['admin-project', selectedId], ctx?.prev);
      Alert.alert('Error', err.response?.data?.message ?? 'Could not update status.');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-project', selectedId] });
      setStatusModal(null);
      setReason('');
    },
  });

  const publishMutation = useMutation({
    mutationFn: (projectId: string) => api.post(`/projects/${projectId}/publish`),
    onSuccess: (res) => {
      const updated = res.data.data;
      queryClient.setQueryData<ProjectDetail>(['admin-project', selectedId], (old) =>
        old ? { ...old, is_published: true } : old,
      );
      queryClient.setQueryData<Project[]>(['admin-projects'], (old) =>
        old ? old.map((p) => (p.id === selectedId ? { ...p, is_published: true } : p)) : old,
      );
      Alert.alert('Published', `${updated.project_name} is now live.`);
    },
    onError: (err: any) => Alert.alert('Error', err.response?.data?.message ?? 'Could not publish project.'),
  });

  const addUnitMutation = useMutation({
    mutationFn: (uf: AddUnitForm) =>
      api.post('/units', {
        projectId: selectedId,
        unitNumber: uf.unit_number.trim(),
        sqFt: Number(uf.sq_ft),
        price: Number(uf.price),
        ...(uf.facing && { facing: uf.facing }),
        ...(uf.road_width && { roadWidth: Number(uf.road_width) }),
        attributes: buildUnitAttributes(uf),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData<ProjectDetail>(['admin-project', selectedId], (old) =>
        old ? { ...old, units: [...old.units, res.data.data] } : old,
      );
      setView('detail');
      setUnitForm(INITIAL_UNIT_FORM);
      setUnitSections(new Set(['required']));
    },
    onError: (err: any) => Alert.alert('Error', err.response?.data?.message ?? 'Could not add unit.'),
  });

  const uploadDocMutation = useMutation({
    mutationFn: ({ uri, name, mimeType }: { uri: string; name: string; mimeType: string }) => {
      const form = new FormData();
      form.append('file', { uri, name, type: mimeType } as any);
      form.append('name', name);
      return api.post(`/projects/${selectedId}/documents`, form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-project', selectedId] }),
    onError: (err: any) => Alert.alert('Upload Failed', err.response?.data?.message ?? 'Could not upload document.'),
  });

  const deleteDocMutation = useMutation({
    mutationFn: (index: number) => api.delete(`/projects/${selectedId}/documents/${index}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['admin-project', selectedId] }),
    onError: (err: any) => Alert.alert('Error', err.response?.data?.message ?? 'Could not delete document.'),
  });

  const handlePickDocument = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const file = result.assets[0];
    uploadDocMutation.mutate({
      uri: file.uri,
      name: file.name,
      mimeType: file.mimeType ?? 'application/octet-stream',
    });
  };

  const handleAddUnit = () => {
    if (!unitForm.unit_number.trim()) return Alert.alert('Required', 'Plot number is required.');
    const sqFt = Number(unitForm.sq_ft);
    const price = Number(unitForm.price);
    if (!unitForm.sq_ft || isNaN(sqFt) || sqFt <= 0) return Alert.alert('Invalid', 'Enter a valid plot size (sq ft).');
    if (!unitForm.price || isNaN(price) || price <= 0) return Alert.alert('Invalid', 'Enter a valid total price.');
    addUnitMutation.mutate(unitForm);
  };

  const handleCreate = () => {
    if (!form.project_name.trim()) return Alert.alert('Required', 'Project name is required.');
    if (!form.project_type.trim()) return Alert.alert('Required', 'Project type is required.');
    if (!form.location.trim()) return Alert.alert('Required', 'Location is required.');
    createMutation.mutate(form);
  };

  // Computed
  const selectedOwner = ownersQuery.data?.find((o) => o.id === form.owner_id) ?? null;
  const calcRatePerSqft = (() => {
    const sq = Number(unitForm.sq_ft);
    const pr = Number(unitForm.price);
    return sq > 0 && pr > 0 ? Math.round(pr / sq) : null;
  })();
  const amenityCount = AMENITIES.filter((a) => unitForm[a.key] as boolean).length;

  // ── ADD UNIT VIEW ─────────────────────────────────────────────────────────

  if (view === 'add-unit') {
    const projectName = detailQuery.data?.project_name ?? 'Project';

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.pageHeader}>
            <TouchableOpacity onPress={() => { setView('detail'); setUnitForm(INITIAL_UNIT_FORM); setUnitSections(new Set(['required'])); }} style={s.backBtn}>
              <Feather name="arrow-left" size={20} color="#0a0f1c" />
            </TouchableOpacity>
            <View style={{ flex: 1 }}>
              <Text style={s.pageTitle}>Add Plot</Text>
              <Text style={s.pageSubtitle} numberOfLines={1}>{projectName}</Text>
            </View>
            <TouchableOpacity
              style={[s.saveHeaderBtn, addUnitMutation.isPending && s.btnDisabled]}
              onPress={handleAddUnit}
              disabled={addUnitMutation.isPending}
              activeOpacity={0.8}
            >
              {addUnitMutation.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={s.saveHeaderBtnText}>Save</Text>
              )}
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* ── Required ── */}
            <SectionHeader title="REQUIRED DETAILS" isOpen={unitSections.has('required')} onToggle={() => toggleUnitSection('required')} />
            {unitSections.has('required') && (
              <View style={f.sectionBody}>
                <FormField label="PLOT NUMBER" value={unitForm.unit_number} onChangeText={(v) => setUnitField('unit_number', v)} placeholder="e.g. A-101, Plot-5" />
                <ChipSelector options={PLOT_TYPES} selected={unitForm.plot_type} onSelect={(v) => setUnitField('plot_type', v)} />
                <View style={f.row}>
                  <View style={{ flex: 1 }}>
                    <FormField label="TOTAL SIZE (SQ.FT)" value={unitForm.sq_ft} onChangeText={(v) => setUnitField('sq_ft', v)} placeholder="e.g. 1200" keyboardType="numeric" />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <FormField label="TOTAL PRICE (₹)" value={unitForm.price} onChangeText={(v) => setUnitField('price', v)} placeholder="e.g. 5000000" keyboardType="numeric" />
                  </View>
                </View>
                {calcRatePerSqft && (
                  <View style={f.calcBadge}>
                    <Feather name="info" size={12} color={GREEN} />
                    <Text style={f.calcText}>Rate: ₹{calcRatePerSqft.toLocaleString('en-IN')}/sq.ft</Text>
                  </View>
                )}
              </View>
            )}

            {/* ── Dimensions ── */}
            <SectionHeader title="DIMENSIONS" isOpen={unitSections.has('dimensions')} onToggle={() => toggleUnitSection('dimensions')} hint="Length, Width, Rate/sqft" />
            {unitSections.has('dimensions') && (
              <View style={f.sectionBody}>
                <Text style={f.subLabel}>DIMENSION FORMAT</Text>
                <ChipSelector options={DIM_FORMATS} selected={unitForm.dimension_format} onSelect={(v) => setUnitField('dimension_format', v || 'Feet')} />
                <View style={f.row}>
                  <View style={{ flex: 1 }}>
                    <FormField label={`LENGTH (${unitForm.dimension_format})`} value={unitForm.length} onChangeText={(v) => setUnitField('length', v)} placeholder="e.g. 40" keyboardType="numeric" />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <FormField label={`WIDTH (${unitForm.dimension_format})`} value={unitForm.width} onChangeText={(v) => setUnitField('width', v)} placeholder="e.g. 30" keyboardType="numeric" />
                  </View>
                </View>
                {unitForm.length && unitForm.width && (
                  <View style={f.calcBadge}>
                    <Feather name="maximize" size={12} color="#64748b" />
                    <Text style={f.calcText}>
                      Area: {(Number(unitForm.length) * Number(unitForm.width)).toLocaleString('en-IN')} {unitForm.dimension_format === 'Meters' ? 'sq.m' : 'sq.ft'}
                    </Text>
                  </View>
                )}
                <FormField label="RATE PER SQ.FT (₹)" value={unitForm.rate_per_sqft} onChangeText={(v) => setUnitField('rate_per_sqft', v)} placeholder="e.g. 4500" keyboardType="numeric" optional />
              </View>
            )}

            {/* ── Plot Details ── */}
            <SectionHeader title="PLOT DETAILS" isOpen={unitSections.has('plot')} onToggle={() => toggleUnitSection('plot')} hint="Facing, Road, Shape" />
            {unitSections.has('plot') && (
              <View style={f.sectionBody}>
                <Text style={f.subLabel}>FACING DIRECTION</Text>
                <ChipSelector options={FACING_OPTIONS} selected={unitForm.facing} onSelect={(v) => setUnitField('facing', v)} />
                <ToggleRow label="Corner Plot" value={unitForm.corner_plot} onToggle={() => setUnitField('corner_plot', !unitForm.corner_plot)} />
                <View style={f.row}>
                  <View style={{ flex: 1 }}>
                    <FormField label="ROAD WIDTH (ft)" value={unitForm.road_width} onChangeText={(v) => setUnitField('road_width', v)} placeholder="e.g. 30" keyboardType="numeric" optional />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <FormField label="PLOT SHAPE" value={unitForm.plot_shape} onChangeText={(v) => setUnitField('plot_shape', v)} placeholder="e.g. Regular" optional />
                  </View>
                </View>
                <Text style={f.subLabel}>ROAD TYPE</Text>
                <ChipSelector options={ROAD_TYPES} selected={unitForm.road_type} onSelect={(v) => setUnitField('road_type', v)} />
              </View>
            )}

            {/* ── Financial ── */}
            <SectionHeader title="FINANCIAL" isOpen={unitSections.has('financial')} onToggle={() => toggleUnitSection('financial')} hint="Booking amount, Commission" />
            {unitSections.has('financial') && (
              <View style={f.sectionBody}>
                <View style={f.row}>
                  <View style={{ flex: 1 }}>
                    <FormField label="BOOKING AMOUNT (₹)" value={unitForm.booking_amount} onChangeText={(v) => setUnitField('booking_amount', v)} placeholder="e.g. 100000" keyboardType="numeric" optional />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <FormField label="COMMISSION (%)" value={unitForm.commission_percentage} onChangeText={(v) => setUnitField('commission_percentage', v)} placeholder="e.g. 2" keyboardType="numeric" optional />
                  </View>
                </View>
                <ToggleRow label="Registration Ready" value={unitForm.registration_ready} onToggle={() => setUnitField('registration_ready', !unitForm.registration_ready)} />
                <Text style={[f.subLabel, { marginTop: 14 }]}>PLOT LAYOUT COLOR</Text>
                <ChipSelector options={PLOT_COLORS} selected={unitForm.plot_color_status} onSelect={(v) => setUnitField('plot_color_status', v)} />
              </View>
            )}

            {/* ── Amenities ── */}
            <SectionHeader
              title="AMENITIES"
              isOpen={unitSections.has('amenities')}
              onToggle={() => toggleUnitSection('amenities')}
              hint={amenityCount > 0 ? `${amenityCount} selected` : 'Water, Power, Security…'}
            />
            {unitSections.has('amenities') && (
              <View style={f.sectionBody}>
                <View style={f.amenityGrid}>
                  {AMENITIES.map(({ key, label, icon }) => (
                    <AmenityChip
                      key={key}
                      label={label}
                      icon={icon}
                      value={unitForm[key] as boolean}
                      onToggle={() => setUnitField(key, !unitForm[key])}
                    />
                  ))}
                </View>
              </View>
            )}

            {/* ── Nearby ── */}
            <SectionHeader title="NEARBY & LOCATION" isOpen={unitSections.has('nearby')} onToggle={() => toggleUnitSection('nearby')} hint="Schools, Hospital, Transport" />
            {unitSections.has('nearby') && (
              <View style={f.sectionBody}>
                <FormField label="LANDMARK" value={unitForm.landmark} onChangeText={(v) => setUnitField('landmark', v)} placeholder="e.g. Near City Mall" optional />
                <FormField label="NEARBY SCHOOLS" value={unitForm.nearby_schools} onChangeText={(v) => setUnitField('nearby_schools', v)} placeholder="e.g. St. Mary's 2km" optional />
                <FormField label="NEARBY HOSPITALS" value={unitForm.nearby_hospitals} onChangeText={(v) => setUnitField('nearby_hospitals', v)} placeholder="e.g. Apollo 3km" optional />
                <FormField label="NEARBY TRANSPORT" value={unitForm.nearby_transport} onChangeText={(v) => setUnitField('nearby_transport', v)} placeholder="e.g. Bus Stop 500m" optional />
                <FormField label="DISTANCE FROM MAIN ROAD" value={unitForm.distance_main_road} onChangeText={(v) => setUnitField('distance_main_road', v)} placeholder="e.g. 200m" optional />
              </View>
            )}

            {/* ── Notes ── */}
            <SectionHeader title="NOTES" isOpen={unitSections.has('notes')} onToggle={() => toggleUnitSection('notes')} hint="Booking notes, remarks" />
            {unitSections.has('notes') && (
              <View style={f.sectionBody}>
                <FormField label="BOOKING NOTES" value={unitForm.booking_notes} onChangeText={(v) => setUnitField('booking_notes', v)} placeholder="Any remarks about this plot…" multiline optional />
              </View>
            )}

            {/* Submit */}
            <TouchableOpacity
              style={[s.submitBtn, addUnitMutation.isPending && s.btnDisabled]}
              onPress={handleAddUnit}
              disabled={addUnitMutation.isPending}
              activeOpacity={0.85}
            >
              {addUnitMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.submitBtnText}>Add Plot</Text>
                  <Feather name="check" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  // ── CREATE VIEW ───────────────────────────────────────────────────────────

  if (view === 'create') {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <View style={s.pageHeader}>
            <TouchableOpacity onPress={() => setView('list')} style={s.backBtn}>
              <Feather name="arrow-left" size={20} color="#0a0f1c" />
            </TouchableOpacity>
            <Text style={s.pageTitle}>New Project</Text>
          </View>
          <ScrollView contentContainerStyle={s.formScroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

            {/* Basic info */}
            <SectionHeader title="BASIC INFORMATION" isOpen={createSections.has('basic')} onToggle={() => toggleCreateSection('basic')} />
            {createSections.has('basic') && (
              <View style={f.sectionBody}>
                <FormField label="PROJECT NAME" value={form.project_name} onChangeText={(v) => setForm((p) => ({ ...p, project_name: v }))} placeholder="e.g. Sunset Heights" />
                <Text style={f.subLabel}>PROJECT TYPE</Text>
                <ChipSelector options={PLOT_TYPES} selected={form.project_type} onSelect={(v) => setForm((p) => ({ ...p, project_type: v }))} />
                {!PLOT_TYPES.includes(form.project_type) && form.project_type ? (
                  <TextInput style={[f.textInput, { marginTop: 8 }]} placeholder="Custom type…" placeholderTextColor="#94a3b8" value={form.project_type} onChangeText={(v) => setForm((p) => ({ ...p, project_type: v }))} />
                ) : null}
                <FormField label="LOCATION" value={form.location} onChangeText={(v) => setForm((p) => ({ ...p, location: v }))} placeholder="City, State" />
                <FormField label="RERA NUMBER" value={form.rera_number} onChangeText={(v) => setForm((p) => ({ ...p, rera_number: v }))} placeholder="RERA/KN/…" optional />
              </View>
            )}

            {/* Approval details */}
            <SectionHeader title="APPROVAL DETAILS" isOpen={createSections.has('approval')} onToggle={() => toggleCreateSection('approval')} hint="Block, Authority, LP Number" />
            {createSections.has('approval') && (
              <View style={f.sectionBody}>
                <FormField label="BLOCK / PHASE" value={form.block_phase} onChangeText={(v) => setForm((p) => ({ ...p, block_phase: v }))} placeholder="e.g. Phase 1, Block A" optional />
                <FormField label="APPROVAL AUTHORITY" value={form.approval_authority} onChangeText={(v) => setForm((p) => ({ ...p, approval_authority: v }))} placeholder="e.g. HMDA, DTCP, Panchayat" optional />
                <View style={f.row}>
                  <View style={{ flex: 1 }}>
                    <FormField label="APPROVAL NUMBER" value={form.approval_number} onChangeText={(v) => setForm((p) => ({ ...p, approval_number: v }))} placeholder="e.g. LP/TS/001/2024" optional />
                  </View>
                  <View style={{ width: 12 }} />
                  <View style={{ flex: 1 }}>
                    <FormField label="APPROVAL TYPE" value={form.approval_type} onChangeText={(v) => setForm((p) => ({ ...p, approval_type: v }))} placeholder="e.g. LP, LRS, NA" optional />
                  </View>
                </View>
              </View>
            )}

            {/* Owner */}
            <SectionHeader title="OWNER ASSIGNMENT" isOpen={createSections.has('owner')} onToggle={() => toggleCreateSection('owner')} hint="Assign later if not ready" />
            {createSections.has('owner') && (
              <View style={f.sectionBody}>
                <Text style={f.fieldLabel}>OWNER <Text style={f.optional}>(optional)</Text></Text>
                <TouchableOpacity style={[f.textInput, f.pickerRow]} onPress={() => setOwnerPickerVisible(true)} activeOpacity={0.7}>
                  {selectedOwner ? (
                    <View style={{ flex: 1 }}>
                      <Text style={f.pickerValue}>{selectedOwner.name}</Text>
                      <Text style={f.pickerSub}>{selectedOwner.phone}</Text>
                    </View>
                  ) : (
                    <Text style={f.pickerPlaceholder}>
                      {ownersQuery.isLoading ? 'Loading owners…' : 'Select an owner'}
                    </Text>
                  )}
                  <Feather name="chevron-down" size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            )}

            <TouchableOpacity
              style={[s.submitBtn, createMutation.isPending && s.btnDisabled]}
              onPress={handleCreate}
              disabled={createMutation.isPending}
              activeOpacity={0.85}
            >
              {createMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.submitBtnText}>Create Project</Text>
                  <Feather name="check" size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Owner picker */}
        <Modal visible={ownerPickerVisible} transparent animationType="slide" onRequestClose={() => setOwnerPickerVisible(false)}>
          <View style={s.modalOuter}>
            <Pressable style={s.backdrop} onPress={() => setOwnerPickerVisible(false)} />
            <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>Select Owner</Text>
              {ownersQuery.isLoading ? (
                <ActivityIndicator color={GREEN} style={{ marginTop: 24 }} />
              ) : ownersQuery.data?.length === 0 ? (
                <Text style={[s.centerText, { marginTop: 24 }]}>No owners registered yet.</Text>
              ) : (
                <FlatList
                  data={ownersQuery.data}
                  keyExtractor={(o) => o.id}
                  style={{ maxHeight: 320 }}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={[s.ownerOption, form.owner_id === item.id && s.ownerOptionSelected]}
                      onPress={() => { setForm((f) => ({ ...f, owner_id: item.id })); setOwnerPickerVisible(false); }}
                      activeOpacity={0.7}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={[s.ownerName, form.owner_id === item.id && { color: GREEN }]}>{item.name}</Text>
                        <Text style={s.ownerPhone}>{item.phone}</Text>
                      </View>
                      {form.owner_id === item.id && <Feather name="check" size={16} color={GREEN} />}
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── DETAIL VIEW ───────────────────────────────────────────────────────────

  if (view === 'detail') {
    const project = detailQuery.data;
    const units = project?.units ?? [];
    const stats = {
      available: units.filter((u) => u.status === 'Available').length,
      booked: units.filter((u) => u.status === 'Booked').length,
      sold: units.filter((u) => u.status === 'Sold').length,
    };

    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.pageHeader}>
          <TouchableOpacity onPress={() => setView('list')} style={s.backBtn}>
            <Feather name="arrow-left" size={20} color="#0a0f1c" />
          </TouchableOpacity>
          <Text style={s.pageTitle} numberOfLines={1}>
            {detailQuery.isLoading ? 'Loading…' : project?.project_name ?? 'Project'}
          </Text>
          <TouchableOpacity style={s.addUnitBtn} onPress={() => setView('add-unit')} activeOpacity={0.7}>
            <Feather name="plus" size={16} color={GREEN} />
            <Text style={s.addUnitBtnText}>Add Plot</Text>
          </TouchableOpacity>
        </View>

        {detailQuery.isLoading && <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>}
        {detailQuery.isError && (
          <View style={s.center}>
            <Feather name="alert-circle" size={32} color="#cbd5e1" />
            <Text style={s.centerText}>Could not load project</Text>
          </View>
        )}

        {project && (
          <>
            <View style={s.statusBar}>
              {([
                { label: 'Available', count: stats.available, color: STATUS_COLOR.Available },
                { label: 'Booked', count: stats.booked, color: STATUS_COLOR.Booked },
                { label: 'Sold', count: stats.sold, color: STATUS_COLOR.Sold },
              ] as const).map(({ label, count, color }) => (
                <View key={label} style={s.statusBarItem}>
                  <View style={[s.statusDot, { backgroundColor: color }]} />
                  <Text style={s.statusBarLabel}>{label}</Text>
                  <Text style={[s.statusBarCount, { color }]}>{count}</Text>
                </View>
              ))}
            </View>

            {!project.is_published && (
              <TouchableOpacity
                style={[s.publishBanner, publishMutation.isPending && s.btnDisabled]}
                onPress={() => selectedId && publishMutation.mutate(selectedId)}
                disabled={publishMutation.isPending}
                activeOpacity={0.85}
              >
                {publishMutation.isPending ? <ActivityIndicator size="small" color="#fff" /> : (
                  <><Feather name="globe" size={15} color="#fff" /><Text style={s.publishBannerText}>Publish Project</Text></>
                )}
              </TouchableOpacity>
            )}

            <Text style={s.hintText}>Long-press a plot to change its status</Text>

            <FlatList
              data={units}
              keyExtractor={(u) => u.id}
              numColumns={2}
              columnWrapperStyle={s.colWrap}
              contentContainerStyle={s.unitList}
              ListEmptyComponent={
                <View style={s.center}>
                  <Feather name="grid" size={40} color="#cbd5e1" />
                  <Text style={s.centerText}>No plots added yet</Text>
                  <TouchableOpacity style={s.retryBtn} onPress={() => setView('add-unit')}>
                    <Text style={s.retryText}>Add First Plot</Text>
                  </TouchableOpacity>
                </View>
              }
              ListFooterComponent={
                <View style={s.docsSection}>
                  <View style={s.docsSectionHeader}>
                    <Text style={s.docsSectionTitle}>DOCUMENTS</Text>
                    <TouchableOpacity
                      style={[s.addDocBtn, uploadDocMutation.isPending && s.btnDisabled]}
                      onPress={handlePickDocument}
                      disabled={uploadDocMutation.isPending}
                      activeOpacity={0.8}
                    >
                      {uploadDocMutation.isPending ? (
                        <ActivityIndicator size="small" color={GREEN} />
                      ) : (
                        <>
                          <Feather name="upload" size={14} color={GREEN} />
                          <Text style={s.addDocBtnText}>Upload</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>

                  {(project.documents ?? []).length === 0 ? (
                    <View style={s.docsEmpty}>
                      <Feather name="file" size={28} color="#cbd5e1" />
                      <Text style={s.docsEmptyText}>No documents uploaded yet</Text>
                    </View>
                  ) : (
                    (project.documents ?? []).map((doc, i) => (
                      <View key={i} style={s.docRow}>
                        <View style={[s.docIcon, doc.type === 'pdf' ? s.docIconPdf : s.docIconImg]}>
                          <Feather
                            name={doc.type === 'pdf' ? 'file-text' : 'image'}
                            size={18}
                            color={doc.type === 'pdf' ? '#ef4444' : '#3b82f6'}
                          />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={s.docName} numberOfLines={1}>{doc.name}</Text>
                          <Text style={s.docDate}>
                            {new Date(doc.uploadedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={s.docDeleteBtn}
                          onPress={() =>
                            Alert.alert('Delete Document', `Remove "${doc.name}"?`, [
                              { text: 'Cancel', style: 'cancel' },
                              { text: 'Delete', style: 'destructive', onPress: () => deleteDocMutation.mutate(i) },
                            ])
                          }
                        >
                          <Feather name="trash-2" size={16} color="#ef4444" />
                        </TouchableOpacity>
                      </View>
                    ))
                  )}
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[s.unitCard, { borderColor: STATUS_COLOR[item.status], backgroundColor: STATUS_BG[item.status] }]}
                  onLongPress={() => { setPendingStatus(item.status); setStatusModal(item); }}
                  delayLongPress={400}
                  activeOpacity={0.8}
                >
                  <View style={s.unitCardTop}>
                    <Text style={s.unitNumber}>#{item.unit_number}</Text>
                    <View style={[s.statusDot, { backgroundColor: STATUS_COLOR[item.status] }]} />
                  </View>
                  <Text style={s.unitPrice}>{formatINR(item.price)}</Text>
                  <Text style={s.unitSqft}>{item.sq_ft.toLocaleString()} sqft</Text>
                  {item.facing ? <Text style={s.unitFacing}>{item.facing}</Text> : null}
                </TouchableOpacity>
              )}
            />
          </>
        )}

        {/* Status change modal */}
        <Modal visible={statusModal !== null} transparent animationType="slide" onRequestClose={() => setStatusModal(null)}>
          <View style={s.modalOuter}>
            <Pressable style={s.backdrop} onPress={() => setStatusModal(null)} />
            <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
              <View style={s.sheetHandle} />
              <Text style={s.sheetTitle}>Change Plot Status</Text>
              <Text style={s.sheetSub}>Plot #{statusModal?.unit_number}</Text>
              <View style={s.statusOptions}>
                {(['Available', 'Booked', 'Sold'] as UnitStatus[]).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[s.statusOption, pendingStatus === st && { borderColor: STATUS_COLOR[st], backgroundColor: STATUS_BG[st] }]}
                    onPress={() => setPendingStatus(st)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.statusDot, { backgroundColor: STATUS_COLOR[st] }]} />
                    <Text style={[s.statusOptionText, pendingStatus === st && { color: STATUS_COLOR[st], fontWeight: '700' }]}>{st}</Text>
                    {pendingStatus === st && <Feather name="check" size={14} color={STATUS_COLOR[st]} />}
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={f.fieldLabel}>REASON FOR CHANGE</Text>
              <TextInput
                style={[f.textInput, { marginBottom: 20 }]}
                placeholder="e.g. Customer cancelled booking"
                placeholderTextColor="#94a3b8"
                value={reason}
                onChangeText={setReason}
                multiline
              />
              <TouchableOpacity
                style={[s.submitBtn, statusMutation.isPending && s.btnDisabled]}
                onPress={() => {
                  if (!statusModal) return;
                  if (!reason.trim()) return Alert.alert('Required', 'Please enter a reason.');
                  statusMutation.mutate({ unitId: statusModal.id, status: pendingStatus, reason: reason.trim() });
                }}
                disabled={statusMutation.isPending}
                activeOpacity={0.85}
              >
                {statusMutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={s.submitBtnText}>Confirm Change</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    );
  }

  // ── LIST VIEW ─────────────────────────────────────────────────────────────

  const projects = projectsQuery.data ?? [];

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.pageHeader}>
        <View>
          <Text style={s.pageTitle}>Projects</Text>
          <Text style={s.pageCount}>{projects.length} total</Text>
        </View>
        <TouchableOpacity
          style={s.bulkBtn}
          onPress={() => setShowBulkUpload(true)}
          activeOpacity={0.8}
        >
          <Feather name="upload" size={14} color={GREEN} />
          <Text style={s.bulkBtnText}>Bulk Upload</Text>
        </TouchableOpacity>
      </View>

      {projectsQuery.isLoading ? (
        <View style={s.center}><ActivityIndicator size="large" color={GREEN} /></View>
      ) : projectsQuery.isError ? (
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.centerText}>Could not load projects</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => projectsQuery.refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={projects}
          keyExtractor={(p) => p.id}
          contentContainerStyle={s.list}
          onRefresh={() => projectsQuery.refetch()}
          refreshing={projectsQuery.isFetching}
          ListEmptyComponent={
            <View style={s.center}>
              <Feather name="folder" size={40} color="#cbd5e1" />
              <Text style={s.centerText}>No projects yet. Tap + to create one.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <TouchableOpacity style={s.projectCard} onPress={() => { setSelectedId(item.id); setView('detail'); }} activeOpacity={0.8}>
              <View style={s.projectCardBody}>
                <View style={s.projectCardLeft}>
                  <Text style={s.projectType}>{item.project_type.toUpperCase()}</Text>
                  <Text style={s.projectName}>{item.project_name}</Text>
                  <View style={s.locationRow}>
                    <Feather name="map-pin" size={12} color="#94a3b8" />
                    <Text style={s.projectLocation}>{item.location}</Text>
                  </View>
                  {item.owner && (
                    <View style={s.locationRow}>
                      <Feather name="user" size={12} color="#94a3b8" />
                      <Text style={s.projectLocation}>{item.owner.name}</Text>
                    </View>
                  )}
                </View>
                <View style={s.projectCardRight}>
                  <View style={item.is_published ? s.pubBadge : s.draftBadge}>
                    <Text style={item.is_published ? s.pubBadgeText : s.draftBadgeText}>
                      {item.is_published ? 'Published' : 'Draft'}
                    </Text>
                  </View>
                  {item._count !== undefined && (
                    <Text style={s.unitCountText}>{item._count.units} plots</Text>
                  )}
                  <Feather name="chevron-right" size={18} color="#cbd5e1" style={{ marginTop: 8 }} />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <TouchableOpacity style={[s.fab, { bottom: insets.bottom + 24 }]} onPress={() => setView('create')} activeOpacity={0.85}>
        <Feather name="plus" size={24} color="#fff" />
      </TouchableOpacity>

      <BulkUploadModal visible={showBulkUpload} onClose={() => setShowBulkUpload(false)} />
    </SafeAreaView>
  );
}

// ─── Form styles ──────────────────────────────────────────────────────────────

const f = StyleSheet.create({
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    marginTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e8edf5',
  },
  sectionHeaderLeft: { flex: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#0a0f1c', letterSpacing: 0.8 },
  sectionHint: { fontSize: 11, color: '#94a3b8', marginTop: 2 },
  sectionChevron: {
    width: 28, height: 28, borderRadius: 8,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  sectionChevronOpen: { backgroundColor: GREEN + '14' },
  sectionBody: { backgroundColor: '#fff', paddingHorizontal: 20, paddingBottom: 20, gap: 0 },
  row: { flexDirection: 'row' },
  fieldGroup: { marginBottom: 16, marginTop: 4 },
  fieldLabel: { fontSize: 11, fontWeight: '700', color: '#64748b', letterSpacing: 0.5, marginBottom: 8 },
  subLabel: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 8, marginTop: 4 },
  optional: { color: '#94a3b8', fontWeight: '400' },
  textInput: {
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, color: '#0a0f1c', backgroundColor: '#f8fafc',
  },
  textAreaInput: { height: 88, textAlignVertical: 'top' },
  pickerRow: { flexDirection: 'row', alignItems: 'center' },
  pickerValue: { fontSize: 15, color: '#0a0f1c', fontWeight: '600' },
  pickerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  pickerPlaceholder: { flex: 1, fontSize: 15, color: '#94a3b8' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 8 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
  },
  chipActive: { borderColor: GREEN, backgroundColor: '#edfaf4' },
  chipText: { fontSize: 13, color: '#64748b', fontWeight: '500' },
  chipTextActive: { color: GREEN, fontWeight: '700' },
  amenityGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  amenityChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    width: '47%', paddingHorizontal: 12, paddingVertical: 11, borderRadius: 14,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#f8fafc',
    position: 'relative',
  },
  amenityChipActive: { borderColor: GREEN, backgroundColor: '#edfaf4' },
  amenityText: { fontSize: 13, color: '#64748b', fontWeight: '500', flex: 1 },
  amenityTextActive: { color: GREEN, fontWeight: '700' },
  amenityDot: {
    width: 8, height: 8, borderRadius: 4, backgroundColor: GREEN,
    position: 'absolute', top: 8, right: 10,
  },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  toggleLabel: { fontSize: 14, color: '#0a0f1c', fontWeight: '500' },
  calcBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#f0fdf4', paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 10, marginBottom: 8, alignSelf: 'flex-start',
  },
  calcText: { fontSize: 12, color: GREEN, fontWeight: '600' },
});

// ─── Screen styles ────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingTop: 80 },
  centerText: { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: GREEN },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  pageHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5', gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { fontSize: 20, fontWeight: '900', color: '#0a0f1c' },
  bulkBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: GREEN, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  bulkBtnText: { fontSize: 12, fontWeight: '700', color: GREEN },
  pageSubtitle: { flex: 1, fontSize: 12, color: '#94a3b8', marginTop: 1 },
  saveHeaderBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 10, backgroundColor: GREEN,
  },
  saveHeaderBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  addUnitBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10,
    borderWidth: 1.5, borderColor: GREEN, backgroundColor: '#edfaf4',
  },
  addUnitBtnText: { fontSize: 13, fontWeight: '700', color: GREEN },
  pageCount: { fontSize: 13, color: '#94a3b8' },
  list: { padding: 16, gap: 12, paddingBottom: 100 },
  formScroll: { paddingBottom: 48 },
  projectCard: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  projectCardBody: { flexDirection: 'row', alignItems: 'flex-start', padding: 18 },
  projectCardLeft: { flex: 1, gap: 4 },
  projectCardRight: { alignItems: 'flex-end' },
  projectType: { fontSize: 10, fontWeight: '700', color: GREEN, letterSpacing: 0.8 },
  projectName: { fontSize: 16, fontWeight: '800', color: '#0a0f1c' },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  projectLocation: { fontSize: 12, color: '#94a3b8' },
  unitCountText: { fontSize: 11, color: '#94a3b8', marginTop: 4 },
  pubBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: '#edfaf4' },
  pubBadgeText: { fontSize: 11, fontWeight: '700', color: GREEN },
  draftBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, backgroundColor: '#f1f5f9' },
  draftBadgeText: { fontSize: 11, fontWeight: '700', color: '#94a3b8' },
  fab: {
    position: 'absolute', right: 24, width: 56, height: 56, borderRadius: 28,
    backgroundColor: GREEN, alignItems: 'center', justifyContent: 'center',
    shadowColor: '#1e3c6e', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 10, elevation: 8,
  },
  statusBar: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 12,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5', gap: 24,
  },
  statusBarItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  statusBarLabel: { fontSize: 12, color: '#64748b' },
  statusBarCount: { fontSize: 14, fontWeight: '800' },
  hintText: { fontSize: 11, color: '#94a3b8', paddingHorizontal: 20, paddingTop: 8, paddingBottom: 4 },
  unitList: { padding: 12, paddingBottom: 40 },
  colWrap: { gap: 10, marginBottom: 10 },
  unitCard: { flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 12 },
  unitCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  unitNumber: { fontSize: 14, fontWeight: '800', color: '#0a0f1c' },
  unitPrice: { fontSize: 13, fontWeight: '700', color: '#0a0f1c', marginBottom: 2 },
  unitSqft: { fontSize: 11, color: '#64748b', marginBottom: 1 },
  unitFacing: { fontSize: 11, color: '#94a3b8' },
  publishBanner: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, marginBottom: 4, paddingVertical: 13,
    borderRadius: 14, backgroundColor: GREEN,
  },
  publishBannerText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOuter: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', alignSelf: 'center', marginBottom: 24 },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0a0f1c', marginBottom: 2 },
  sheetSub: { fontSize: 13, color: '#94a3b8', marginBottom: 20 },
  statusOptions: { gap: 10, marginBottom: 20 },
  statusOption: {
    flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14,
    borderRadius: 12, borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fafafa',
  },
  statusOptionText: { flex: 1, fontSize: 14, color: '#64748b', fontWeight: '500' },
  ownerOption: {
    flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 12,
    borderWidth: 1.5, borderColor: '#e2e8f0', backgroundColor: '#fafafa', marginBottom: 10,
  },
  ownerOptionSelected: { borderColor: GREEN, backgroundColor: '#edfaf4' },
  ownerName: { fontSize: 15, fontWeight: '700', color: '#0a0f1c' },
  ownerPhone: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  submitBtn: {
    backgroundColor: GREEN, height: 56, borderRadius: 14, marginHorizontal: 20, marginTop: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  btnDisabled: { opacity: 0.55 },
  submitBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },

  // ── Documents section ──
  docsSection: {
    marginHorizontal: 12, marginTop: 8, marginBottom: 24,
    backgroundColor: '#fff', borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04, shadowRadius: 8, elevation: 2,
    overflow: 'hidden',
  },
  docsSectionHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  docsSectionTitle: { fontSize: 11, fontWeight: '800', color: '#0a0f1c', letterSpacing: 0.8 },
  addDocBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    borderWidth: 1.5, borderColor: GREEN,
  },
  addDocBtnText: { fontSize: 12, fontWeight: '700', color: GREEN },
  docsEmpty: {
    alignItems: 'center', paddingVertical: 28, gap: 8,
  },
  docsEmptyText: { fontSize: 13, color: '#94a3b8' },
  docRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 16, paddingVertical: 13,
    borderBottomWidth: 1, borderBottomColor: '#f8fafc',
  },
  docIcon: {
    width: 40, height: 40, borderRadius: 12,
    alignItems: 'center', justifyContent: 'center',
  },
  docIconPdf: { backgroundColor: '#fef2f2' },
  docIconImg: { backgroundColor: '#eff6ff' },
  docName: { fontSize: 14, fontWeight: '600', color: '#0a0f1c', marginBottom: 2 },
  docDate: { fontSize: 11, color: '#94a3b8' },
  docDeleteBtn: {
    width: 34, height: 34, borderRadius: 10,
    backgroundColor: '#fef2f2', alignItems: 'center', justifyContent: 'center',
  },
});
