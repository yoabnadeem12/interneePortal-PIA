import React, {useState, useEffect} from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, Modal, TextInput, RefreshControl, Platform,
} from 'react-native';
import client from '../../api/client';
import theme from '../../theme';

export default function GatePassScreen() {
  const [gatePass, setGatePass] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [studentIdPicked, setStudentIdPicked] = useState(false);
  const [cnicPicked, setCnicPicked] = useState(false);
  const [studentIdUri, setStudentIdUri] = useState(null);
  const [cnicUri, setCnicUri] = useState(null);

  const fetchGatePass = async () => {
    try {
      const res = await client.get('/intern/gatepass');
      setGatePass(res.data);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchGatePass(); }, []);

  const pickDocument = async (type) => {
    try {
      const { pick, types } = require('@react-native-documents/picker');
      const [res] = await pick({
        type: [types.images],
      });
      if (type === 'studentId') { setStudentIdUri(res.uri); setStudentIdPicked(true); }
      else { setCnicUri(res.uri); setCnicPicked(true); }
    } catch (e) {
      const { isCancel } = require('@react-native-documents/picker');
      if (!isCancel(e)) Alert.alert('Error', 'Failed to pick document');
    }
  };

  const submitRequest = async () => {
    if (!studentIdPicked || !cnicPicked) {
      Alert.alert('Required', 'Please upload both Student ID and CNIC'); return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('StudentIdImage', {uri: studentIdUri, type: 'image/jpeg', name: 'student_id.jpg'});
      formData.append('CnicImage', {uri: cnicUri, type: 'image/jpeg', name: 'cnic.jpg'});

      await client.post('/intern/gatepass', formData, {
        headers: {'Content-Type': 'multipart/form-data'},
      });
      Alert.alert('Success', 'Gate pass request submitted! Awaiting mentor approval.');
      setShowUploadModal(false);
      fetchGatePass();
    } catch (e) {
      Alert.alert('Error', e.response?.data?.message || 'Submission failed');
    } finally { setUploading(false); }
  };

  const downloadPdf = async () => {
    if (!gatePass?.pdfPath) { Alert.alert('Not Ready', 'PDF not yet generated'); return; }
    // Open PDF URL in browser or react-native-fs download
    const {Linking} = require('react-native');
    const url = `${require('../../config/constants').API_BASE_URL.replace('/api', '')}/files/${gatePass.pdfPath}`;
    Linking.openURL(url);
  };

  const statusConfig = {
    Pending: {color: theme.colors.warning, icon: '⏳', label: 'Pending Mentor Approval'},
    Approved: {color: theme.colors.success, icon: '✅', label: 'Approved'},
    Rejected: {color: theme.colors.error, icon: '❌', label: 'Rejected'},
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  return (
    <ScrollView
      style={styles.container}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchGatePass();}} tintColor={theme.colors.primary} />}>

      <View style={styles.header}>
        <Text style={styles.title}>Gate Pass</Text>
        <Text style={styles.subtitle}>Permission for entry at PIA Head Office</Text>
      </View>

      {!gatePass ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>🎫</Text>
          <Text style={styles.emptyTitle}>No Gate Pass Request</Text>
          <Text style={styles.emptyDesc}>Upload your Student ID and CNIC to apply</Text>
          <TouchableOpacity id="apply-gatepass-btn" style={styles.applyBtn} onPress={() => setShowUploadModal(true)}>
            <Text style={styles.applyBtnText}>Apply for Gate Pass</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.statusCard}>
          <Text style={styles.statusIcon}>{statusConfig[gatePass.status]?.icon ?? '📄'}</Text>
          <Text style={[styles.statusLabel, {color: statusConfig[gatePass.status]?.color ?? theme.colors.text}]}>
            {statusConfig[gatePass.status]?.label ?? gatePass.status}
          </Text>
          <Text style={styles.statusDate}>Requested: {new Date(gatePass.requestedAt).toLocaleDateString()}</Text>
          {gatePass.approvedAt && (
            <Text style={styles.statusDate}>Approved: {new Date(gatePass.approvedAt).toLocaleDateString()}</Text>
          )}
          {gatePass.rejectionReason && (
            <View style={styles.rejectionBox}>
              <Text style={styles.rejectionText}>Reason: {gatePass.rejectionReason}</Text>
            </View>
          )}

          <View style={styles.docsRow}>
            <View style={[styles.docBadge, {backgroundColor: gatePass.hasStudentId ? theme.colors.success+'22' : theme.colors.error+'22'}]}>
              <Text style={{color: gatePass.hasStudentId ? theme.colors.success : theme.colors.error}}>
                {gatePass.hasStudentId ? '✓' : '✗'} Student ID
              </Text>
            </View>
            <View style={[styles.docBadge, {backgroundColor: gatePass.hasCnic ? theme.colors.success+'22' : theme.colors.error+'22'}]}>
              <Text style={{color: gatePass.hasCnic ? theme.colors.success : theme.colors.error}}>
                {gatePass.hasCnic ? '✓' : '✗'} CNIC
              </Text>
            </View>
          </View>

          {gatePass.status === 'Approved' && gatePass.pdfPath && (
            <TouchableOpacity id="download-gatepass-pdf" style={styles.downloadBtn} onPress={downloadPdf}>
              <Text style={styles.downloadBtnText}>📥 Download Gate Pass PDF</Text>
            </TouchableOpacity>
          )}
          {gatePass.status === 'Rejected' && (
            <TouchableOpacity id="reapply-gatepass-btn" style={styles.applyBtn} onPress={() => setShowUploadModal(true)}>
              <Text style={styles.applyBtnText}>Re-Apply</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* Upload Modal */}
      <Modal visible={showUploadModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Documents</Text>
            <Text style={styles.modalSubtitle}>Required for Gate Pass verification</Text>

            <TouchableOpacity id="pick-student-id" style={[styles.uploadArea, studentIdPicked && styles.uploadAreaDone]} onPress={() => pickDocument('studentId')}>
              <Text style={styles.uploadIcon}>{studentIdPicked ? '✅' : '🪪'}</Text>
              <Text style={styles.uploadLabel}>{studentIdPicked ? 'Student ID Uploaded' : 'Upload Student ID Card'}</Text>
            </TouchableOpacity>

            <TouchableOpacity id="pick-cnic" style={[styles.uploadArea, cnicPicked && styles.uploadAreaDone]} onPress={() => pickDocument('cnic')}>
              <Text style={styles.uploadIcon}>{cnicPicked ? '✅' : '📄'}</Text>
              <Text style={styles.uploadLabel}>{cnicPicked ? 'CNIC Uploaded' : 'Upload CNIC'}</Text>
            </TouchableOpacity>

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUploadModal(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity id="submit-gatepass" style={styles.createBtn} onPress={submitRequest} disabled={uploading}>
                {uploading ? <ActivityIndicator color="#fff" /> : <Text style={styles.createBtnText}>Submit Request</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex:1, backgroundColor:theme.colors.background},
  center: {flex:1, justifyContent:'center', alignItems:'center', backgroundColor:theme.colors.background},
  header: {padding:20, paddingTop:40},
  title: {color:theme.colors.text, fontSize:24, fontWeight:'700'},
  subtitle: {color:theme.colors.textMuted, fontSize:14, marginTop:4},
  emptyCard: {margin:20, backgroundColor:theme.colors.surface, borderRadius:20, padding:32, alignItems:'center', borderWidth:1, borderColor:theme.colors.border},
  emptyIcon: {fontSize:56, marginBottom:12},
  emptyTitle: {color:theme.colors.text, fontSize:18, fontWeight:'700'},
  emptyDesc: {color:theme.colors.textSecondary, fontSize:14, textAlign:'center', marginTop:8, marginBottom:24},
  applyBtn: {backgroundColor:theme.colors.primary, borderRadius:12, paddingHorizontal:24, paddingVertical:12},
  applyBtnText: {color:'#fff', fontWeight:'700', fontSize:15},
  statusCard: {margin:20, backgroundColor:theme.colors.surface, borderRadius:20, padding:24, alignItems:'center', borderWidth:1, borderColor:theme.colors.border},
  statusIcon: {fontSize:56, marginBottom:8},
  statusLabel: {fontSize:20, fontWeight:'700', marginBottom:4},
  statusDate: {color:theme.colors.textMuted, fontSize:12, marginTop:2},
  rejectionBox: {backgroundColor:theme.colors.error+'22', borderRadius:8, padding:12, marginTop:12, width:'100%'},
  rejectionText: {color:theme.colors.error, fontSize:13},
  docsRow: {flexDirection:'row', gap:8, marginTop:16},
  docBadge: {borderRadius:8, paddingHorizontal:12, paddingVertical:8},
  downloadBtn: {backgroundColor:theme.colors.success, borderRadius:12, paddingHorizontal:24, paddingVertical:12, marginTop:20, width:'100%', alignItems:'center'},
  downloadBtnText: {color:'#fff', fontWeight:'700', fontSize:15},
  // Modal
  modalOverlay: {flex:1, backgroundColor:'rgba(0,0,0,0.7)', justifyContent:'flex-end'},
  modalContent: {backgroundColor:theme.colors.surface, borderTopLeftRadius:24, borderTopRightRadius:24, padding:24},
  modalTitle: {color:theme.colors.text, fontSize:18, fontWeight:'700', marginBottom:4},
  modalSubtitle: {color:theme.colors.textMuted, fontSize:13, marginBottom:20},
  uploadArea: {backgroundColor:theme.colors.card, borderRadius:12, borderWidth:2, borderColor:theme.colors.border, borderStyle:'dashed', padding:20, alignItems:'center', marginBottom:12},
  uploadAreaDone: {borderColor:theme.colors.success, backgroundColor:theme.colors.success+'11'},
  uploadIcon: {fontSize:32, marginBottom:8},
  uploadLabel: {color:theme.colors.textSecondary, fontSize:14, fontWeight:'600'},
  modalActions: {flexDirection:'row', gap:12, marginTop:8},
  cancelBtn: {flex:1, backgroundColor:theme.colors.card, borderRadius:12, paddingVertical:14, alignItems:'center', borderWidth:1, borderColor:theme.colors.border},
  cancelBtnText: {color:theme.colors.textSecondary, fontWeight:'600'},
  createBtn: {flex:1, backgroundColor:theme.colors.primary, borderRadius:12, paddingVertical:14, alignItems:'center'},
  createBtnText: {color:'#fff', fontWeight:'700'},
});
