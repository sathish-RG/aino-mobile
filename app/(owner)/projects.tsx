import { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import api from '@/src/api/client';

interface UnitSummary {
  total: number;
  available: number;
  booked: number;
  sold: number;
}

interface Project {
  id: string;
  project_name: string;
  project_type: string;
  location: string;
  rera_number: string | null;
  is_published: boolean;
  created_at: string;
  unitSummary: UnitSummary;
}

type UnitStatus = 'Available' | 'Booked' | 'Sold';

interface Unit {
  id: string;
  unit_number: string;
  sq_ft: number;
  price: number;
  facing: string | null;
  status: UnitStatus;
  coordinates: unknown;
}

interface ProjectDetail extends Project {
  units: Unit[];
}

const ORANGE = '#ea580c';

const STATUS_COLOR: Record<UnitStatus, string> = {
  Available: '#16a34a',
  Booked: '#f59e0b',
  Sold: '#94a3b8',
};

const STATUS_BG: Record<UnitStatus, string> = {
  Available: '#f0fdf4',
  Booked: '#fffbeb',
  Sold: '#f8fafc',
};

const formatINR = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);

function UnitBar({ summary }: { summary: UnitSummary }) {
  const { total, available, booked, sold } = summary;
  if (total === 0) return null;
  return (
    <View style={b.track}>
      {available > 0 && <View style={[b.seg, { flex: available, backgroundColor: STATUS_COLOR.Available }]} />}
      {booked > 0 && <View style={[b.seg, { flex: booked, backgroundColor: STATUS_COLOR.Booked }]} />}
      {sold > 0 && <View style={[b.seg, { flex: sold, backgroundColor: STATUS_COLOR.Sold }]} />}
    </View>
  );
}

const b = StyleSheet.create({
  track: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 12 },
  seg: { height: '100%' },
});

