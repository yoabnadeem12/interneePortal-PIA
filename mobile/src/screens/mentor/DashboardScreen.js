import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput} from 'react-native';
import {useDispatch, useSelector} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../../api/client';
import theme from '../../theme';
import RightSidebar from '../../components/RightSidebar';

export default function MentorDashboard({navigation}) {
  const dispatch = useDispatch();
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(false);

  const fetch = async () => {
    try { const res = await client.get('/mentor/dashboard'); setDashboard(res.data); }
    catch {} finally { setLoading(false); setRefreshing(false); }
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
  const pendingTotal = (d?.pendingGatePasses || 0) + (d?.pendingCertificates || 0) + (d?.pendingIdCards || 0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{paddingBottom: 100, flexGrow: 1}}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetch();}} tintColor={theme.colors.primary}/>}>
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome, {d?.mentorName?.split(' ')[0]} 👋</Text>
          <Text style={styles.dept}>{d?.department} • Mentor</Text>
        </View>
        <TouchableOpacity id="mentor-menu-btn" onPress={() => setSidebarVisible(true)} style={styles.menuBtn}>
          <Text style={styles.menuBtnIcon}>☰</Text>
        </TouchableOpacity>
      </View>

      <RightSidebar
        visible={sidebarVisible}
        onClose={() => setSidebarVisible(false)}
        navigation={navigation}
      />

      {pendingTotal > 0 && (
        <View style={styles.alertBanner}>
          <Text style={styles.alertText}>🔔 {pendingTotal} pending approval(s) require your attention</Text>
        </View>
      )}

      <View style={styles.statsGrid}>
        {[
          {label:'Total Interns', value: d?.totalInterns ?? 0, icon:'👨‍🎓', color:theme.colors.primary},
          {label:'Active', value: d?.activeInterns ?? 0, icon:'✅', color:theme.colors.success},
          {label:'Gate Passes', value: d?.pendingGatePasses ?? 0, icon:'🎫', color:theme.colors.warning},
          {label:'Certificates', value: d?.pendingCertificates ?? 0, icon:'🎓', color:theme.colors.info},
        ].map((s, i) => (
          <View key={i} style={[styles.statCard, {borderTopColor:s.color}]}>
            <Text style={styles.statIcon}>{s.icon}</Text>
            <Text style={[styles.statVal, {color:s.color}]}>{s.value}</Text>
            <Text style={styles.statLabel}>{s.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.sectionTitle}>Actions</Text>
      {[
        {icon:'➕', label:'Add New Intern', onPress:() => navigation.navigate('CreateIntern')},
        {icon:'📍', label:'View Attendance', onPress:() => navigation.navigate('AttendanceView')},
        {icon:'📝', label:'Assign Tasks', onPress:() => navigation.navigate('Tasks')},
        {icon:'🎫', label:'Gate Pass Requests', badge: d?.pendingGatePasses, onPress:() => navigation.navigate('GatePassApproval')},
        {icon:'🎓', label:'Certificate Requests', badge: d?.pendingCertificates, onPress:() => navigation.navigate('MentorCerts')},
      ].map((a, i) => (
        <TouchableOpacity key={i} id={`mentor-action-${i}`} style={styles.actionRow} onPress={a.onPress}>
          <Text style={styles.actionIcon}>{a.icon}</Text>
          <Text style={styles.actionLabel}>{a.label}</Text>
          <View style={styles.actionRight}>
            {a.badge > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{a.badge}</Text></View>}
            <Text style={styles.chevron}>›</Text>
          </View>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container:{flex:1, backgroundColor:theme.colors.background},
  center:{flex:1, justifyContent:'center', alignItems:'center', backgroundColor:theme.colors.background},
  header:{flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:48, paddingBottom:16},
  greeting:{color:theme.colors.text, fontSize:22, fontWeight:'700'},
  dept:{color:theme.colors.textMuted, fontSize:12, marginTop:2},
  menuBtn:{backgroundColor:theme.colors.surface, borderRadius:10, width:42, height:42, justifyContent:'center', alignItems:'center', borderWidth:1, borderColor:theme.colors.border},
  menuBtnIcon:{color:theme.colors.primary, fontSize:22, fontWeight:'700'},
  alertBanner:{backgroundColor:theme.colors.warning+'22', marginHorizontal:16, borderRadius:12, padding:14, marginBottom:12, borderWidth:1, borderColor:theme.colors.warning},
  alertText:{color:theme.colors.warning, fontWeight:'600', fontSize:14},
  statsGrid:{flexDirection:'row', flexWrap:'wrap', justifyContent:'space-between', paddingHorizontal:16, marginBottom:8},
  statCard:{width:'48%', backgroundColor:theme.colors.surface, borderRadius:16, padding:16, borderTopWidth:3, alignItems:'center', marginBottom:12, borderWidth:1, borderColor:theme.colors.border},
  statIcon:{fontSize:28, marginBottom:6},
  statVal:{fontSize:28, fontWeight:'800'},
  statLabel:{color:theme.colors.textSecondary, fontSize:11, marginTop:4, textAlign:'center'},
  sectionTitle:{color:theme.colors.text, fontSize:16, fontWeight:'700', marginHorizontal:20, marginTop:8, marginBottom:12},
  actionRow:{flexDirection:'row', alignItems:'center', backgroundColor:theme.colors.surface, marginHorizontal:16, marginBottom:8, borderRadius:14, padding:16, borderWidth:1, borderColor:theme.colors.border},
  actionIcon:{fontSize:22, marginRight:14},
  actionLabel:{flex:1, color:theme.colors.text, fontSize:15, fontWeight:'600'},
  actionRight:{flexDirection:'row', alignItems:'center', gap:8},
  badge:{backgroundColor:theme.colors.warning, borderRadius:10, minWidth:20, height:20, justifyContent:'center', alignItems:'center', paddingHorizontal:6},
  badgeText:{color:'#fff', fontSize:11, fontWeight:'700'},
  chevron:{color:theme.colors.textMuted, fontSize:24},
});
