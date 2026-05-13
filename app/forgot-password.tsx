import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [step, setStep] = useState(1); // 1: Enter Phone, 2: OTP & New PIN

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
          
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>

          <View style={styles.header}>
            <Text style={styles.titleText}>Reset PIN</Text>
            <Text style={styles.tagline}>
              {step === 1 ? "Enter your registered email address" : "Enter your OTP and set a new 6-digit PIN"}
            </Text>
          </View>

          <View style={styles.formCard}>
            
            {step === 1 ? (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <View style={styles.inputContainer}>
                    <TextInput 
                      style={styles.input}
                      placeholder="e.g. manager@aino.com"
                      placeholderTextColor="#a0aabf"
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.buttonPrimary} 
                  activeOpacity={0.8}
                  onPress={() => setStep(2)}
                >
                  <Text style={styles.buttonPrimaryText}>Send OTP</Text>
                  <Feather name="arrow-right" size={18} color="#ffffff" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>OTP CODE</Text>
                  <View style={styles.inputContainer}>
                    <TextInput 
                      style={styles.input}
                      placeholder="123456"
                      placeholderTextColor="#a0aabf"
                      keyboardType="number-pad"
                      maxLength={6}
                      textAlign="center"
                      letterSpacing={8}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>NEW 6-DIGIT PIN</Text>
                  <View style={styles.inputContainer}>
                    <TextInput 
                      style={styles.input}
                      placeholder="••••••"
                      placeholderTextColor="#a0aabf"
                      keyboardType="numeric"
                      maxLength={6}
                      secureTextEntry
                      textAlign="center"
                      letterSpacing={8}
                    />
                  </View>
                </View>

                <TouchableOpacity 
                  style={styles.buttonPrimary} 
                  activeOpacity={0.8}
                  onPress={() => router.push('/login')}
                >
                  <Text style={styles.buttonPrimaryText}>Reset PIN</Text>
                  <Feather name="check" size={18} color="#ffffff" />
                </TouchableOpacity>
                
                <TouchableOpacity 
                  style={styles.buttonSecondary} 
                  activeOpacity={0.8}
                  onPress={() => setStep(1)}
                >
                  <Text style={styles.buttonSecondaryText}>Back</Text>
                </TouchableOpacity>
              </>
            )}

          </View>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 40,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    marginBottom: 10,
  },
  header: {
    marginBottom: 30,
  },
  titleText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },
  tagline: {
    fontSize: 14,
    color: '#5b6475',
    marginTop: 8,
    lineHeight: 20,
  },
  formCard: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5b6475',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    height: 56,
    paddingHorizontal: 16,
    backgroundColor: '#ffffff',
  },
  input: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#000',
  },
  buttonPrimary: {
    backgroundColor: '#066a46',
    width: '100%',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSecondary: {
    backgroundColor: '#ffffff',
    width: '100%',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    marginTop: 12,
  },
  buttonSecondaryText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
});
