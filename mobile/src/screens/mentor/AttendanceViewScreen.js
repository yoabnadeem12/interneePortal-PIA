import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Modal, TextInput} from 'react-native';
import client from '../../api/client';
import theme from '../../theme';

export default function AttendanceViewScreen() {
  const [interns, setInterns] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);

  const fetchInterns = async () => {
    try { const res = await client.get('/mentor/interns'); setInterns(res.data); }
    catch {} finally { setLoading(false); }
  };

  const fetchAttendance = async (internId) => {
    try {
      const url = internId
        ? `/mentor/attendance?internId=${internId}&date=${dateFilter}`
        : `/mentor/attendance?date=${dateFilter}`;
      const res = await client.get(url);
      setAttendance(res.data);
    } catch { Alert.alert('Error', 'Failed to load attendance'); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { fetchInterns(); fetchAttendance(null); }, []);

  const statusColors = {Present: theme.colors.success, Absent: theme.colors.error, PendingReview: theme.colors.warning};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Attendance Log</Text>
        <TextInput
          id="date-filter-input"
          style={styles.dateInput}
          value={dateFilter}
          onChangeText={v => setDateFilter(v)}
          onSubmitEditing={() => fetchAttendance(selectedIntern?.id)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={theme.colors.textMuted}
        />
      </View>

      {/* Intern Filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.internFilter} contentContainerStyle={{paddingHorizontal:16}}>
        <TouchableOpacity
          id="filter-all-interns"
          style={[styles.internChip, !selectedIntern && styles.internChipActive]}
          onPress={() => { setSelectedIntern(null); fetchAttendance(null); }}>
          <Text style={[styles.internChipText, !selectedIntern && styles.internChipTextActive]}>All</Text>
        </TouchableOpacity>
        {interns.map(i => (
          <TouchableOpacity key={i.id}
            id={`filter-intern-${i.id}`}
            style={[styles.internChip, selectedIntern?.id === i.id && styles.internChipActive]}
            onPress={() => { setSelectedIntern(i); fetchAttendance(i.id); }}>
            <Text style={[styles.internChipText, selectedIntern?.id === i.id && styles.internChipTextActive]}>{i.fullName.split(' ')[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary}/></View> : (
        <ScrollView contentContainerStyle={{paddingBottom: 100, flexGrow: 1}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchAttendance(selectedIntern?.id);}} tintColor={theme.colors.primary}/>}>
          {attendance.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.emptyIcon}>📭</Text><Text style={styles.emptyText}>No attendance records for {dateFilter}</Text></View>
          ) : attendance.map(a => (
            <View key={a.id} style={styles.recordCard}>
              <View style={styles.recordHeader}>
                <Text style={styles.recordName}>{a.internName}</Text>
                <View style={[styles.statusBadge, {backgroundColor:(statusColors[a.status]||theme.colors.text)+'22'}]}>
                  <Text style={[styles.statusText, {color:statusColors[a.status]||theme.colors.text}]}>{a.status}</Text>
                </View>
              </View>
              <View style={styles.recordDetails}>
                <Text style={styles.detail}>⏱ {new Date(a.timestamp).toLocaleTimeString()}</Text>
                <Text style={[styles.detail, {color: a.isInRange ? theme.colors.success : theme.colors.error}]}>
                  📍 {a.isInRange ? `In Range (${Math.round(a.distanceMeters)}m)` : `Out of Range (${Math.round(a.distanceMeters)}m)`}
                </Text>
                <Text style={[styles.detail, {color: a.faceVerified ? theme.colors.success : theme.colors.error}]}>
                  👤 Face: {a.faceVerified ? `Verified (${(a.faceConfidence*100).toFixed(0)}%)` : `Failed (${(a.faceConfidence*100).toFixed(0)}%)`}
                </Text>
                {a.notes && <Text style={styles.noteText}>📌 {a.notes}</Text>}
              </View>
            </View>
          ))}
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
  dateInput:{backgroundColor:theme.colors.card, borderRadius:10, borderWidth:1, borderColor:theme.colors.border, color:theme.colors.text, paddingHorizontal:12, paddingVertical:8, fontSize:13, width:120},
  internFilter:{maxHeight:52, paddingVertical:8},
  internChip:{paddingHorizontal:14, paddingVertical:6, backgroundColor:theme.colors.card, borderRadius:20, marginRight:8, borderWidth:1, borderColor:theme.colors.border},
  internChipActive:{backgroundColor:theme.colors.primary+'33', borderColor:theme.colors.primary},
  internChipText:{color:theme.colors.textSecondary, fontSize:12},
  internChipTextActive:{color:theme.colors.primary, fontWeight:'700'},
  emptyBox:{alignItems:'center', paddingVertical:60},
  emptyIcon:{fontSize:48, marginBottom:12},
  emptyText:{color:theme.colors.textSecondary, fontSize:15},
  recordCard:{backgroundColor:theme.colors.surface, margin:12, marginBottom:4, borderRadius:14, padding:14, borderWidth:1, borderColor:theme.colors.border},
  recordHeader:{flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginBottom:8},
  recordName:{color:theme.colors.text, fontSize:15, fontWeight:'700'},
  statusBadge:{borderRadius:6, paddingHorizontal:8, paddingVertical:4},
  statusText:{fontSize:11, fontWeight:'700'},
  recordDetails:{gap:4},
  detail:{color:theme.colors.textSecondary, fontSize:13},
  noteText:{color:theme.colors.warning, fontSize:12, fontStyle:'italic'},
});
