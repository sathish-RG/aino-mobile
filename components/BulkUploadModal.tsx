import { useState } from 'react';
import {
  View, Text, StyleSheet, Modal, Pressable, TouchableOpacity,
  ActivityIndicator, ScrollView, Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import { useQueryClient } from '@tanstack/react-query';
import api from '@/src/api/client';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CsvRowData {
  name: string; type: string; location: string;
  rera?: string; ownerPhone?: string; block?: string;
  approvalAuthority?: string; approvalNumber?: string;
}

interface ParsedRow {
  row: number; data: CsvRowData; valid: boolean; errors: string[];
}

interface CreateResult {
  created: number; failed: number;
  failures: { index: number; name: string; error: string }[];
}

type Step = 'upload' | 'preview' | 'creating' | 'done';

const GREEN = '#1e3c6e';
const RED   = '#ef4444';

// ─── CSV template string shown to the user ────────────────────────────────────

const TEMPLATE_COLS =
  'Name, Type, Location, RERA Number, Owner Phone, Block/Phase, Approval Authority, Approval Number';

// ─── Row preview card ─────────────────────────────────────────────────────────

function RowCard({ row }: { row: ParsedRow }) {
  const accent = row.valid ? GREEN : RED;
  return (
    <View style={[rc.card, { borderLeftColor: accent }]}>
      <View style={rc.top}>
        <View style={[rc.badge, { backgroundColor: accent + '18' }]}>
          <Feather name={row.valid ? 'check' : 'x'} size={12} color={accent} />
          <Text style={[rc.badgeText, { color: accent }]}>Row {row.row}</Text>
        </View>
        {row.valid && (
          <Text style={rc.type} numberOfLines={1}>{row.data.type}</Text>
        )}
      </View>

      {row.valid ? (
        <>
          <Text style={rc.name} numberOfLines={1}>{row.data.name}</Text>
          <Text style={rc.sub} numberOfLines={1}>{row.data.location}</Text>
          {row.data.rera && <Text style={rc.meta}>RERA: {row.data.rera}</Text>}
        </>
      ) : (
        <View style={rc.errList}>
          {row.errors.map((e, i) => (
            <Text key={i} style={rc.errText}>• {e}</Text>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Main modal ───────────────────────────────────────────────────────────────

interface Props { visible: boolean; onClose: () => void; }

export default function BulkUploadModal({ visible, onClose }: Props) {
  const insets      = useSafeAreaInsets();
  const queryClient = useQueryClient();

  const [step, setStep]           = useState<Step>('upload');
  const [fileName, setFileName]   = useState('');
  const [fileUri, setFileUri]     = useState('');
  const [parsing, setParsing]     = useState(false);
  const [rows, setRows]           = useState<ParsedRow[]>([]);
  const [result, setResult]       = useState<CreateResult | null>(null);

  const validRows  = rows.filter((r) => r.valid);
  const invalidRows = rows.filter((r) => !r.valid);

  const reset = () => {
    setStep('upload');
    setFileName('');
    setFileUri('');
    setRows([]);
    setResult(null);
    setParsing(false);
  };

  const handleClose = () => { reset(); onClose(); };

  // ── Step 1: pick file ──────────────────────────────────────────────────────

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'application/csv', '*/*'],
        copyToCacheDirectory: true,
      });
      if (res.canceled || !res.assets?.[0]) return;
      setFileName(res.assets[0].name);
      setFileUri(res.assets[0].uri);
    } catch {
      Alert.alert('Error', 'Could not open file picker.');
    }
  };

  const parseFile = async () => {
    if (!fileUri) return;
    setParsing(true);
    try {
      const formData = new FormData();
      formData.append('file', { uri: fileUri, name: fileName, type: 'text/csv' } as any);
      const res = await api.post('/bulk/projects/parse', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setRows(res.data.data.rows);
      setStep('preview');
    } catch (e: any) {
      Alert.alert('Parse Error', e.response?.data?.message ?? 'Could not parse the CSV file.');
    } finally {
      setParsing(false);
    }
  };

  // ── Step 2: confirm creation ───────────────────────────────────────────────

  const confirmCreate = async () => {
    if (validRows.length === 0) return;
    setStep('creating');
    try {
      const res = await api.post('/bulk/projects/create', {
        rows: validRows.map((r) => r.data),
      });
      setResult(res.data.data);
      queryClient.invalidateQueries({ queryKey: ['admin-projects'] });
      setStep('done');
    } catch (e: any) {
      Alert.alert('Error', e.response?.data?.message ?? 'Could not create projects.');
      setStep('preview');
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={s.overlay}>
        <Pressable style={s.backdrop} onPress={handleClose} />
        <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <View style={[s.headerIcon, { backgroundColor: GREEN + '14' }]}>
              <Feather name="upload" size={18} color={GREEN} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={s.title}>Bulk Upload Projects</Text>
              <Text style={s.subtitle}>
                {step === 'upload'   && 'Upload a CSV file to create multiple projects at once'}
                {step === 'preview'  && `${rows.length} rows found · ${validRows.length} valid`}
                {step === 'creating' && 'Creating projects…'}
                {step === 'done'     && 'Upload complete'}
              </Text>
            </View>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Feather name="x" size={20} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {/* ── STEP: upload ── */}
          {step === 'upload' && (
            <View style={s.body}>
              {/* Template info */}
              <View style={s.templateBox}>
                <View style={s.templateHeader}>
                  <Feather name="file-text" size={13} color="#64748b" />
                  <Text style={s.templateTitle}>Expected CSV columns</Text>
                </View>
                <Text style={s.templateCols}>{TEMPLATE_COLS}</Text>
                <Text style={s.templateNote}>
                  Only Name, Type, and Location are required. All other columns are optional.
                </Text>
              </View>

              {/* File picker */}
              <TouchableOpacity style={s.pickBtn} onPress={pickFile} activeOpacity={0.8}>
                <Feather name="paperclip" size={16} color={GREEN} />
                <Text style={s.pickBtnText}>
                  {fileName || 'Choose CSV file'}
                </Text>
                {fileName ? <Feather name="check-circle" size={16} color={GREEN} /> : null}
              </TouchableOpacity>

              <TouchableOpacity
                style={[s.actionBtn, { backgroundColor: GREEN }, (!fileUri || parsing) && s.btnDisabled]}
                onPress={parseFile}
                disabled={!fileUri || parsing}
                activeOpacity={0.85}
              >
                {parsing ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <>
                    <Feather name="eye" size={16} color="#fff" />
                    <Text style={s.actionBtnText}>Preview Projects</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* ── STEP: preview ── */}
          {step === 'preview' && (
            <>
              {/* Summary chips */}
              <View style={s.summaryRow}>
                <View style={[s.chip, { backgroundColor: GREEN + '14' }]}>
                  <Feather name="check-circle" size={12} color={GREEN} />
                  <Text style={[s.chipText, { color: GREEN }]}>{validRows.length} valid</Text>
                </View>
                {invalidRows.length > 0 && (
                  <View style={[s.chip, { backgroundColor: RED + '14' }]}>
                    <Feather name="alert-circle" size={12} color={RED} />
                    <Text style={[s.chipText, { color: RED }]}>{invalidRows.length} invalid</Text>
                  </View>
                )}
              </View>

              <ScrollView style={s.previewList} contentContainerStyle={{ gap: 8, paddingBottom: 16 }}>
                {rows.map((row) => <RowCard key={row.row} row={row} />)}
              </ScrollView>

              <View style={s.previewActions}>
                <TouchableOpacity style={s.backBtn} onPress={() => setStep('upload')} activeOpacity={0.8}>
                  <Feather name="arrow-left" size={15} color="#64748b" />
                  <Text style={s.backBtnText}>Back</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.actionBtn, { flex: 1, backgroundColor: GREEN }, validRows.length === 0 && s.btnDisabled]}
                  onPress={confirmCreate}
                  disabled={validRows.length === 0}
                  activeOpacity={0.85}
                >
                  <Feather name="plus-circle" size={16} color="#fff" />
                  <Text style={s.actionBtnText}>Create {validRows.length} Project{validRows.length !== 1 ? 's' : ''}</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── STEP: creating ── */}
          {step === 'creating' && (
            <View style={s.centerBox}>
              <ActivityIndicator size="large" color={GREEN} />
              <Text style={s.creatingText}>Creating {validRows.length} projects…</Text>
            </View>
          )}

          {/* ── STEP: done ── */}
          {step === 'done' && result && (
            <View style={s.body}>
              {/* Result summary */}
              <View style={s.resultBox}>
                <View style={[s.resultItem, { backgroundColor: GREEN + '10' }]}>
                  <Feather name="check-circle" size={28} color={GREEN} />
                  <Text style={[s.resultCount, { color: GREEN }]}>{result.created}</Text>
                  <Text style={s.resultLabel}>Created</Text>
                </View>
                {result.failed > 0 && (
                  <View style={[s.resultItem, { backgroundColor: RED + '10' }]}>
                    <Feather name="x-circle" size={28} color={RED} />
                    <Text style={[s.resultCount, { color: RED }]}>{result.failed}</Text>
                    <Text style={s.resultLabel}>Failed</Text>
                  </View>
                )}
              </View>

              {result.failures.length > 0 && (
                <ScrollView style={s.failList} contentContainerStyle={{ gap: 6 }}>
                  {result.failures.map((f, i) => (
                    <View key={i} style={s.failItem}>
                      <Feather name="alert-circle" size={13} color={RED} />
                      <Text style={s.failText} numberOfLines={2}>
                        <Text style={{ fontWeight: '700' }}>{f.name}:</Text> {f.error}
                      </Text>
                    </View>
                  ))}
                </ScrollView>
              )}

              <TouchableOpacity style={[s.actionBtn, { backgroundColor: GREEN }]} onPress={handleClose} activeOpacity={0.85}>
                <Text style={s.actionBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
}

// ─── Row card styles ──────────────────────────────────────────────────────────

const rc = StyleSheet.create({
  card: {
    backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderWidth: 1, borderColor: '#e8edf5',
  },
  top:     { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  badge:   { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  type:    { fontSize: 10, color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
  name:    { fontSize: 14, fontWeight: '800', color: '#0a0f1c' },
  sub:     { fontSize: 12, color: '#64748b', marginTop: 2 },
  meta:    { fontSize: 11, color: '#94a3b8', marginTop: 3 },
  errList: { marginTop: 4, gap: 2 },
  errText: { fontSize: 12, color: '#ef4444', fontWeight: '500' },
});

// ─── Sheet styles ─────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  overlay:  { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
  sheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28, borderTopRightRadius: 28,
    maxHeight: '90%',
  },
  handle: {
    width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0',
    alignSelf: 'center', marginTop: 12, marginBottom: 16,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingBottom: 16,
    borderBottomWidth: 1, borderBottomColor: '#f1f5f9',
  },
  headerIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title:    { fontSize: 16, fontWeight: '800', color: '#0a0f1c' },
  subtitle: { fontSize: 12, color: '#64748b', marginTop: 2 },

  body: { padding: 20, gap: 14 },

  templateBox: {
    backgroundColor: '#f8fafc', borderRadius: 14,
    padding: 14, borderWidth: 1, borderColor: '#e2e8f0',
  },
  templateHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  templateTitle:  { fontSize: 12, fontWeight: '700', color: '#64748b' },
  templateCols:   { fontSize: 11, color: '#475569', fontFamily: 'monospace', lineHeight: 18 },
  templateNote:   { fontSize: 11, color: '#94a3b8', marginTop: 8 },

  pickBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    borderWidth: 1.5, borderColor: GREEN, borderRadius: 12, borderStyle: 'dashed',
    paddingHorizontal: 16, paddingVertical: 14,
  },
  pickBtnText: { flex: 1, fontSize: 14, color: GREEN, fontWeight: '600' },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 14, borderRadius: 14,
  },
  actionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnDisabled: { opacity: 0.45 },

  summaryRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20, paddingVertical: 12 },
  chip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  chipText: { fontSize: 12, fontWeight: '700' },

  previewList:    { maxHeight: 320, paddingHorizontal: 20 },
  previewActions: { flexDirection: 'row', gap: 10, paddingHorizontal: 20, paddingTop: 12 },
  backBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 14,
    paddingHorizontal: 16, paddingVertical: 14,
  },
  backBtnText: { fontSize: 14, fontWeight: '600', color: '#64748b' },

  centerBox: { padding: 48, alignItems: 'center', gap: 16 },
  creatingText: { fontSize: 15, color: '#64748b', fontWeight: '600' },

  resultBox:   { flexDirection: 'row', gap: 12 },
  resultItem:  { flex: 1, alignItems: 'center', borderRadius: 14, padding: 20, gap: 8 },
  resultCount: { fontSize: 36, fontWeight: '900' },
  resultLabel: { fontSize: 13, color: '#64748b', fontWeight: '600' },

  failList: { maxHeight: 160 },
  failItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start' },
  failText: { flex: 1, fontSize: 12, color: '#475569', lineHeight: 18 },
});
