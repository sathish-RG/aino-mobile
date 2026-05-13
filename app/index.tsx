import React from 'react';
import { View, Text, StyleSheet, ImageBackground, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function SplashScreen() {
  const router = useRouter();

  return (
    <ImageBackground
      source={{ uri: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?q=80&w=2070&auto=format&fit=crop' }}
      style={styles.background}
    >
      <StatusBar style="light" />
      <View style={styles.overlay}>
        {/* Click anywhere to continue */}
        <TouchableOpacity 
          style={styles.container} 
          activeOpacity={1}
          onPress={() => router.push('/welcome')}
        >
          <View style={styles.centerContent}>
            <Text style={styles.logoText}>AINO</Text>
            <View style={styles.accentLine} />
          </View>

          <View style={styles.bottomContent}>
            <View style={styles.secureBadge}>
              <Feather name="shield" size={16} color="#ffffff" />
              <Text style={styles.secureText}>SECURE INSTITUTIONAL ACCESS</Text>
            </View>
            <View style={styles.bottomLine} />
          </View>
        </TouchableOpacity>
      </View>
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 25, 40, 0.75)', // Dark blue-ish overlay
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    color: '#ffffff',
    fontSize: 64,
    fontWeight: '800',
    letterSpacing: -1,
  },
  accentLine: {
    height: 3,
    width: 40,
    backgroundColor: '#2bdf81', // Neon green accent
    marginTop: 10,
    borderRadius: 2,
  },
  bottomContent: {
    alignItems: 'center',
    width: '100%',
  },
  secureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 24,
  },
  secureText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.5,
  },
  bottomLine: {
    height: 1,
    width: '40%',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
});
