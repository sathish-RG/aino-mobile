import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import { useState } from 'react';
import { useAuthStore } from '@/src/stores/useAuthStore';
import api from '@/src/api/client';

const GREEN = '#066a46';
const RED = '#dc2626';

const ROLE_COLOR: Record<string, string> = {
  Admin: '#7c3aed',
  Agent: '#0284c7',
  Owner: '#ea580c',
};

const ROLE_LABEL: Record<string, string> = {
  Admin: 'ADMIN PANEL',
  Agent: 'SALES AGENT',
  Owner: 'PROPERTY OWNER',
};

function getInitials(name: string): string {
  return name.split(' ').slice(0, 2).map((w) => w[0]?.toUpperCase() ?? '').join('');
}

function MenuItem({
  icon, label, onPress, loading, destructive,
}: {
  icon: React.ComponentProps<typeof Feather>['name'];
  label: string;
  onPress: () => void;
  loading?: boolean;
  destructive?: boolean;
}) {
  const color = destructive ? RED : '#0a0f1c';
  const bg = destructive ? '#fff9f9' : '#fff';

  return (
    <TouchableOpacity
      style={[s.menuItem, { backgroundColor: bg }]}
      onPress={onPress}
      disabled={loading}
      activeOpacity={0.7}
    >
      <View style={[s.menuIconWrap, { backgroundColor: destructive ? '#fef2f2' : '#f1f5f9' }]}>
        {loading ? (
          <ActivityIndicator size="small" color={color} />
        ) : (
          <Feather name={icon} size={18} color={color} />
        )}
      </View>
      <Text style={[s.menuLabel, { color }]}>{label}</Text>
      {!loading && <Feather name="chevron-right" size={16} color={destructive ? '#fca5a5' : '#cbd5e1'} />}
    </TouchableOpacity>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [loggingOut, setLoggingOut] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const roleColor = user ? (ROLE_COLOR[user.role] ?? GREEN) : GREEN;
  const roleLabel = user ? (ROLE_LABEL[user.role] ?? user.role.toUpperCase()) : '';

  const handleLogout = () => {
    Alert.alert('Log out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log out',
        style: 'destructive',
        onPress: async () => {
          setLoggingOut(true);
          try {
            await api.post('/auth/logout');
          } catch {
            // clear local state regardless
          } finally {
            await logout();
            setLoggingOut(false);
          }
        },
      },
    ]);
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently delete your account and all associated data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Are you absolutely sure?',
              `Your account for ${user?.phone} will be permanently deleted.`,
              [
                { text: 'No, keep it', style: 'cancel' },
                {
                  text: 'Yes, delete',
                  style: 'destructive',
                  onPress: async () => {
                    setDeleting(true);
                    try {
                      await api.delete('/auth/account');
                      await logout();
                    } catch (err: any) {
                      setDeleting(false);
                      Alert.alert('Error', err.response?.data?.message ?? 'Could not delete account. Try again.');
                    }
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  if (!user) return null;

  return (
    <SafeAreaView style={[s.safe, { backgroundColor: roleColor }]} edges={['top']}>
      <ScrollView
        contentContainerStyle={s.scroll}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ── Hero banner ── */}
        <View style={[s.hero, { backgroundColor: roleColor }]}>
          <View style={s.avatarWrap}>
            <View style={s.avatarRing}>
              <Text style={s.avatarText}>{getInitials(user.name)}</Text>
            </View>
          </View>
          <Text style={s.heroRole}>{roleLabel}</Text>
          <Text style={s.heroName}>{user.name}</Text>
          <View style={s.heroPill}>
            <Feather name="phone" size={12} color="rgba(255,255,255,0.7)" />
            <Text style={s.heroPillText}>{user.phone}</Text>
          </View>
        </View>

        {/* ── Content card ── */}
        <View style={s.content}>
          <Text style={s.sectionLabel}>ACCOUNT</Text>
          <View style={s.menuGroup}>
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Feather name="user" size={16} color="#64748b" />
              </View>
              <View style={s.infoText}>
                <Text style={s.infoLabel}>Full Name</Text>
                <Text style={s.infoValue}>{user.name}</Text>
              </View>
            </View>
            <View style={s.separator} />
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Feather name="phone" size={16} color="#64748b" />
              </View>
              <View style={s.infoText}>
                <Text style={s.infoLabel}>Phone Number</Text>
                <Text style={s.infoValue}>{user.phone}</Text>
              </View>
            </View>
            <View style={s.separator} />
            <View style={s.infoRow}>
              <View style={s.infoIconWrap}>
                <Feather name="shield" size={16} color="#64748b" />
              </View>
              <View style={s.infoText}>
                <Text style={s.infoLabel}>Role</Text>
                <Text style={[s.infoValue, { color: roleColor }]}>{user.role}</Text>
              </View>
            </View>
          </View>

          <Text style={[s.sectionLabel, { marginTop: 28 }]}>ACTIONS</Text>
          <View style={s.menuGroup}>
            <MenuItem
              icon="log-out"
              label="Log out"
              onPress={handleLogout}
              loading={loggingOut}
            />
            <View style={s.separator} />
            <MenuItem
              icon="trash-2"
              label="Delete Account"
              onPress={handleDeleteAccount}
              loading={deleting}
              destructive
            />
          </View>

          <Text style={s.footerNote}>
            Deleting your account is permanent and cannot be reversed.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
  },
  avatarWrap: { marginBottom: 16 },
  avatarRing: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.22)',
    borderWidth: 2.5, borderColor: 'rgba(255,255,255,0.4)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 30, fontWeight: '900', color: '#fff' },
  heroRole: { fontSize: 10, fontWeight: '700', color: 'rgba(255,255,255,0.65)', letterSpacing: 1.5, marginBottom: 6 },
  heroName: { fontSize: 26, fontWeight: '900', color: '#fff', marginBottom: 12 },
  heroPill: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20,
  },
  heroPillText: { fontSize: 13, color: 'rgba(255,255,255,0.85)', fontWeight: '600' },
  content: {
    backgroundColor: '#f5f7fa',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 28,
    paddingBottom: 48,
  },
  sectionLabel: {
    fontSize: 11, fontWeight: '700', color: '#94a3b8',
    letterSpacing: 0.8, marginBottom: 10,
  },
  menuGroup: {
    backgroundColor: '#fff', borderRadius: 18,
    shadowColor: '#000', shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2,
    overflow: 'hidden',
  },
  separator: { height: 1, backgroundColor: '#f1f5f9', marginLeft: 60 },
  infoRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, paddingHorizontal: 16, gap: 14 },
  infoIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    backgroundColor: '#f1f5f9', alignItems: 'center', justifyContent: 'center',
  },
  infoText: { flex: 1 },
  infoLabel: { fontSize: 11, color: '#94a3b8', fontWeight: '600', letterSpacing: 0.3, marginBottom: 2 },
  infoValue: { fontSize: 15, color: '#0a0f1c', fontWeight: '600' },
  menuItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingVertical: 16, paddingHorizontal: 16, gap: 14,
  },
  menuIconWrap: {
    width: 36, height: 36, borderRadius: 11,
    alignItems: 'center', justifyContent: 'center',
  },
  menuLabel: { flex: 1, fontSize: 15, fontWeight: '600' },
  footerNote: {
    fontSize: 12, color: '#94a3b8', textAlign: 'center',
    marginTop: 20, lineHeight: 18, maxWidth: 280, alignSelf: 'center',
  },
});
