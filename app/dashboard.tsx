import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';

export default function DashboardScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Feather name="menu" size={24} color="#000" />
          <Text style={styles.logoText}>AINO</Text>
        </View>
        <View style={styles.headerRight}>
          <Feather name="bell" size={20} color="#000" />
          <Feather name="settings" size={20} color="#000" />
          <TouchableOpacity 
            style={styles.avatarPlaceholder}
            onPress={() => router.push('/logout')}
          >
            <Feather name="user" size={16} color="#fff" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.pageTitle}>Overview</Text>
        <Text style={styles.pageSubtitle}>Portfolio health and active management metrics.</Text>

        <TouchableOpacity style={styles.addButton}>
          <Feather name="plus" size={16} color="#ffffff" />
          <Text style={styles.addButtonText}>Add Property</Text>
        </TouchableOpacity>

        {/* Dummy Chart Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>REVENUE PERFORMANCE</Text>
            <Text style={styles.cardStat}>+12.5%</Text>
          </View>
          <View style={styles.chartPlaceholder}>
            <Text style={styles.placeholderText}>Financial Visualization Chart</Text>
          </View>
        </View>

        {/* Dummy Stats Card */}
        <View style={styles.card}>
          <Text style={styles.largeStat}>84%</Text>
          <Text style={styles.cardTitle}>OCCUPANCY RATE</Text>
          <View style={styles.progressBarBg}>
            <View style={styles.progressBarFill} />
          </View>
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f8f9fb',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#000000',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  avatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    padding: 20,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 8,
  },
  pageSubtitle: {
    fontSize: 14,
    color: '#5b6475',
    marginBottom: 24,
  },
  addButton: {
    backgroundColor: '#066a46',
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 32,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  cardTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: '#5b6475',
    letterSpacing: 0.5,
  },
  cardStat: {
    fontSize: 12,
    fontWeight: '700',
    color: '#066a46',
  },
  chartPlaceholder: {
    height: 150,
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  largeStat: {
    fontSize: 32,
    fontWeight: '800',
    color: '#000000',
    marginBottom: 4,
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#f1f5f9',
    borderRadius: 4,
    marginTop: 16,
    overflow: 'hidden',
  },
  progressBarFill: {
    width: '84%',
    height: '100%',
    backgroundColor: '#066a46',
    borderRadius: 4,
  },
});
