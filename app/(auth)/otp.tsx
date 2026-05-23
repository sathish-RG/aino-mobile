import { useRef, useState, useEffect } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import { app } from '@/config/firebase';
import api from '@/src/api/client';
import { useAuthStore } from '@/src/stores/useAuthStore';
import type { AuthUser } from '@/src/stores/useAuthStore';
import { getConfirmation, setConfirmation, clearConfirmation } from '@/src/lib/phoneAuth';

const DIGIT_COUNT = 6;
const GREEN = '#1e3c6e';

export default function OtpScreen() {
  const { phone, name, email, role, mode } = useLocalSearchParams<{
    phone: string; name?: string; email?: string; role?: string; mode?: string;
  }>();
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const isRegister = mode === 'register';

  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(''));
  const [loading, setLoading] = useState(false);
  const inputs = useRef<Array<TextInput | null>>(Array(DIGIT_COUNT).fill(null));
  const resendRecaptcha = useRef<FirebaseRecaptchaVerifierModal>(null);

  useEffect(() => {
    const t = setTimeout(() => inputs.current[0]?.focus(), 100);
    return () => clearTimeout(t);
  }, []);

  const filled = digits.filter(Boolean).length;

  const updateDigit = (value: string, index: number) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = digit;
    setDigits(next);
    if (digit && index < DIGIT_COUNT - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const next = [...digits];
      next[index - 1] = '';
      setDigits(next);
      inputs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const otp = digits.join('');
    if (otp.length < DIGIT_COUNT) return Alert.alert('Incomplete', 'Enter all 6 digits.');
    const confirmation = getConfirmation();
    if (!confirmation) return Alert.alert('Session expired', 'Go back and request a new code.');

    try {
      setLoading(true);
      const credential = await confirmation.confirm(otp);
      const firebaseIdToken = await credential.user.getIdToken();
      clearConfirmation();

      if (isRegister) {
        await api.post('/auth/firebase-verify', { firebaseIdToken, name, email: email || undefined, role });
        Alert.alert(
          'Registration Successful!',
          'Your account is pending admin approval.',
          [{ text: 'Go to Login', onPress: () => router.replace('/(auth)/login' as any) }],
        );
      } else {
        const { data } = await api.post('/auth/verify-otp', { firebaseIdToken });
        const { accessToken, refreshToken, user } = data as {
          accessToken: string; refreshToken: string; user: AuthUser;
        };
        await setAuth(user, accessToken, refreshToken);
        const dest =
          user.role === 'Admin' ? '/(admin)/dashboard' :
          user.role === 'Agent' ? '/(agent)/dashboard' : '/(owner)/dashboard';
        router.replace(dest as any);
      }
    } catch (err: any) {
      if (err.code === 'auth/invalid-verification-code') {
        Alert.alert('Wrong code', 'Please check and try again.');
      } else if (err.code === 'auth/code-expired') {
        Alert.alert('Expired', 'Code expired. Request a new one.');
      } else {
        const status = err.response?.status;
        const message = err.response?.data?.message;
        if (status === 403) Alert.alert('Pending Approval', message ?? 'Awaiting admin approval.');
        else if (status === 404 && err.response?.data?.requiresRegistration) {
          Alert.alert('Not Registered', 'No account found. Please register.', [
            { text: 'Register', onPress: () => router.replace('/(auth)/register' as any) },
          ]);
        } else Alert.alert('Error', message ?? 'Verification failed. Try again.');
      }
      setDigits(Array(DIGIT_COUNT).fill(''));
      inputs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    try {
      const result = await firebase.auth().signInWithPhoneNumber(phone, resendRecaptcha.current!);
      setConfirmation(result);
      setDigits(Array(DIGIT_COUNT).fill(''));
      inputs.current[0]?.focus();
      Alert.alert('Sent', 'A new OTP has been sent.');
    } catch {
      Alert.alert('Error', 'Could not resend OTP. Try again.');
    }
  };

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <FirebaseRecaptchaVerifierModal
        ref={resendRecaptcha}
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
            <View style={s.shieldWrap}>
              <Feather name="shield" size={32} color="#fff" />
            </View>
            <Text style={s.heroTitle}>Verify Phone</Text>
            <View style={s.phonePill}>
              <Feather name="phone" size={12} color={GREEN} />
              <Text style={s.phonePillText}>{phone}</Text>
            </View>
          </View>

          {/* ── Form card ── */}
          <View style={s.card}>
            <Text style={s.cardTitle}>
              {isRegister ? 'Verify & Register' : 'Enter your code'}
            </Text>
            <Text style={s.cardSub}>
              We sent a 6-digit code to your phone number
            </Text>

            {/* ── Digit boxes ── */}
            <View style={s.boxRow}>
              {digits.map((digit, i) => (
                <TextInput
                  key={i}
                  ref={(el) => { inputs.current[i] = el; }}
                  style={[s.box, digit ? s.boxFilled : null, loading && s.boxLoading]}
                  value={digit}
                  onChangeText={(v) => updateDigit(v, i)}
                  onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                  keyboardType="number-pad"
                  maxLength={1}
                  selectTextOnFocus
                  textAlign="center"
                  caretHidden={Platform.OS !== 'web'}
                  editable={!loading}
                />
              ))}
            </View>

            {/* Progress dots */}
            <View style={s.progressRow}>
              {Array(DIGIT_COUNT).fill(0).map((_, i) => (
                <View
                  key={i}
                  style={[s.dot, i < filled ? s.dotFilled : null]}
                />
              ))}
            </View>

            <TouchableOpacity
              style={[s.btn, (loading || filled < DIGIT_COUNT) && s.btnOff]}
              onPress={handleVerify}
              disabled={loading || filled < DIGIT_COUNT}
              activeOpacity={0.87}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={s.btnText}>
                    {isRegister ? 'Verify & Register' : 'Verify & Login'}
                  </Text>
                  <Feather name={isRegister ? 'user-check' : 'log-in'} size={18} color="#fff" />
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={s.resendRow} onPress={handleResend} disabled={loading}>
              <Text style={s.resendText}>
                Didn&#39;t receive it?{'  '}
                <Text style={s.resendLink}>Resend code</Text>
              </Text>
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
    paddingTop: 16,
    paddingBottom: 40,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  back: {
    alignSelf: 'flex-start',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  shieldWrap: {
    width: 72,
    height: 72,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.18)',
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', marginBottom: 14 },
  phonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#fff',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  phonePillText: { fontSize: 13, fontWeight: '700', color: GREEN },
  card: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 36,
    borderTopRightRadius: 36,
    paddingHorizontal: 28,
    paddingTop: 36,
    paddingBottom: 48,
    flex: 1,
  },
  cardTitle: { fontSize: 22, fontWeight: '800', color: '#0a0f1c', marginBottom: 6 },
  cardSub: { fontSize: 14, color: '#64748b', lineHeight: 20, marginBottom: 36 },
  boxRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  box: {
    width: 50,
    height: 62,
    borderWidth: 1.5,
    borderColor: '#e2e8f0',
    borderRadius: 14,
    fontSize: 28,
    fontWeight: '800',
    color: '#0a0f1c',
    backgroundColor: '#f8fafc',
  },
  boxFilled: { borderColor: GREEN, backgroundColor: '#edfaf4', color: GREEN },
  boxLoading: { opacity: 0.5 },
  progressRow: { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 36 },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#e2e8f0' },
  dotFilled: { backgroundColor: GREEN },
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
    marginBottom: 20,
  },
  btnOff: { opacity: 0.45, shadowOpacity: 0 },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  resendRow: { alignItems: 'center', paddingVertical: 8 },
  resendText: { fontSize: 14, color: '#64748b' },
  resendLink: { color: GREEN, fontWeight: '700' },
});
