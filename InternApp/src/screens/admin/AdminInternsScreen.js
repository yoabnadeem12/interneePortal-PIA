import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl} from 'react-native';
import client from '../../api/client';
import theme from '../../theme';

export default function AdminInternsScreen() {
  const [interns, setInterns] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      const [internsRes, deptsRes] = await Promise.all([
        client.get(selectedDept ? `/admin/interns?departmentId=${selectedDept.id}` : '/admin/interns'),
        client.get('/admin/departments'),
      ]);
      setInterns(internsRes.data);
      setDepartments(deptsRes.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, [selectedDept]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Interns ({interns.length})</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{paddingHorizontal:16}}>
        <TouchableOpacity style={[styles.chip, !selectedDept && styles.chipActive]} onPress={() => setSelectedDept(null)}>
          <Text style={[styles.chipText, !selectedDept && styles.chipTextActive]}>All Depts</Text>
        </TouchableOpacity>
        {departments.map(d => (
          <TouchableOpacity key={d.id} style={[styles.chip, selectedDept?.id===d.id && styles.chipActive]} onPress={() => setSelectedDept(d)}>
            <Text style={[styles.chipText, selectedDept?.id===d.id && styles.chipTextActive]}>{d.name}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary}/></View> : (
        <ScrollView contentContainerStyle={{paddingBottom: 100, flexGrow: 1}} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} tintColor={theme.colors.primary}/>}>
          {interns.map(i => (
            <View key={i.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatarBox}><Text style={styles.avatarText}>{i.fullName[0]}</Text></View>
                <View style={styles.cardInfo}>
                  <Text style={styles.name}>{i.fullName}</Text>
                  <Text style={styles.sub}>{i.department} • {i.mentor}</Text>
                  <Text style={styles.sub2}>@{i.username}</Text>
                </View>
                <View style={[styles.badge, {backgroundColor: i.isExpired ? theme.colors.error+'22' : i.isActive ? theme.colors.success+'22' : theme.colors.error+'22'}]}>
                  <Text style={[styles.badgeText, {color: i.isExpired ? theme.colors.error : i.isActive ? theme.colors.success : theme.colors.error}]}>
                    {i.isExpired ? 'Expired' : i.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>
              <View style={styles.period}>
                <Text style={styles.periodText}>📅 {new Date(i.startDate).toLocaleDateString()} → {new Date(i.endDate).toLocaleDateString()}</Text>
                <Text style={styles.faceText}>{i.faceEnrolled ? '👤 Face Enrolled' : '⚠️ No Face'}</Text>
              </View>
              {i.university && <Text style={styles.uni}>🎓 {i.degree} • {i.university}</Text>}
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
  header:{paddingHorizontal:20, paddingTop:48, paddingBottom:12},
  title:{color:theme.colors.text, fontSize:22, fontWeight:'700'},
  filterRow:{maxHeight:52, paddingVertical:8},
  chip:{paddingHorizontal:14, paddingVertical:6, backgroundColor:theme.colors.card, borderRadius:20, marginRight:8, borderWidth:1, borderColor:theme.colors.border},
  chipActive:{backgroundColor:theme.colors.primary+'33', borderColor:theme.colors.primary},
  chipText:{color:theme.colors.textSecondary, fontSize:12},
  chipTextActive:{color:theme.colors.primary, fontWeight:'700'},
  card:{backgroundColor:theme.colors.surface, margin:12, marginBottom:4, borderRadius:14, padding:14, borderWidth:1, borderColor:theme.colors.border},
  cardTop:{flexDirection:'row', alignItems:'center', marginBottom:8},
  avatarBox:{width:44, height:44, borderRadius:22, backgroundColor:theme.colors.primary, justifyContent:'center', alignItems:'center', marginRight:12},
  avatarText:{color:'#fff', fontSize:18, fontWeight:'700'},
  cardInfo:{flex:1},
  name:{color:theme.colors.text, fontSize:15, fontWeight:'700'},
  sub:{color:theme.colors.textSecondary, fontSize:12},
  sub2:{color:theme.colors.textMuted, fontSize:11},
  badge:{borderRadius:6, paddingHorizontal:8, paddingVertical:4},
  badgeText:{fontSize:11, fontWeight:'700'},
  period:{flexDirection:'row', justifyContent:'space-between', marginBottom:4},
  periodText:{color:theme.colors.textMuted, fontSize:12},
  faceText:{color:theme.colors.textMuted, fontSize:12},
  uni:{color:theme.colors.textMuted, fontSize:12},
});
