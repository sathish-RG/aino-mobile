import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

const { width, height } = Dimensions.get('window');

export default function LogoutModal() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <BlurView intensity={20} tint="dark" style={StyleSheet.absoluteFill} />
      
      <TouchableOpacity 
        style={styles.backdropPress} 
        activeOpacity={1} 
        onPress={() => router.back()} 
      />

      <View style={styles.sheet}>
        <View style={styles.handleBar} />
        
        <View style={styles.iconContainer}>
          <Feather name="log-out" size={24} color="#000" />
        </View>
        
        <Text style={styles.title}>Logout</Text>
        <Text style={styles.subtitle}>
          Are you sure you want to end your{'\n'}current session?
        </Text>

        <TouchableOpacity 
          style={styles.buttonPrimary} 
          activeOpacity={0.8}
          onPress={() => {
            // Add actual logout logic here
            router.dismissAll();
            router.push('/login');
          }}
        >
          <Text style={styles.buttonPrimaryText}>Confirm Logout</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.buttonSecondary} 
          activeOpacity={0.8}
          onPress={() => router.back()}
        >
          <Text style={styles.buttonSecondaryText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdropPress: {
    flex: 1,
    width: '100%',
  },
  sheet: {
    backgroundColor: '#ffffff',
    width: width,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: '#e2e8f0',
    borderRadius: 2,
    marginBottom: 32,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 14,
    color: '#5b6475',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
  },
  buttonPrimary: {
    backgroundColor: '#066a46',
    width: '100%',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
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
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#cbd5e1',
  },
  buttonSecondaryText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '600',
  },
});
