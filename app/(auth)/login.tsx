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
  Dimensions,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { app } from '@/config/firebase';
import { setConfirmation } from '@/src/lib/phoneAuth';

const GREEN = '#1e3c6e';
const SCREEN_H = Dimensions.get('window').height;

export default function LoginScreen() {
  const router = useRouter();
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const recaptchaVerifier = useRef<FirebaseRecaptchaVerifierModal>(null);

  const handleSendOtp = async () => {
    const digits = phone.trim();
    if (!digits) return Alert.alert('Required', 'Enter your phone number.');
    const fullPhone = '+91' + digits;
    try {
      setLoading(true);
      const result = await firebase
        .auth()
        .signInWithPhoneNumber(fullPhone, recaptchaVerifier.current!);
      setConfirmation(result);
      router.push({ pathname: '/(auth)/otp' as any, params: { phone: fullPhone } });
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
            <View style={s.logoCard}>
              <Image
                source={require('@/assets/images/aino-logo.png')}
                style={s.logoImage}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* ── Form card ── */}
          <View style={s.card}>
            <Text style={s.title}>Welcome back</Text>
            <Text style={s.subtitle}>Sign in with your phone number</Text>

            <Text style={s.label}>PHONE NUMBER</Text>
            <View style={[s.inputRow, focused && s.inputRowFocused]}>
              <View style={s.inputIcon}>
                <Feather name="phone" size={16} color={focused ? GREEN : '#94a3b8'} />
              </View>
              <Text style={s.dialCode}>+91</Text>
              <View style={s.dialDiv} />
              <TextInput
                style={s.input}
                placeholder="XXXXX XXXXX"
                placeholderTextColor="#94a3b8"
                keyboardType="phone-pad"
                value={phone}
                onChangeText={(v) => setPhone(v.replace(/\D/g, '').slice(0, 10))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                returnKeyType="done"
                onSubmitEditing={handleSendOtp}
                autoFocus
              />
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
                  <Text style={s.btnText}>Send OTP</Text>
                  <View style={s.btnCircle}>
                    <Feather name="arrow-right" size={15} color={GREEN} />
                  </View>
                </>
              )}
            </TouchableOpacity>

            <View style={s.orRow}>
              <View style={s.orLine} />
              <Text style={s.orText}>or</Text>
              <View style={s.orLine} />
            </View>

            <TouchableOpacity
              style={s.outlineBtn}
              onPress={() => router.push('/(auth)/register' as any)}
              activeOpacity={0.8}
            >
              <Text style={s.outlineBtnText}>Create an Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: GREEN },
  scroll: { flexGrow: 1 },
  hero: {
    alignItems: 'center',
    paddingTop: 52,
    paddingBottom: 48,
    paddingHorizontal: 24,
  },
  logoCard: {
    width: 180,
    height: 180,
    borderRadius: 36,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
    elevation: 12,
  },
  logoImage: {
    width: 148,
    height: 148,
  },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 48,
    minHeight: SCREEN_H * 0.56,
  },
  title: { fontSize: 26, fontWeight: '800', color: '#0a0f1c', marginBottom: 6 },
  subtitle: { fontSize: 14, color: '#64748b', lineHeight: 21, marginBottom: 32 },
  label: { fontSize: 11, fontWeight: '700', color: '#94a3b8', letterSpacing: 0.8, marginBottom: 8 },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 58,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    backgroundColor: '#f8fafc',
    marginBottom: 24,
    overflow: 'hidden',
  },
  inputRowFocused: { borderColor: GREEN, backgroundColor: '#fff' },
  inputIcon: {
    width: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#e2e8f0',
    height: '100%',
  },
  dialCode: { paddingHorizontal: 10, fontSize: 15, fontWeight: '700', color: '#0a0f1c' },
  dialDiv: { width: 1, height: 28, backgroundColor: '#e2e8f0' },
  input: { flex: 1, paddingHorizontal: 14, fontSize: 16, color: '#0a0f1c', fontWeight: '500' },
  btn: {
    height: 58,
    borderRadius: 14,
    backgroundColor: GREEN,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: GREEN,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 14,
    elevation: 6,
  },
  btnOff: { opacity: 0.55, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.2 },
  btnCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  orRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginVertical: 24 },
  orLine: { flex: 1, height: 1, backgroundColor: '#e8edf5' },
  orText: { fontSize: 13, color: '#94a3b8', fontWeight: '600' },
  outlineBtn: {
    height: 58,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f8fafc',
  },
  outlineBtnText: { fontSize: 15, fontWeight: '700', color: '#0a0f1c' },
});