export default function OwnerProjects() {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'detail'>('list');

  const projectsQuery = useQuery<Project[]>({
    queryKey: ['owner-projects'],
    queryFn: () => api.get('/owner/projects').then((r) => r.data.data),
  });

  const detailQuery = useQuery<ProjectDetail>({
    queryKey: ['owner-project', selectedId],
    queryFn: () => api.get(`/owner/projects/${selectedId}`).then((r) => r.data.data),
    enabled: view === 'detail' && !!selectedId,
  });

  const openDetail = (id: string) => { setSelectedId(id); setView('detail'); };

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
        </View>

        {detailQuery.isLoading && (
          <View style={s.center}><ActivityIndicator size="large" color={ORANGE} /></View>
        )}

        {detailQuery.isError && (
          <View style={s.center}>
            <Feather name="alert-circle" size={32} color="#cbd5e1" />
            <Text style={s.centerText}>Could not load project</Text>
          </View>
        )}

        {project && (
          <>
            <View style={s.projectMeta}>
              {project.location ? (
                <View style={s.metaRow}>
                  <Feather name="map-pin" size={13} color="#94a3b8" />
                  <Text style={s.metaText}>{project.location}</Text>
                </View>
              ) : null}
              {project.rera_number ? (
                <View style={s.metaRow}>
                  <Feather name="shield" size={13} color="#94a3b8" />
                  <Text style={s.metaText}>RERA: {project.rera_number}</Text>
                </View>
              ) : null}
            </View>

            <View style={s.statusBar}>
              {(
                [
                  { label: 'Available', count: stats.available, color: STATUS_COLOR.Available },
                  { label: 'Booked', count: stats.booked, color: STATUS_COLOR.Booked },
                  { label: 'Sold', count: stats.sold, color: STATUS_COLOR.Sold },
                ] as const
              ).map(({ label, count, color }) => (
                <View key={label} style={s.statusItem}>
                  <View style={[s.dot, { backgroundColor: color }]} />
                  <Text style={s.statusLabel}>{label}</Text>
                  <Text style={[s.statusCount, { color }]}>{count}</Text>
                </View>
              ))}
            </View>

            <FlatList
              data={units}
              keyExtractor={(u) => u.id}
              numColumns={2}
              columnWrapperStyle={s.colWrap}
              contentContainerStyle={s.unitList}
              ListEmptyComponent={
                <View style={s.center}>
                  <Text style={s.centerText}>No units added yet</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={[s.unitCard, { borderColor: STATUS_COLOR[item.status], backgroundColor: STATUS_BG[item.status] }]}>
                  <View style={s.unitTop}>
                    <Text style={s.unitNumber}>#{item.unit_number}</Text>
                    <View style={[s.dot, { backgroundColor: STATUS_COLOR[item.status] }]} />
                  </View>
                  <Text style={s.unitPrice}>{formatINR(item.price)}</Text>
                  <Text style={s.unitSqft}>{item.sq_ft.toLocaleString()} sqft</Text>
                  {item.facing ? <Text style={s.unitFacing}>{item.facing}</Text> : null}
                  <View style={[s.statusPill, { backgroundColor: STATUS_COLOR[item.status] + '22' }]}>
                    <Text style={[s.statusPillText, { color: STATUS_COLOR[item.status] }]}>{item.status}</Text>
                  </View>
                </View>
              )}
            />
          </>
        )}
      </SafeAreaView>
    );
  }

  const projects = projectsQuery.data ?? [];

  if (projectsQuery.isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color={ORANGE} /></View>
      </SafeAreaView>
    );
  }

  if (projectsQuery.isError) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.centerText}>Could not load projects</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => projectsQuery.refetch()}>
            <Text style={s.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.listHeader}>
        <View>
          <Text style={s.listHeaderTitle}>My Projects</Text>
          <Text style={s.listHeaderSub}>{projects.length} assigned</Text>
        </View>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={s.list}
        onRefresh={() => projectsQuery.refetch()}
        refreshing={projectsQuery.isFetching}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Feather name="folder" size={48} color="#cbd5e1" />
            <Text style={s.emptyTitle}>No projects yet</Text>
            <Text style={s.emptyHint}>Projects assigned to you will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => openDetail(item.id)} activeOpacity={0.8}>
            <View style={s.cardRow}>
              <View style={s.cardLeft}>
                <Text style={s.cardType}>{item.project_type.toUpperCase()}</Text>
                <Text style={s.cardName}>{item.project_name}</Text>
                <View style={s.locationRow}>
                  <Feather name="map-pin" size={12} color="#94a3b8" />
                  <Text style={s.cardLocation}>{item.location}</Text>
                </View>
              </View>
              <View style={s.chevronWrap}>
                <Feather name="chevron-right" size={18} color="#94a3b8" />
              </View>
            </View>

            <View style={s.summaryRow}>
              {(
                [
                  { label: 'Avail', count: item.unitSummary.available, color: STATUS_COLOR.Available },
                  { label: 'Booked', count: item.unitSummary.booked, color: STATUS_COLOR.Booked },
                  { label: 'Sold', count: item.unitSummary.sold, color: STATUS_COLOR.Sold },
                ] as const
              ).map(({ label, count, color }) => (
                <View key={label} style={[s.summaryChip, { backgroundColor: color + '14' }]}>
                  <View style={[s.dot, { backgroundColor: color }]} />
                  <Text style={[s.summaryText, { color }]}>{count} {label}</Text>
                </View>
              ))}
            </View>

            <UnitBar summary={item.unitSummary} />
          </TouchableOpacity>
        )}
      />
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40, paddingTop: 80 },
  centerText: { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20, textAlign: 'center' },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: ORANGE },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  listHeader: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5',
  },
  listHeaderTitle: { fontSize: 22, fontWeight: '900', color: '#0a0f1c' },
  listHeaderSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  list: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 20, padding: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.06, shadowRadius: 12, elevation: 2,
  },
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 14 },
  cardLeft: { flex: 1 },
  cardType: { fontSize: 10, fontWeight: '700', color: ORANGE, letterSpacing: 0.8, marginBottom: 4 },
  cardName: { fontSize: 17, fontWeight: '800', color: '#0a0f1c', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  cardLocation: { fontSize: 12, color: '#94a3b8' },
  chevronWrap: { width: 28, height: 28, borderRadius: 10, backgroundColor: '#f8fafc', alignItems: 'center', justifyContent: 'center' },
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  summaryChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 },
  summaryText: { fontSize: 11, fontWeight: '700' },
  dot: { width: 7, height: 7, borderRadius: 3.5 },
  // Detail
  pageHeader: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 16, paddingBottom: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5', gap: 12,
  },
  backBtn: {
    width: 36, height: 36, borderRadius: 12, backgroundColor: '#f1f5f9',
    alignItems: 'center', justifyContent: 'center',
  },
  pageTitle: { flex: 1, fontSize: 20, fontWeight: '800', color: '#0a0f1c' },
  projectMeta: {
    backgroundColor: '#fff', paddingHorizontal: 20, paddingVertical: 12,
    gap: 6, borderBottomWidth: 1, borderBottomColor: '#e8edf5',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 13, color: '#64748b' },
  statusBar: {
    flexDirection: 'row', paddingHorizontal: 20, paddingVertical: 14,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5', gap: 24,
  },
  statusItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  statusLabel: { fontSize: 12, color: '#64748b' },
  statusCount: { fontSize: 15, fontWeight: '800' },
  unitList: { padding: 12, paddingBottom: 40 },
  colWrap: { gap: 10, marginBottom: 10 },
  unitCard: { flex: 1, borderRadius: 16, borderWidth: 1.5, padding: 12 },
  unitTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  unitNumber: { fontSize: 14, fontWeight: '800', color: '#0a0f1c' },
  unitPrice: { fontSize: 13, fontWeight: '700', color: '#0a0f1c', marginBottom: 2 },
  unitSqft: { fontSize: 11, color: '#94a3b8', marginBottom: 2 },
  unitFacing: { fontSize: 11, color: '#94a3b8', marginBottom: 6 },
  statusPill: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  statusPillText: { fontSize: 10, fontWeight: '700' },
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0a0f1c', marginTop: 16, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
