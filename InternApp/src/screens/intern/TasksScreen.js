import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, RefreshControl} from 'react-native';
import client from '../../api/client';
import theme from '../../theme';

export default function TasksScreen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState('Pending');

  const fetchTasks = async () => {
    try {
      const res = await client.get(`/intern/tasks?status=${activeFilter}`);
      setTasks(res.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchTasks(); }, [activeFilter]);

  const completeTask = async (task) => {
    Alert.alert('Complete Task', `Mark "${task.title}" as completed?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Complete', onPress: async () => {
        try {
          await client.patch(`/intern/tasks/${task.id}/complete`);
          fetchTasks();
        } catch { Alert.alert('Error', 'Failed to update task'); }
      }},
    ]);
  };

  const statusColors = {Pending: theme.colors.warning, InProgress: theme.colors.info, Completed: theme.colors.success, Overdue: theme.colors.error};
  const filters = ['Pending', 'InProgress', 'Completed'];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Tasks</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters} contentContainerStyle={{paddingHorizontal:16}}>
        {filters.map(f => (
          <TouchableOpacity key={f} id={`task-filter-${f.toLowerCase()}`}
            style={[styles.filterChip, activeFilter === f && {backgroundColor:statusColors[f]+'33', borderColor:statusColors[f]}]}
            onPress={() => {setActiveFilter(f); setLoading(true);}}>
            <Text style={[styles.filterText, activeFilter === f && {color:statusColors[f], fontWeight:'700'}]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View> : (
        <ScrollView refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchTasks();}} tintColor={theme.colors.primary}/>}>
          {tasks.length === 0 ? (
            <View style={styles.emptyBox}><Text style={styles.emptyIcon}>✅</Text><Text style={styles.emptyText}>No {activeFilter.toLowerCase()} tasks</Text></View>
          ) : tasks.map(t => (
            <View key={t.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{t.title}</Text>
                <View style={[styles.statusBadge, {backgroundColor:(statusColors[t.status]||theme.colors.text)+'22'}]}>
                  <Text style={[styles.statusText, {color:statusColors[t.status]||theme.colors.text}]}>{t.status}</Text>
                </View>
              </View>
              <Text style={styles.taskDesc}>{t.description}</Text>
              {t.deadline && <Text style={styles.taskDeadline}>📅 Due: {new Date(t.deadline).toLocaleDateString()}</Text>}
              {t.status === 'Pending' && (
                <TouchableOpacity id={`complete-task-${t.id}`} style={styles.completeBtn} onPress={() => completeTask(t)}>
                  <Text style={styles.completeBtnText}>✓ Mark Complete</Text>
                </TouchableOpacity>
              )}
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
  header:{padding:20, paddingTop:40},
  title:{color:theme.colors.text, fontSize:24, fontWeight:'700'},
  filters:{maxHeight:56, paddingVertical:8},
  filterChip:{paddingHorizontal:16, paddingVertical:6, backgroundColor:theme.colors.card, borderRadius:20, marginRight:8, borderWidth:1, borderColor:theme.colors.border},
  filterText:{color:theme.colors.textSecondary, fontSize:13},
  emptyBox:{alignItems:'center', paddingVertical:60},
  emptyIcon:{fontSize:48, marginBottom:12},
  emptyText:{color:theme.colors.textSecondary, fontSize:16},
  taskCard:{backgroundColor:theme.colors.surface, margin:12, marginBottom:4, borderRadius:16, padding:16, borderWidth:1, borderColor:theme.colors.border},
  taskHeader:{flexDirection:'row', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8},
  taskTitle:{color:theme.colors.text, fontSize:15, fontWeight:'700', flex:1, marginRight:8},
  statusBadge:{borderRadius:6, paddingHorizontal:8, paddingVertical:4},
  statusText:{fontSize:11, fontWeight:'700'},
  taskDesc:{color:theme.colors.textSecondary, fontSize:13, marginBottom:8},
  taskDeadline:{color:theme.colors.warning, fontSize:12, marginBottom:8},
  completeBtn:{backgroundColor:theme.colors.success, borderRadius:10, paddingVertical:10, alignItems:'center'},
  completeBtnText:{color:'#fff', fontWeight:'700'},
});
