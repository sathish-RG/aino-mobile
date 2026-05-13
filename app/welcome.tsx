import React from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, SafeAreaView, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

const { width } = Dimensions.get('window');

export default function WelcomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.container}>
        {/* Header Logo */}
        <View style={styles.header}>
          <Text style={styles.logoText}>AINO</Text>
        </View>

        {/* Main Card */}
        <View style={styles.card}>
          {/* Image Header with Badge */}
          <View style={styles.imageContainer}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?q=80&w=1000&auto=format&fit=crop' }} 
              style={styles.cardImage}
              resizeMode="cover"
            />
            
            {/* Floating Badge */}
            <View style={styles.badge}>
              <View style={styles.badgeIconContainer}>
                <Feather name="bar-chart-2" size={14} color="#000" />
              </View>
              <View>
                <Text style={styles.badgeSubtitle}>PORTFOLIO YIELD</Text>
                <Text style={styles.badgeTitle}>+12.4%</Text>
              </View>
            </View>
          </View>

          {/* Content */}
          <View style={styles.cardContent}>
            <Text style={styles.title}>Elevate Your{'\n'}Estate{'\n'}Management</Text>
            <Text style={styles.subtitle}>
              Institutional-grade tools for{'\n'}modern property portfolios.
            </Text>

            <TouchableOpacity 
              style={styles.buttonPrimary} 
              activeOpacity={0.8}
              onPress={() => router.push('/register')}
            >
              <Text style={styles.buttonPrimaryText}>Get Started</Text>
              <Feather name="arrow-right" size={18} color="#ffffff" />
            </TouchableOpacity>

            <View style={styles.loginRow}>
              <Text style={styles.loginText}>Already have an account? </Text>
              <TouchableOpacity onPress={() => router.push('/login')}>
                <Text style={styles.loginLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>TRUSTED BY 500+ TOP AGENCIES</Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 24,
  },
  header: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  logoText: {
    fontSize: 24,
    fontWeight: '900',
    color: '#000000',
    letterSpacing: -0.5,
  },
  card: {
    backgroundColor: '#ffffff',
    width: width * 0.88,
    borderRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
    elevation: 5,
  },
  imageContainer: {
    width: '100%',
    height: 200,
    position: 'relative',
    alignItems: 'center',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  badge: {
    position: 'absolute',
    bottom: -30,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingHorizontal: 20,
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    width: '80%',
  },
  badgeIconContainer: {
    backgroundColor: '#5be5a2',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeSubtitle: {
    fontSize: 10,
    fontWeight: '700',
    color: '#7a8599',
    letterSpacing: 0.5,
  },
  badgeTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
  },
  cardContent: {
    paddingHorizontal: 24,
    paddingTop: 50, // Space for the badge
    paddingBottom: 32,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#5b6475',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonPrimary: {
    backgroundColor: '#066a46', // Dark green
    width: '100%',
    height: 56,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 20,
  },
  buttonPrimaryText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  loginRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loginText: {
    color: '#5b6475',
    fontSize: 14,
  },
  loginLink: {
    color: '#000000',
    fontSize: 14,
    fontWeight: '700',
  },
  footer: {
    marginTop: 20,
  },
  footerText: {
    color: '#8a95a5',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.5,
  },
});
