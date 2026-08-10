import React, {useState, useEffect} from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, TextInput, Modal, RefreshControl,
} from 'react-native';
import client from '../../api/client';
import theme from '../../theme';

export default function MentorManagementScreen({navigation}) {
  const [mentors, setMentors] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [form, setForm] = useState({username:'', password:'', fullName:'', designation:'', departmentId:''});
  const [selectedDept, setSelectedDept] = useState(null);
  const [creating, setCreating] = useState(false);

  const fetchData = async () => {
    try {
      const [mentorsRes, deptsRes] = await Promise.all([
        client.get('/admin/mentors'),
        client.get('/admin/departments'),
      ]);
      setMentors(mentorsRes.data);
      setDepartments(deptsRes.data);
    } catch {
      Alert.alert('Error', 'Failed to load mentors');
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const createMentor = async () => {
    if (!form.username || !form.password || !form.fullName || !selectedDept) {
      Alert.alert('Error', 'Please fill all required fields'); return;
    }
    setCreating(true);
    try {
      await client.post('/admin/mentors', {
        ...form, departmentId: selectedDept.id,
      });
      Alert.alert('Success', 'Mentor account created');
      setShowCreateModal(false);
      setForm({username:'', password:'', fullName:'', designation:'', departmentId:''});
      setSelectedDept(null);
      fetchData();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Failed to create mentor');
    } finally { setCreating(false); }
  };

  const resetPassword = async (mentorId, name) => {
    Alert.prompt('Reset Password', `Set new password for ${name}:`, async pwd => {
      if (!pwd || pwd.length < 6) { Alert.alert('Error', 'Password must be 6+ chars'); return; }
      try {
        await client.patch(`/admin/mentors/${mentorId}/reset-password`, {newPassword: pwd});
        Alert.alert('Success', 'Password reset successfully');
      } catch { Alert.alert('Error', 'Failed to reset password'); }
    });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <View style={styles.container}>
      <ScrollView
        contentContainerStyle={{paddingBottom: 100, flexGrow: 1}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchData();}} tintColor={theme.colors.primary}/>}>

        <View style={styles.header}>
          <Text style={styles.title}>Mentors ({mentors.length})</Text>
          <TouchableOpacity id="create-mentor-btn" style={styles.addBtn} onPress={() => setShowCreateModal(true)}>
            <Text style={styles.addBtnText}>+ Add Mentor</Text>
          </TouchableOpacity>
        </View>

        {mentors.map(m => (
          <View key={m.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{m.fullName[0]}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{m.fullName}</Text>
                <Text style={styles.cardSub}>{m.designation || 'Mentor'} • {m.department}</Text>
                <Text style={styles.cardUsername}>@{m.username}</Text>
              </View>
              <View style={[styles.statusBadge, {backgroundColor: m.isActive ? theme.colors.success + '22' : theme.colors.error + '22'}]}>
                <Text style={[styles.statusText, {color: m.isActive ? theme.colors.success : theme.colors.error}]}>
                  {m.isActive ? 'Active' : 'Inactive'}
                </Text>
              </View>
            </View>
            <View style={styles.cardFooter}>
              <Text style={styles.cardStat}>👨‍🎓 {m.internCount} Interns</Text>
              <TouchableOpacity
                id={`reset-pwd-mentor-${m.id}`}
                style={styles.resetBtn}
                onPress={() => resetPassword(m.id, m.fullName)}>
                <Text style={styles.resetBtnText}>Reset Password</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>

      {/* Create Mentor Modal */}
      <Modal visible={showCreateModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Mentor Account</Text>
            {[
              {key: 'fullName', label: 'Full Name', placeholder: 'John Doe'},
              {key: 'designation', label: 'Designation', placeholder: 'Senior Developer'},
              {key: 'username', label: 'Username', placeholder: 'mentor_john'},
              {key: 'password', label: 'Password', placeholder: '••••••••', secure: true},
            ].map(f => (
              <View key={f.key} style={styles.modalField}>
                <Text style={styles.fieldLabel}>{f.label}</Text>
                <TextInput
                  id={`create-mentor-${f.key}`}
                  style={styles.fieldInput}
                  placeholder={f.placeholder}
                  placeholderTextColor={theme.colors.textMuted}
                  secureTextEntry={f.secure}
                  value={form[f.key]}
                  onChangeText={v => setForm(p => ({...p, [f.key]: v}))}
                />
              </View>
            ))}

            <Text style={styles.fieldLabel}>Department</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:12}}>
              {departments.map(d => (
                <TouchableOpacity
                  key={d.id}
                  style={[styles.deptChip, selectedDept?.id === d.id && styles.deptChipSelected]}
                  onPress={() => setSelectedDept(d)}>
                  <Text style={[styles.deptChipText, selectedDept?.id === d.id && styles.deptChipTextSelected]}>
                    {d.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowCreateModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity id="create-mentor-submit" style={styles.createBtn} onPress={createMentor} disabled={creating}>
                {creating ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Create</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background},
  center: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.background},
  header: {flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingHorizontal:20, paddingTop:48, paddingBottom:16},
  title: {color:theme.colors.text, fontSize:20, fontWeight:'700'},
  addBtn: {backgroundColor:theme.colors.primary, borderRadius:10, paddingHorizontal:16, paddingVertical:9},
  addBtnText: {color:'#fff', fontWeight:'700', fontSize:14},
  card: {backgroundColor:theme.colors.surface, marginHorizontal:16, marginBottom:12, borderRadius:16, padding:16, borderWidth:1, borderColor:theme.colors.border},
  cardHeader: {flexDirection:'row', alignItems:'center', marginBottom:12},
  avatarCircle: {width:48, height:48, borderRadius:24, backgroundColor:theme.colors.primary, justifyContent:'center', alignItems:'center', marginRight:12},
  avatarText: {color:'#fff', fontSize:20, fontWeight:'700'},
  cardInfo: {flex:1},
  cardName: {color:theme.colors.text, fontSize:16, fontWeight:'700'},
  cardSub: {color:theme.colors.textSecondary, fontSize:13, marginTop:2},
  cardUsername: {color:theme.colors.textMuted, fontSize:12},
  statusBadge: {borderRadius:8, paddingHorizontal:8, paddingVertical:4},
  statusText: {fontSize:11, fontWeight:'700'},
  cardFooter: {flexDirection:'row', justifyContent:'space-between', alignItems:'center', paddingTop:12, borderTopWidth:1, borderTopColor:theme.colors.border},
  cardStat: {color:theme.colors.textSecondary, fontSize:13},
  resetBtn: {borderRadius:8, paddingHorizontal:12, paddingVertical:6, borderWidth:1, borderColor:theme.colors.warning},
  resetBtnText: {color:theme.colors.warning, fontSize:12, fontWeight:'600'},
  // Modal
  modalOverlay: {flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'flex-end'},
  modalContent: {backgroundColor:theme.colors.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24, maxHeight:'85%'},
  modalTitle: {color:theme.colors.text, fontSize:18, fontWeight:'700', marginBottom:20},
  modalField: {marginBottom:12},
  fieldLabel: {color:theme.colors.textSecondary, fontSize:12, fontWeight:'600', marginBottom:6},
  fieldInput: {backgroundColor:theme.colors.card, borderRadius:10, borderWidth:1, borderColor:theme.colors.border, color:theme.colors.text, paddingHorizontal:14, paddingVertical:12, fontSize:14},
  deptChip: {paddingHorizontal:16, paddingVertical:8, backgroundColor:theme.colors.card, borderRadius:20, marginRight:8, borderWidth:1, borderColor:theme.colors.border},
  deptChipSelected: {backgroundColor:theme.colors.primary, borderColor:theme.colors.primary},
  deptChipText: {color:theme.colors.textSecondary, fontSize:13},
  deptChipTextSelected: {color:'#fff', fontWeight:'700'},
  modalActions: {flexDirection:'row', gap:12, marginTop:8},
  cancelBtn: {flex:1, backgroundColor:theme.colors.card, borderRadius:12, paddingVertical:14, alignItems:'center', borderWidth:1, borderColor:theme.colors.border},
  cancelBtnText: {color:theme.colors.textSecondary, fontWeight:'600'},
  createBtn: {flex:1, backgroundColor:theme.colors.primary, borderRadius:12, paddingVertical:14, alignItems:'center'},
  createBtnText: {color:'#fff', fontWeight:'700'},
});
