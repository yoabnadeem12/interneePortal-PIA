import React, {useState, useEffect} from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  Alert, ActivityIndicator, RefreshControl,
} from 'react-native';
import client from '../../api/client';
import theme from '../../theme';

export default function MentorGatePassScreen() {
  const [gatePasses, setGatePasses] = useState([]);
  const [idCards, setIdCards] = useState([]);
  const [activeTab, setActiveTab] = useState('gatepass');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchAll = async () => {
    try {
      const [gpRes, icRes] = await Promise.all([
        client.get('/mentor/gatepasses?status=Pending'),
        client.get('/mentor/idcards?status=Pending'),
      ]);
      setGatePasses(gpRes.data);
      setIdCards(icRes.data);
    } catch { Alert.alert('Error', 'Failed to load requests'); }
    finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleApprove = async (type, id, internName) => {
    Alert.alert('Confirm', `Approve ${type} for ${internName}?`, [
      {text: 'Cancel', style: 'cancel'},
      {text: 'Approve', style: 'default', onPress: async () => {
        try {
          await client.post(`/mentor/${type}s/${id}/approve`);
          Alert.alert('✅ Approved', 'PDF generated successfully');
          fetchAll();
        } catch (e) { Alert.alert('Error', e.response?.data?.message || 'Failed'); }
      }},
    ]);
  };

  const handleReject = async (type, id, internName) => {
    Alert.prompt('Reject', `Reason for rejecting ${internName}'s ${type}:`, async reason => {
      if (!reason) return;
      try {
        await client.post(`/mentor/${type}s/${id}/reject`, {reason});
        Alert.alert('Rejected', 'Request rejected');
        fetchAll();
      } catch { Alert.alert('Error', 'Failed to reject'); }
    });
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={theme.colors.primary} /></View>;

  const currentData = activeTab === 'gatepass' ? gatePasses : idCards;
  const typeName = activeTab === 'gatepass' ? 'gatepass' : 'idcard';

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {[
          {key:'gatepass', label:`Gate Pass (${gatePasses.length})`},
          {key:'idcard', label:`ID Cards (${idCards.length})`},
        ].map(t => (
          <TouchableOpacity
            key={t.key}
            id={`tab-${t.key}`}
            style={[styles.tab, activeTab === t.key && styles.tabActive]}
            onPress={() => setActiveTab(t.key)}>
            <Text style={[styles.tabText, activeTab === t.key && styles.tabTextActive]}>{t.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={{paddingBottom: 100, flexGrow: 1}}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => {setRefreshing(true); fetchAll();}} tintColor={theme.colors.primary}/>}>
        {currentData.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>✅</Text>
            <Text style={styles.emptyText}>No pending requests</Text>
          </View>
        ) : currentData.map(item => (
          <View key={item.id} style={styles.requestCard}>
            <View style={styles.cardTop}>
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>{item.internName[0]}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={styles.cardName}>{item.internName}</Text>
                <Text style={styles.cardSub}>{item.department}</Text>
                {item.internCnic && <Text style={styles.cardCnic}>CNIC: {item.internCnic}</Text>}
              </View>
              <View style={styles.pendingBadge}>
                <Text style={styles.pendingText}>⏳ Pending</Text>
              </View>
            </View>
            <Text style={styles.requestDate}>
              Requested: {new Date(item.requestedAt).toLocaleDateString()}
            </Text>
            <View style={styles.actionRow}>
              <TouchableOpacity
                id={`reject-${typeName}-${item.id}`}
                style={styles.rejectBtn}
                onPress={() => handleReject(typeName, item.id, item.internName)}>
                <Text style={styles.rejectBtnText}>✗ Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                id={`approve-${typeName}-${item.id}`}
                style={styles.approveBtn}
                onPress={() => handleApprove(typeName, item.id, item.internName)}>
                <Text style={styles.approveBtnText}>✓ Approve & Generate PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex:1, backgroundColor:theme.colors.background},
  center: {flex:1, justifyContent:'center', alignItems:'center', backgroundColor:theme.colors.background},
  tabs: {flexDirection:'row', backgroundColor:theme.colors.surface, borderBottomWidth:1, borderBottomColor:theme.colors.border, paddingTop:48},
  tab: {flex:1, paddingVertical:16, alignItems:'center'},
  tabActive: {borderBottomWidth:2, borderBottomColor:theme.colors.primary},
  tabText: {color:theme.colors.textMuted, fontSize:14, fontWeight:'600'},
  tabTextActive: {color:theme.colors.primary},
  emptyBox: {alignItems:'center', paddingVertical:60},
  emptyIcon: {fontSize:48, marginBottom:12},
  emptyText: {color:theme.colors.textSecondary, fontSize:16},
  requestCard: {backgroundColor:theme.colors.surface, margin:12, marginBottom:4, borderRadius:16, padding:16, borderWidth:1, borderColor:theme.colors.border},
  cardTop: {flexDirection:'row', alignItems:'center', marginBottom:12},
  avatarCircle: {width:48, height:48, borderRadius:24, backgroundColor:theme.colors.primary, justifyContent:'center', alignItems:'center', marginRight:12},
  avatarText: {color:'#fff', fontSize:20, fontWeight:'700'},
  cardInfo: {flex:1},
  cardName: {color:theme.colors.text, fontSize:16, fontWeight:'700'},
  cardSub: {color:theme.colors.textSecondary, fontSize:13},
  cardCnic: {color:theme.colors.textMuted, fontSize:12},
  pendingBadge: {backgroundColor:theme.colors.warning+'22', borderRadius:8, paddingHorizontal:8, paddingVertical:4},
  pendingText: {color:theme.colors.warning, fontSize:11, fontWeight:'700'},
  requestDate: {color:theme.colors.textMuted, fontSize:12, marginBottom:12},
  actionRow: {flexDirection:'row', gap:8},
  rejectBtn: {flex:1, borderRadius:10, paddingVertical:10, alignItems:'center', borderWidth:1, borderColor:theme.colors.error},
  rejectBtnText: {color:theme.colors.error, fontWeight:'700'},
  approveBtn: {flex:2, backgroundColor:theme.colors.primary, borderRadius:10, paddingVertical:10, alignItems:'center'},
  approveBtnText: {color:'#fff', fontWeight:'700', fontSize:13},
});
