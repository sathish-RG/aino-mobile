import { useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { app } from '@/config/firebase';
import { setConfirmation } from '@/src/lib/phoneAuth';

type Role = 'Agent' | 'Owner';

const GREEN = '#1e3c6e';

const ROLE_CONFIG: Record<Role, { icon: React.ComponentProps<typeof Feather>['name']; desc: string }> = {
  Agent: { icon: 'briefcase', desc: 'List & manage properties' },
  Owner: { icon: 'home', desc: 'Own & track projects' },
};

export default function RegisterScreen() {
  const router = useRouter();
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>('Agent');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleSendOtp = async () => {
    if (!name.trim()) return Alert.alert('Required', 'Full name is required.');
    if (!phone.trim()) return Alert.alert('Required', 'Phone number is required.');
    const fullPhone = '+91' + phone.trim();
    try {
      setLoading(true);
      const result = await firebase
        .auth()
        .signInWithPhoneNumber(fullPhone, recaptchaVerifier.current!);
      setConfirmation(result);
      router.push({
        pathname: '/(auth)/otp' as any,
        params: { phone: fullPhone, name: name.trim(), email: email.trim(), role, mode: 'register' },
      });
    } catch (err: any) {
      Alert.alert('Failed', err.message ?? 'Could not send OTP. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FirebaseRecaptchaVerifierModal
        ref={recaptchaVerifier}
        firebaseConfig={app.options}
        attemptInvisibleVerification
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={s.scroll}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* ── Hero ── */}
          <View style={s.hero}>
            <TouchableOpacity style={s.back} onPress={() => router.back()}>
              <Feather name="arrow-left" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={s.heroTitle}>Create Account</Text>
            <Text style={s.heroSub}>Join AINO Real Estate Platform</Text>
          </View>

          {/* ── Form card ── */}
          <View style={s.card}>
            <InputField
              label="FULL NAME"
              icon="user"
              placeholder="John Doe"
              value={name}
              onChangeText={setName}
              focused={focusedField === 'name'}
              onFocus={() => setFocusedField('name')}
              onBlur={() => setFocusedField(null)}
              autoFocus
            />
            <InputField
              label="PHONE NUMBER"
              icon="phone"
              placeholder="XXXXX XXXXX"
              value={phone}
              onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
              keyboardType="phone-pad"
              focused={focusedField === 'phone'}
              onFocus={() => setFocusedField('phone')}
              onBlur={() => setFocusedField(null)}
              dialPrefix="+91"
            />
            <InputField
              label="EMAIL (optional)"
              icon="mail"
              placeholder="john@example.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              focused={focusedField === 'email'}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
            />

            <Text style={s.label}>I AM A...</Text>
            <View style={s.roleRow}>
              {(['Agent', 'Owner'] as Role[]).map((r) => {
                const cfg = ROLE_CONFIG[r];
                const active = role === r;
                return (
                  <TouchableOpacity
                    key={r}
                    style={[s.roleCard, active && s.roleCardActive]}
                    onPress={() => setRole(r)}
                    activeOpacity={0.8}
                  >
                    <View style={[s.roleIcon, active && s.roleIconActive]}>
                      <Feather name={cfg.icon} size={18} color={active ? '#fff' : '#64748b'} />
                    </View>
                    <Text style={[s.roleLabel, active && s.roleLabelActive]}>{r}</Text>
                    <Text style={[s.roleDesc, active && s.roleDescActive]}>{cfg.desc}</Text>
                    {active && (
                      <View style={s.roleCheck}>
                        <Feather name="check" size={12} color="#fff" />
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            <TouchableOpacity
              style={[s.btn, loading && s.btnOff]}
              onPress={handleSendOtp}
              disabled={loading}
              activeOpacity={0.87}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.btnText}>Send OTP to Verify</Text>
                  <View style={s.btnCircle}>
                    <Feather name="arrow-right" size={15} color={GREEN} />
                  </View>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={s.loginLink}
              onPress={() => router.push('/(auth)/login' as any)}
            >
              <Text style={s.loginLinkText}>
                Already have an account?{' '}
                <Text style={{ color: GREEN, fontWeight: '700' }}>Sign In</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({
  label,
  icon,
  placeholder,
  value,
  onChangeText,
  keyboardType,
  autoCapitalize,
  autoFocus,
  focused,
  onFocus,
  onBlur,
  dialPrefix,
}: {
  label: string;
  icon: React.ComponentProps<typeof Feather>['name'];
  placeholder: string;
  value: string;
  onChangeText: (v: string) => void;
  keyboardType?: any;
  autoCapitalize?: any;
  autoFocus?: boolean;
  focused: boolean;
  onFocus: () => void;
  onBlur: () => void;
  dialPrefix?: string;
}) {
  return (
    <View style={s.fieldGroup}>
      <Text style={s.label}>{label}</Text>
      <View style={[s.inputRow, focused && s.inputRowFocused]}>
        <View style={s.inputIcon}>
          <Feather name={icon} size={16} color={focused ? GREEN : '#94a3b8'} />
        </View>
        {dialPrefix ? (
          <>
            <Text style={s.dialCode}>{dialPrefix}</Text>
            <View style={s.dialDiv} />
          </>
        ) : null}
        <TextInput
          style={s.input}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize ?? 'words'}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onBlur={onBlur}
        />
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GREEN },
  scroll: { flexGrow: 1 },
  hero: {
    paddingTop: 16,
    paddingBottom: 36,
    paddingHorizontal: 24,
  },
  back: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: { fontSize: 30, fontWeight: '900', color: '#fff', marginBottom: 6 },
  heroSub: { fontSize: 14, color: 'rgba(255,255,255,0.68)' },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 48,
  },
  fieldGroup: { marginBottom: 18 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 56,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    overflow: 'hidden',
  },
  inputRowFocused: { borderColor: GREEN, backgroundColor: '#fff' },
  inputIcon: {
    width: 50,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
  },
  dialCode: { paddingHorizontal: 10, fontSize: 15, fontWeight: '700', color: '#0a0f1c' },
  dialDiv: { width: 1, height: 28, backgroundColor: '#e2e8f0' },
  input: { flex: 1, paddingHorizontal: 14, fontSize: 15, color: '#0a0f1c', fontWeight: '500' },
  roleRow: { flexDirection: 'row', gap: 12, marginBottom: 28 },
  roleCard: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    padding: 14,
    alignItems: 'flex-start',
    position: 'relative',
  },
  roleCardActive: { borderColor: GREEN, backgroundColor: '#edfaf4' },
  roleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  roleIconActive: { backgroundColor: GREEN },
  roleLabel: { fontSize: 15, fontWeight: '800', color: '#0a0f1c', marginBottom: 3 },
  roleLabelActive: { color: GREEN },
  roleDesc: { fontSize: 11, color: '#94a3b8', lineHeight: 15 },
  roleDescActive: { color: '#2d9166' },
  roleCheck: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: GREEN,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btn: {
    height: 58,
    borderRadius: 14,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 4,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  btnOff: { opacity: 0.55, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  btnCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginLink: { paddingVertical: 20, alignItems: 'center' },
  loginLinkText: { fontSize: 14, color: '#64748b' },
});
