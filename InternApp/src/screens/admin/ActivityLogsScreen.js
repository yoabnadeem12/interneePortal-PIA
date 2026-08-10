import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl} from 'react-native';
import client from '../../api/client';
import theme from '../../theme';

export default function ActivityLogsScreen() {
  const [logs, setLogs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  const fetchLogs = async (p = 1, reset = false) => {
    try {
      const params = new URLSearchParams({page:p, pageSize:20});
      if (selectedDept) params.append('departmentId', selectedDept.id);
      if (selectedType) params.append('logType', selectedType);
      const res = await client.get(`/admin/logs?${params}`);
      if (reset) setLogs(res.data.logs);
      else setLogs(prev => p === 1 ? res.data.logs : [...prev, ...res.data.logs]);
      setTotal(res.data.total);
    } catch { Alert.alert('Error', 'Failed to load logs'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  const fetchDepts = async () => {
    try { const r = await client.get('/admin/departments'); setDepartments(r.data); }
    catch {}
  };

  useEffect(() => { fetchDepts(); }, []);
  useEffect(() => { setPage(1); setLoading(true); fetchLogs(1, true); }, [selectedDept, selectedType]);

  const logTypeColors = {
    InternCreated: theme.colors.success, MentorCreated: theme.colors.info,
    AttendanceMarked: theme.colors.primary, GatePassApproved: theme.colors.success,
    GatePassRejected: theme.colors.error, CertificateApproved: theme.colors.success,
    CertificateRejected: theme.colors.error, TaskAssigned: theme.colors.warning,
    Login: theme.colors.textMuted, Logout: theme.colors.textMuted,
  };

  const logTypes = ['InternCreated', 'AttendanceMarked', 'GatePassApproved', 'CertificateApproved', 'TaskAssigned'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Activity Logs</Text>
        <Text style={styles.total}>{total} records</Text>
      </View>

      {/* Department Filter */}
      <Text style={styles.filterLabel}>Department:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{paddingHorizontal:16}}>
        <TouchableOpacity style={[styles.chip, !selectedDept && styles.chipActive]} onPress={() => setSelectedDept(null)}>
          <Text style={[styles.chipText, !selectedDept && styles.chipTextActive]}>All Departments</Text>
        </TouchableOpacity>
        {departments.map(d => (
          <TouchableOpacity key={d.id} style={[styles.chip, selectedDept?.id===d.id && styles.chipActive]} onPress={() => setSelectedDept(d)}>
            <Text style={[styles.chipText, selectedDept?.id===d.id && styles.chipTextActive]}>{d.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Log Type Filter */}
      <Text style={styles.filterLabel}>Type:</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{paddingHorizontal:16}}>
        <TouchableOpacity style={[styles.chip, !selectedType && styles.chipActive]} onPress={() => setSelectedType(null)}>
          <Text style={[styles.chipText, !selectedType && styles.chipTextActive]}>All Types</Text>
        </TouchableOpacity>
        {logTypes.map(t => (
          <TouchableOpacity key={t} style={[styles.chip, selectedType===t && {backgroundColor:(logTypeColors[t]||theme.colors.primary)+'33', borderColor:logTypeColors[t]||theme.colors.primary}]} onPress={() => setSelectedType(t)}>
            <Text style={[styles.chipText, selectedType===t && {color:logTypeColors[t]||theme.colors.primary, fontWeight:'700'}]}>{t.replace(/([A-Z])/g,' $1').trim()}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary}/></View> : (
        <ScrollView
          contentContainerStyle={{paddingBottom: 100, flexGrow: 1}}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchLogs(1, true);}} tintColor={theme.colors.primary}/>}
          onScroll={({nativeEvent}) => {
            const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 50 && logs.length < total) {
              const nextPage = page + 1;
              setPage(nextPage);
              fetchLogs(nextPage);
            }
          }}
          scrollEventThrottle={400}>
          {logs.map(log => (
            <View key={log.id} style={styles.logCard}>
              <View style={styles.logHeader}>
                <View style={[styles.typeBadge, {backgroundColor:(logTypeColors[log.logType]||theme.colors.primary)+'22'}]}>
                  <Text style={[styles.typeText, {color:logTypeColors[log.logType]||theme.colors.primary}]}>
                    {log.logType.replace(/([A-Z])/g,' $1').trim()}
                  </Text>
                </View>
                {log.department && (
                  <View style={styles.deptBadge}><Text style={styles.deptText}>{log.department}</Text></View>
                )}
              </View>
              <Text style={styles.logDesc}>{log.description}</Text>
              <View style={styles.logFooter}>
                {log.performedBy && <Text style={styles.logBy}>by @{log.performedBy}</Text>}
                <Text style={styles.logTime}>{new Date(log.createdAt).toLocaleString()}</Text>
              </View>
            </View>
          ))}
          {logs.length < total && <ActivityIndicator color={theme.colors.primary} style={{marginVertical:16}}/>}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1, backgroundColor:theme.colors.background},
  center:{flex:1, justifyContent:'center', alignItems:'center'},
  header:{flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:48, paddingBottom:12},
  title:{color:theme.colors.text, fontSize:22, fontWeight:'700'},
  total:{color:theme.colors.textMuted, fontSize:13},
  filterLabel:{color:theme.colors.textSecondary, fontSize:12, fontWeight:'600', marginLeft:16, marginTop:8},
  filterRow:{maxHeight:48, paddingVertical:6},
  chip:{paddingHorizontal:14, paddingVertical:5, backgroundColor:theme.colors.card, borderRadius:20, marginRight:8, borderWidth:1, borderColor:theme.colors.border},
  chipActive:{backgroundColor:theme.colors.primary+'33', borderColor:theme.colors.primary},
  chipText:{color:theme.colors.textSecondary, fontSize:12},
  chipTextActive:{color:theme.colors.primary, fontWeight:'700'},
  logCard:{backgroundColor:theme.colors.surface, margin:10, marginBottom:4, borderRadius:12, padding:14, borderWidth:1, borderColor:theme.colors.border},
  logHeader:{flexDirection:'row', justifyContent:'space-between', marginBottom:6},
  typeBadge:{borderRadius:6, paddingHorizontal:8, paddingVertical:3},
  typeText:{fontSize:11, fontWeight:'700'},
  deptBadge:{backgroundColor:theme.colors.accent+'22', borderRadius:6, paddingHorizontal:8, paddingVertical:3},
  deptText:{color:theme.colors.accent, fontSize:11, fontWeight:'600'},
  logDesc:{color:theme.colors.text, fontSize:13, marginBottom:6},
  logFooter:{flexDirection:'row', justifyContent:'space-between'},
  logBy:{color:theme.colors.primary, fontSize:11},
  logTime:{color:theme.colors.textMuted, fontSize:11},
});
