import React, {useState, useEffect} from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator, Alert,
} from 'react-native';
import {useDispatch} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../../api/client';
import theme from '../../theme';
import RightSidebar from '../../components/RightSidebar';

export default function InternDashboard({navigation}) {
  const dispatch = useDispatch();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const fetch = async () => {
    try {
      const res = await client.get('/intern/dashboard');
      setDashboard(res.data);
    } catch { Alert.alert('Error', 'Failed to load dashboard'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetch(); }, []);

  const handleLogout = async () => {
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    try { await client.post('/auth/logout', {refreshToken}); } catch {}
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
    dispatch(logout());
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  const d = dashboard;
  const attendanceColor = d?.todayAttendance?.status === 'Present' ? theme.colors.success :
    d?.todayAttendance?.status === 'Absent' ? theme.colors.error : theme.colors.textMuted;

  const progress = d ? Math.min(100, Math.max(0,
    ((new Date() - new Date(d.startDate)) / (new Date(d.endDate) - new Date(d.startDate))) * 100
  )) : 0;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetch();}} tintColor={theme.colors.primary} />}>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.greeting}>Hello, {d?.fullName?.split(' ')[0]} 👋</Text>
          <Text style={styles.dept}>{d?.department} • {d?.mentorName}</Text>
        </View>
        <TouchableOpacity id="intern-menu-btn" onPress={() => setSidebarVisible(true)} style={styles.menuBtn}>
          <Text style={styles.menuBtnIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      <RightSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
      />

      {d?.faceEnrolled === false && (
        <View style={{backgroundColor: theme.colors.warning + '22', margin: 16, borderRadius: 12, padding: 14, borderWidth: 1, borderColor: theme.colors.warning}}>
          <Text style={{color: theme.colors.warning, fontWeight: '700', fontSize: 15}}>⚠️ First-Login Action Required</Text>
          <Text style={{color: theme.colors.textSecondary, fontSize: 13, marginTop: 4, marginBottom: 10}}>
            You must register your face profile before you can mark attendance.
          </Text>
          <TouchableOpacity
            id="register-face-btn"
            style={{backgroundColor: theme.colors.primary, borderRadius: 8, paddingVertical: 10, alignItems: 'center'}}
            onPress={() => navigation.navigate('FaceRegistration')}>
            <Text style={{color: '#fff', fontWeight: '700', fontSize: 14}}>Register Face Profile Now →</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Internship Progress Bar */}
      <View style={styles.progressCard}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Internship Progress</Text>
          <Text style={styles.progressDays}>{d?.daysLeft} days left</Text>
        </View>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, {width: `${progress}%`}]} />
        </View>
        <View style={styles.progressDates}>
          <Text style={styles.progressDate}>{d?.startDate ? new Date(d.startDate).toLocaleDateString() : ''}</Text>
          <Text style={styles.progressDate}>{d?.endDate ? new Date(d.endDate).toLocaleDateString() : ''}</Text>
        </View>
      </View>

      {/* Today Attendance */}
      <View style={[styles.attendanceCard, {borderLeftColor: attendanceColor}]}>
        <Text style={styles.attendanceLabel}>Today's Attendance</Text>
        <Text style={[styles.attendanceStatus, {color: attendanceColor}]}>
          {d?.todayAttendance?.marked ? d?.todayAttendance?.status : 'Not Marked Yet'}
        </Text>
        {d?.todayAttendance?.time && (
          <Text style={styles.attendanceTime}>
            ⏱ {new Date(d.todayAttendance.time).toLocaleTimeString()}
          </Text>
        )}
        {!d?.todayAttendance?.marked && (
          <TouchableOpacity
            id="mark-attendance-shortcut"
            style={styles.markBtn}
            onPress={() => navigation.navigate('Attendance')}>
            <Text style={styles.markBtnText}>Mark Now →</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{d?.pendingTasks ?? 0}</Text>
          <Text style={styles.statLabel}>Pending Tasks</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, {color: theme.colors.warning}]}>
            {d?.gatePass?.status ?? 'None'}
          </Text>
          <Text style={styles.statLabel}>Gate Pass</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={[styles.statValue, {color: theme.colors.info}]}>
            {d?.certificate?.status ?? 'None'}
          </Text>
          <Text style={styles.statLabel}>Certificate</Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex:1, backgroundColor:theme.colors.background},
  center: {flex:1, justifyContent:'center', alignItems:'center', backgroundColor:theme.colors.background},
  header: {flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', padding:20, paddingTop:50},
  headerLeft: {flex:1},
  greeting: {color:theme.colors.text, fontSize:22, fontWeight:'700'},
  dept: {color:theme.colors.textMuted, fontSize:13, marginTop:4},
  menuBtn: {backgroundColor: theme.colors.surface, borderRadius: 10, width: 42, height: 42, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: theme.colors.border},
  menuBtnIcon: {color: theme.colors.primary, fontSize: 22, fontWeight: '700'},
  progressCard: {backgroundColor:theme.colors.surface, margin:16, borderRadius:16, padding:16, borderWidth:1, borderColor:theme.colors.border},
  progressHeader: {flexDirection:'row', justifyContent:'space-between', marginBottom:12},
  progressTitle: {color:theme.colors.text, fontSize:15, fontWeight:'700'},
  progressDays: {color:theme.colors.primary, fontSize:14, fontWeight:'600'},
  progressBar: {height:8, backgroundColor:theme.colors.card, borderRadius:4, overflow:'hidden'},
  progressFill: {height:'100%', backgroundColor:theme.colors.primary, borderRadius:4},
  progressDates: {flexDirection:'row', justifyContent:'space-between', marginTop:8},
  progressDate: {color:theme.colors.textMuted, fontSize:11},
  attendanceCard: {backgroundColor:theme.colors.surface, marginHorizontal:16, marginBottom:12, borderRadius:16, padding:16, borderLeftWidth:4, borderWidth:1, borderColor:theme.colors.border},
  attendanceLabel: {color:theme.colors.textSecondary, fontSize:12, fontWeight:'600', textTransform:'uppercase'},
  attendanceStatus: {fontSize:22, fontWeight:'800', marginTop:4},
  attendanceTime: {color:theme.colors.textMuted, fontSize:12, marginTop:4},
  markBtn: {marginTop:12, backgroundColor:theme.colors.primary, borderRadius:10, paddingVertical:10, alignItems:'center'},
  markBtnText: {color:'#fff', fontWeight:'700'},
  statsRow: {flexDirection:'row', marginHorizontal:16, gap:8},
  statBox: {flex:1, backgroundColor:theme.colors.surface, borderRadius:12, padding:16, borderWidth:1, borderColor:theme.colors.border, alignItems:'center'},
  statValue: {color:theme.colors.text, fontSize:18, fontWeight:'800'},
  statLabel: {color:theme.colors.textMuted, fontSize:11, marginTop:4, textAlign:'center'},
});
