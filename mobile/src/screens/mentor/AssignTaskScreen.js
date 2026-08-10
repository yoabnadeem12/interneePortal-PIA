import React, {useState, useEffect} from 'react';
import {View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, TextInput, RefreshControl} from 'react-native';
import client from '../../api/client';
import theme from '../../theme';

export default function AssignTaskScreen() {
  const [interns, setInterns] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedIntern, setSelectedIntern] = useState(null);
  const [form, setForm] = useState({title:'', description:'', deadline:''});
  const [assigning, setAssigning] = useState(false);
  const [filterInternId, setFilterInternId] = useState(null);

  const fetchData = async () => {
    try {
      const [internsRes, tasksRes] = await Promise.all([
        client.get('/mentor/interns'),
        client.get(filterInternId ? `/mentor/tasks?internId=${filterInternId}` : '/mentor/tasks'),
      ]);
      setInterns(internsRes.data);
      setTasks(tasksRes.data);
    } catch {} finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, [filterInternId]);

  const assignTask = async () => {
    if (!selectedIntern || !form.title || !form.description) {
      Alert.alert('Required', 'Select intern, title and description'); return;
    }
    setAssigning(true);
    try {
      await client.post('/mentor/tasks', {
        internId: selectedIntern.id, ...form,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
      });
      Alert.alert('✅ Task Assigned', `Task assigned to ${selectedIntern.fullName}`);
      setShowModal(false);
      setForm({title:'', description:'', deadline:''});
      setSelectedIntern(null);
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed');
    } finally { setAssigning(false); }
  };

  const statusColors = {Pending:theme.colors.warning, InProgress:theme.colors.info, Completed:theme.colors.success, Overdue:theme.colors.error};

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Task Management</Text>
        <TouchableOpacity id="assign-task-btn" style={styles.addBtn} onPress={() => setShowModal(true)}>
          <Text style={styles.addBtnText}>+ Assign Task</Text>
        </TouchableOpacity>
      </View>

      {/* Intern filter */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow} contentContainerStyle={{paddingHorizontal:16}}>
        <TouchableOpacity style={[styles.chip, !filterInternId && styles.chipActive]} onPress={() => setFilterInternId(null)}>
          <Text style={[styles.chipText, !filterInternId && styles.chipTextActive]}>All</Text>
        </TouchableOpacity>
        {interns.map(i => (
          <TouchableOpacity key={i.id} style={[styles.chip, filterInternId===i.id && styles.chipActive]} onPress={() => setFilterInternId(i.id)}>
            <Text style={[styles.chipText, filterInternId===i.id && styles.chipTextActive]}>{i.fullName.split(' ')[0]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {loading ? <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary}/></View> : (
        <ScrollView contentContainerStyle={{paddingBottom: 100, flexGrow: 1}}>
          {tasks.map(t => (
            <View key={t.id} style={styles.taskCard}>
              <View style={styles.taskHeader}>
                <Text style={styles.taskTitle}>{t.title}</Text>
                <View style={[styles.statusBadge, {backgroundColor:(statusColors[t.status]||theme.colors.text)+'22'}]}>
                  <Text style={[styles.statusText, {color:statusColors[t.status]||theme.colors.text}]}>{t.status}</Text>
                </View>
              </View>
              <Text style={styles.internName}>👤 {t.internName}</Text>
              <Text style={styles.taskDesc}>{t.description}</Text>
              {t.deadline && <Text style={styles.deadline}>📅 {new Date(t.deadline).toLocaleDateString()}</Text>}
            </View>
          ))}
        </ScrollView>
      )}

      <Modal visible={showModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Assign Task</Text>
              <Text style={styles.fieldLabel}>Select Intern *</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
                {interns.map(i => (
                  <TouchableOpacity key={i.id} style={[styles.internChip, selectedIntern?.id===i.id && styles.internChipActive]} onPress={() => setSelectedIntern(i)}>
                    <Text style={[styles.internChipText, selectedIntern?.id===i.id && styles.internChipTextActive]}>{i.fullName}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {[
                {key:'title', label:'Task Title *', placeholder:'Design landing page'},
                {key:'description', label:'Description *', placeholder:'Detailed task description...', multi:true},
                {key:'deadline', label:'Deadline (YYYY-MM-DD)', placeholder:'2026-08-30'},
              ].map(f => (
                <View key={f.key} style={styles.formField}>
                  <Text style={styles.fieldLabel}>{f.label}</Text>
                  <TextInput
                    id={`task-${f.key}`}
                    style={[styles.fieldInput, f.multi && styles.textArea]}
                    placeholder={f.placeholder}
                    placeholderTextColor={theme.colors.textMuted}
                    multiline={f.multi}
                    numberOfLines={f.multi ? 3 : 1}
                    value={form[f.key]}
                    onChangeText={v => setForm(p => ({...p, [f.key]:v}))}
                  />
                </View>
              ))}
              <View style={styles.modalActions}>
                <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowModal(false)}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity id="assign-task-submit" style={styles.createBtn} onPress={assignTask} disabled={assigning}>
                  {assigning ? <ActivityIndicator color="#fff"/> : <Text style={styles.createBtnText}>Assign</Text>}
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container:{flex:1, backgroundColor:theme.colors.background},
  center:{flex:1, justifyContent:'center', alignItems:'center'},
  header:{flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:48, paddingBottom:12},
  title:{color:theme.colors.text, fontSize:22, fontWeight:'700'},
  addBtn:{backgroundColor:theme.colors.primary, borderRadius:10, paddingHorizontal:14, paddingVertical:8},
  addBtnText:{color:'#fff', fontWeight:'700', fontSize:13},
  filterRow:{maxHeight:52, paddingVertical:8},
  chip:{paddingHorizontal:14, paddingVertical:6, backgroundColor:theme.colors.card, borderRadius:20, marginRight:8, borderWidth:1, borderColor:theme.colors.border},
  chipActive:{backgroundColor:theme.colors.primary+'33', borderColor:theme.colors.primary},
  chipText:{color:theme.colors.textSecondary, fontSize:12},
  chipTextActive:{color:theme.colors.primary, fontWeight:'700'},
  taskCard:{backgroundColor:theme.colors.surface, margin:12, marginBottom:4, borderRadius:14, padding:14, borderWidth:1, borderColor:theme.colors.border},
  taskHeader:{flexDirection:'row', justifyContent:'space-between', marginBottom:4},
  taskTitle:{color:theme.colors.text, fontSize:15, fontWeight:'700', flex:1, marginRight:8},
  statusBadge:{borderRadius:6, paddingHorizontal:8, paddingVertical:4},
  statusText:{fontSize:11, fontWeight:'700'},
  internName:{color:theme.colors.primary, fontSize:13, marginBottom:4},
  taskDesc:{color:theme.colors.textSecondary, fontSize:13},
  deadline:{color:theme.colors.warning, fontSize:12, marginTop:4},
  // Modal
  modalOverlay:{flex:1, backgroundColor:'rgba(0,0,0,0.7)'},
  modalContent:{backgroundColor:theme.colors.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, marginTop:'auto'},
  modalTitle:{color:theme.colors.text, fontSize:18, fontWeight:'700', marginBottom:16},
  fieldLabel:{color:theme.colors.textSecondary, fontSize:12, fontWeight:'600', marginBottom:6},
  formField:{marginBottom:12},
  fieldInput:{backgroundColor:theme.colors.card, borderRadius:10, borderWidth:1, borderColor:theme.colors.border, color:theme.colors.text, paddingHorizontal:14, paddingVertical:12, fontSize:14},
  textArea:{height:80, textAlignVertical:'top'},
  internChip:{paddingHorizontal:12, paddingVertical:8, backgroundColor:theme.colors.card, borderRadius:10, marginRight:8, borderWidth:1, borderColor:theme.colors.border},
  internChipActive:{backgroundColor:theme.colors.primary+'33', borderColor:theme.colors.primary},
  internChipText:{color:theme.colors.textSecondary, fontSize:13},
  internChipTextActive:{color:theme.colors.primary, fontWeight:'700'},
  modalActions:{flexDirection:'row', gap:12, marginTop:8},
  cancelBtn:{flex:1, backgroundColor:theme.colors.card, borderRadius:12, paddingVertical:14, alignItems:'center', borderWidth:1, borderColor:theme.colors.border},
  cancelBtnText:{color:theme.colors.textSecondary, fontWeight:'600'},
  createBtn:{flex:1, backgroundColor:theme.colors.primary, borderRadius:12, paddingVertical:14, alignItems:'center'},
  createBtnText:{color:'#fff', fontWeight:'700'},
});
