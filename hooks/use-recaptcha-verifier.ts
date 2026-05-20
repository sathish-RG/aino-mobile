import { useRef } from 'react';
import { Platform } from 'react-native';
import { RecaptchaVerifier } from 'firebase/auth';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';
import { auth } from '../config/firebase';

export function useRecaptchaVerifier() {
  const nativeRef = useRef<FirebaseRecaptchaVerifierModal>(null);
  const webVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const getVerifier = (): FirebaseRecaptchaVerifierModal | RecaptchaVerifier => {
    if (Platform.OS === 'web') {
      if (!webVerifierRef.current) {
        webVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'normal',
        });
      }
      return webVerifierRef.current;
    }
    return nativeRef.current!;
  };

  const clearWebVerifier = () => {
    if (webVerifierRef.current) {
      webVerifierRef.current.clear();
      webVerifierRef.current = null;
    }
  };

  return { nativeRef, getVerifier, clearWebVerifier };
}
