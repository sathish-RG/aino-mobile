import { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ActivityIndicator,
  Alert,
  Share,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import QRCode from 'react-native-qrcode-svg';
import api from '@/src/api/client';

interface Project {
  id: string;
  project_name: string;
  project_type: string;
  location: string;
  rera_number: string | null;
}

interface GeneratedLink {
  projectName: string;
  clientName: string;
  shareToken: string;
  shareUrl: string;
}

const GREEN = '#1e3c6e';
const BLUE = '#1e3c6e';

export default function ShareScreen() {
  const insets = useSafeAreaInsets();

  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [clientName, setClientName] = useState('');
  const [clientPhone, setClientPhone] = useState('');
  const [generating, setGenerating] = useState(false);

  const [link, setLink] = useState<GeneratedLink | null>(null);
  const [copied, setCopied] = useState(false);

  const { data: projects = [], isLoading, isError, refetch } = useQuery<Project[]>({
    queryKey: ['published-projects'],
    queryFn: () => api.get('/projects').then((r) => r.data.data),
  });

  const openClientSheet = (project: Project) => {
    setSelectedProject(project);
    setClientName('');
    setClientPhone('');
  };

  const closeClientSheet = () => {
    setSelectedProject(null);
    setClientName('');
    setClientPhone('');
  };

  const handleGenerate = async () => {
    if (!selectedProject) return;
    const name = clientName.trim();
    const digits = clientPhone.trim();
    if (!name) return Alert.alert('Required', 'Please enter the client name.');
    if (!digits || digits.length < 10) return Alert.alert('Required', 'Please enter a valid 10-digit phone number.');
    const phone = '+91' + digits;

    setGenerating(true);
    try {
      const { data } = await api.post('/leads/generate', {
        projectId: selectedProject.id, clientName: name, clientPhone: phone,
      });
      setLink({
        projectName: selectedProject.project_name,
        clientName: name,
        shareToken: data.data.shareToken,
        shareUrl: data.data.shareUrl,
      });
      closeClientSheet();
    } catch (err: any) {
      Alert.alert('Error', err.response?.data?.message ?? 'Could not generate link.');
    } finally {
      setGenerating(false);
    }
  };

  const handleCopy = async () => {
    if (!link) return;
    await Clipboard.setStringAsync(link.shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShare = () => {
    if (!link) return;
    Share.share({ message: link.shareUrl, url: link.shareUrl });
  };

  const closeShareSheet = () => { setLink(null); setCopied(false); };

  if (isLoading) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}><ActivityIndicator size="large" color={BLUE} /></View>
      </SafeAreaView>
    );
  }

  if (isError) {
    return (
      <SafeAreaView style={s.safe} edges={['top']}>
        <View style={s.center}>
          <Feather name="wifi-off" size={40} color="#cbd5e1" />
          <Text style={s.centerText}>Could not load projects</Text>
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
        <Text style={s.headerTitle}>Share Projects</Text>
        <Text style={s.headerSub}>Select a project to generate a client link</Text>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(item) => item.id}
        contentContainerStyle={s.list}
        ListEmptyComponent={
          <View style={s.emptyBox}>
            <Feather name="folder" size={48} color="#cbd5e1" />
            <Text style={s.emptyTitle}>No projects available</Text>
            <Text style={s.emptyHint}>Published projects will appear here</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={s.card}>
            <View style={s.cardBody}>
              <Text style={s.cardType}>{item.project_type.toUpperCase()}</Text>
              <Text style={s.cardName}>{item.project_name}</Text>
              <View style={s.locationRow}>
                <Feather name="map-pin" size={12} color="#94a3b8" />
                <Text style={s.cardLocation}>{item.location}</Text>
              </View>
              {item.rera_number ? (
                <View style={s.reraRow}>
                  <Feather name="shield" size={11} color="#94a3b8" />
                  <Text style={s.rera}>RERA: {item.rera_number}</Text>
                </View>
              ) : null}
            </View>
            <TouchableOpacity style={s.genBtn} onPress={() => openClientSheet(item)} activeOpacity={0.8}>
              <Feather name="link-2" size={14} color="#fff" />
              <Text style={s.genBtnText}>Share with Client</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      {/* Step 1: Client info sheet */}
      <Modal
        visible={selectedProject !== null}
        transparent
        animationType="slide"
        onRequestClose={closeClientSheet}
      >
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
          <View style={s.modalOuter}>
            <Pressable style={s.backdrop} onPress={closeClientSheet} />
            <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
              <View style={s.handle} />

              <View style={s.sheetIcon}>
                <Feather name="user-plus" size={22} color={BLUE} />
              </View>
              <Text style={s.sheetTitle}>{selectedProject?.project_name}</Text>
              <Text style={s.sheetSub}>Enter client details to generate a unique tracking link</Text>

              <View style={s.formGroup}>
                <Text style={s.label}>CLIENT NAME</Text>
                <View style={s.inputRow}>
                  <Feather name="user" size={15} color="#94a3b8" style={s.inputIcon} />
                  <TextInput
                    style={s.input}
                    placeholder="e.g. Ravi Kumar"
                    placeholderTextColor="#94a3b8"
                    value={clientName}
                    onChangeText={setClientName}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={s.formGroup}>
                <Text style={s.label}>CLIENT MOBILE</Text>
                <View style={s.inputRow}>
                  <Feather name="phone" size={15} color="#94a3b8" style={s.inputIcon} />
                  <Text style={s.dialCode}>+91</Text>
                  <View style={s.dialDiv} />
                  <TextInput
                    style={s.input}
                    placeholder="XXXXX XXXXX"
                    placeholderTextColor="#94a3b8"
                    value={clientPhone}
                    onChangeText={(v) => setClientPhone(v.replace(/\D/g, '').slice(0, 10))}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                    onSubmitEditing={handleGenerate}
                  />
                </View>
              </View>

              <TouchableOpacity
                style={[s.generateBtn, generating && s.generateBtnDisabled]}
                onPress={handleGenerate}
                disabled={generating}
                activeOpacity={0.8}
              >
                {generating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Feather name="link-2" size={16} color="#fff" />
                    <Text style={s.generateBtnText}>Generate Unique Link</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={s.cancelBtn} onPress={closeClientSheet}>
                <Text style={s.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Step 2: Share link sheet */}
      <Modal
        visible={link !== null}
        transparent
        animationType="slide"
        onRequestClose={closeShareSheet}
      >
        <View style={s.modalOuter}>
          <Pressable style={s.backdrop} onPress={closeShareSheet} />
          <View style={[s.sheet, { paddingBottom: insets.bottom + 24 }]}>
            <View style={s.handle} />

            <View style={s.sheetIcon}>
              <Feather name="check-circle" size={22} color={GREEN} />
            </View>
            <Text style={s.sheetTitle}>{link?.projectName}</Text>
            <Text style={s.sheetSub}>
              Unique link for{' '}
              <Text style={{ fontWeight: '800', color: '#0a0f1c' }}>{link?.clientName}</Text>
            </Text>

            <View style={s.qrContainer}>
              {link?.shareUrl ? (
                <QRCode value={link.shareUrl} size={180} color="#000000" backgroundColor="#ffffff" />
              ) : null}
            </View>

            <View style={s.urlStrip}>
              <Feather name="link" size={13} color="#94a3b8" />
              <Text style={s.urlText} numberOfLines={1} ellipsizeMode="middle">{link?.shareUrl}</Text>
            </View>

            <View style={s.actions}>
              <TouchableOpacity
                style={[s.copyBtn, copied && s.copyBtnDone]}
                onPress={handleCopy}
                activeOpacity={0.8}
              >
                <Feather name={copied ? 'check' : 'copy'} size={16} color={copied ? GREEN : '#0a0f1c'} />
                <Text style={[s.copyBtnText, copied && { color: GREEN }]}>
                  {copied ? 'Copied!' : 'Copy Link'}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity style={s.shareActionBtn} onPress={handleShare} activeOpacity={0.8}>
                <Feather name="share-2" size={16} color="#fff" />
                <Text style={s.shareActionBtnText}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={s.doneBtn} onPress={closeShareSheet}>
              <Text style={s.doneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#f5f7fa' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  centerText: { fontSize: 15, color: '#64748b', marginTop: 12, marginBottom: 20 },
  retryBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12, backgroundColor: BLUE },
  retryText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  header: {
    paddingHorizontal: 20, paddingTop: 20, paddingBottom: 16,
    backgroundColor: '#fff', borderBottomWidth: 1, borderBottomColor: '#e8edf5',
  },
  headerTitle: { fontSize: 22, fontWeight: '900', color: '#0a0f1c' },
  headerSub: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  list: { padding: 16, gap: 14, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
  },
  cardBody: { padding: 18 },
  cardType: { fontSize: 10, fontWeight: '700', color: BLUE, letterSpacing: 0.8, marginBottom: 4 },
  cardName: { fontSize: 17, fontWeight: '800', color: '#0a0f1c', marginBottom: 8 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  cardLocation: { fontSize: 13, color: '#64748b' },
  reraRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  rera: { fontSize: 11, color: '#94a3b8' },
  genBtn: {
    backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 6, paddingVertical: 14,
    marginHorizontal: 16, marginBottom: 16, borderRadius: 12,
  },
  genBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  modalOuter: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 28, borderTopRightRadius: 28,
    padding: 24, alignItems: 'center',
    shadowColor: '#000', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.1, shadowRadius: 20, elevation: 20,
  },
  handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e2e8f0', marginBottom: 20 },
  sheetIcon: {
    width: 52, height: 52, borderRadius: 16,
    backgroundColor: '#f0f9ff', alignItems: 'center', justifyContent: 'center', marginBottom: 14,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: '#0a0f1c', textAlign: 'center', marginBottom: 4 },
  sheetSub: { fontSize: 13, color: '#64748b', marginBottom: 24, textAlign: 'center', lineHeight: 18 },
  formGroup: { width: '100%', marginBottom: 14 },
  label: { fontSize: 10, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 6 },
  inputRow: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#e2e8f0', borderRadius: 12,
    backgroundColor: '#f8fafc', height: 52, overflow: 'hidden',
  },
  inputIcon: { paddingHorizontal: 14 },
  dialCode: { paddingHorizontal: 10, fontSize: 15, fontWeight: '700', color: '#0a0f1c' },
  dialDiv: { width: 1, height: 28, backgroundColor: '#e2e8f0' },
  input: { flex: 1, fontSize: 15, color: '#0a0f1c', fontWeight: '500', paddingRight: 14 },
  generateBtn: {
    width: '100%', backgroundColor: BLUE, flexDirection: 'row', alignItems: 'center',
    justifyContent: 'center', gap: 8, paddingVertical: 15, borderRadius: 14, marginTop: 6,
  },
  generateBtnDisabled: { opacity: 0.6 },
  generateBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  cancelBtn: { width: '100%', paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  cancelBtnText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  qrContainer: {
    padding: 16, backgroundColor: '#fff', borderRadius: 18,
    borderWidth: 1, borderColor: '#e8edf5', marginBottom: 18,
  },
  urlStrip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, backgroundColor: '#f8fafc',
    borderRadius: 12, width: '100%', marginBottom: 18,
  },
  urlText: { flex: 1, fontSize: 12, color: '#64748b' },
  actions: { flexDirection: 'row', gap: 12, width: '100%', marginBottom: 10 },
  copyBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#f1f5f9', borderWidth: 1.5, borderColor: '#e2e8f0',
  },
  copyBtnDone: { backgroundColor: '#e8eef8', borderColor: GREEN },
  copyBtnText: { color: '#0a0f1c', fontSize: 14, fontWeight: '700' },
  shareActionBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 14, borderRadius: 12, backgroundColor: GREEN,
  },
  shareActionBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  doneBtn: { width: '100%', paddingVertical: 14, alignItems: 'center' },
  doneBtnText: { fontSize: 14, color: '#94a3b8', fontWeight: '600' },
  emptyBox: { alignItems: 'center', paddingTop: 80 },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#0a0f1c', marginTop: 16, marginBottom: 6 },
  emptyHint: { fontSize: 13, color: '#94a3b8', textAlign: 'center' },
});
