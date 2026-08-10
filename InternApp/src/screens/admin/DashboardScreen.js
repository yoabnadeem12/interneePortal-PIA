import React, {useState, useEffect} from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../../api/client';
import theme from '../../theme';
import RightSidebar from '../../components/RightSidebar';

export default function AdminDashboard({navigation}) {
  const dispatch = useDispatch();
  const {profile} = useSelector(s => s.auth);
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const fetchDashboard = async () => {
    try {
      const res = await client.get('/admin/dashboard');
      setDashboard(res.data);
    } catch (e) {
      Alert.alert('Error', 'Failed to load dashboard');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {fetchDashboard();}, []);

  const handleLogout = async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    try { await client.post('/auth/logout', {refreshToken}); } catch {}
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
    dispatch(logout());
  };

  if (loading) {
    return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;
  }

  const stats = [
    {label: 'Mentors', value: dashboard?.totalMentors ?? 0, icon: '👨‍💼', color: theme.colors.primary},
    {label: 'Total Interns', value: dashboard?.totalInterns ?? 0, icon: '🎓', color: theme.colors.info},
    {label: 'Active Interns', value: dashboard?.activeInterns ?? 0, icon: '✅', color: theme.colors.success},
    {label: 'Departments', value: dashboard?.totalDepartments ?? 0, icon: '🏢', color: theme.colors.accent},
  ];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={{paddingBottom: 100, flexGrow: 1}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchDashboard();}} tintColor={theme.colors.primary} />}>

      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Admin Panel</Text>
          <Text style={styles.subtitle}>PIA Intern Management System</Text>
        </View>
        <TouchableOpacity id="admin-menu-btn" onPress={() => setSidebarVisible(true)} style={styles.menuBtn}>
          <Text style={styles.menuBtnIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      <RightSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
      />

      {/* Stats Grid */}
      <View style={styles.statsGrid}>
        {stats.map((s, i) => (
          <View key={i} style={[styles.statCard, {borderTopColor: s.color}]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statValue, {color: s.color}]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      {/* Quick Actions */}
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      <View style={styles.actionsGrid}>
        {[
          {label: 'Manage Mentors', icon: '👨‍💼', screen: 'MentorManagement'},
          {label: 'View Interns', icon: '🎓', screen: 'AdminInterns'},
          {label: 'Activity Logs', icon: '📋', screen: 'ActivityLogs'},
          {label: 'Departments', icon: '🏢', screen: 'Departments'},
        ].map((a, i) => (
          <TouchableOpacity
            key={i}
            id={`admin-action-${a.screen.toLowerCase()}`}
            style={styles.actionCard}
            onPress={() => navigation.navigate(a.screen)}>
            <Text style={styles.actionIcon}>{a.icon}</Text>
            <Text style={styles.actionLabel}>{a.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Recent Activity */}
      <Text style={styles.sectionTitle}>Recent Activity</Text>
      {dashboard?.recentActivity?.map(log => (
        <View key={log.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <Text style={styles.logType}>{log.logType}</Text>
            {log.department && <View style={styles.deptBadge}><Text style={styles.deptText}>{log.department}</Text></View>}
          </View>
          <Text style={styles.logDesc}>{log.description}</Text>
          <Text style={styles.logTime}>{new Date(log.createdAt).toLocaleString()}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background},
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: 48, paddingBottom: 16,
  },
  greeting: {color: theme.colors.text, fontSize: 22, fontWeight: '700'},
  subtitle: {color: theme.colors.textMuted, fontSize: 12, marginTop: 2},
  menuBtn: {
    backgroundColor: theme.colors.surface, borderRadius: 10, width: 42, height: 42,
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border,
  },
  menuBtnIcon: {color: theme.colors.primary, fontSize: 22, fontWeight: '700'},
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    paddingHorizontal: 16, marginBottom: 8,
  },
  statCard: {
    width: '48%', backgroundColor: theme.colors.surface,
    borderRadius: 16, padding: 16, borderTopWidth: 3, alignItems: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border,
  },
  statIcon: {fontSize: 28, marginBottom: 6},
  statValue: {fontSize: 28, fontWeight: '800'},
  statLabel: {color: theme.colors.textSecondary, fontSize: 11, marginTop: 4, textAlign: 'center'},
  sectionTitle: {
    color: theme.colors.text, fontSize: 16, fontWeight: '700',
    marginHorizontal: 20, marginTop: 12, marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  actionCard: {
    width: '48%', backgroundColor: theme.colors.surface,
    borderRadius: 16, padding: 16, alignItems: 'center',
    marginBottom: 12, borderWidth: 1, borderColor: theme.colors.border,
  },
  actionIcon: {fontSize: 32, marginBottom: 8},
  actionLabel: {color: theme.colors.text, fontSize: 13, fontWeight: '600', textAlign: 'center'},
  logCard: {
    backgroundColor: theme.colors.surface, marginHorizontal: 16, marginBottom: 8,
    borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.border,
  },
  logHeader: {flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4},
  logType: {color: theme.colors.primary, fontSize: 12, fontWeight: '700'},
  deptBadge: {
    backgroundColor: theme.colors.card, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2,
  },
  deptText: {color: theme.colors.accent, fontSize: 10, fontWeight: '600'},
  logDesc: {color: theme.colors.textSecondary, fontSize: 13},
  logTime: {color: theme.colors.textMuted, fontSize: 11, marginTop: 4},
});
