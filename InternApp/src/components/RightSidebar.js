import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, SafeAreaView, Alert
} from 'react-native';
import {useSelector, useDispatch} from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import client from '../api/client';
import theme from '../theme';
import {logout} from '../store/slices/authSlice';

export default function RightSidebar({visible, onClose, navigation}) {
  const dispatch = useDispatch();
  const {user, role, profile} = useSelector(s => s.auth);

  const handleLogout = async () => {
    onClose();
    const refreshToken = await AsyncStorage.getItem('refreshToken');
    try { await client.post('/auth/logout', {refreshToken}); } catch {}
    await AsyncStorage.removeItem('accessToken');
    await AsyncStorage.removeItem('refreshToken');
    await AsyncStorage.removeItem('user');
    dispatch(logout());
  };

  const navigateTo = (screenName) => {
    onClose();
    if (navigation && screenName) {
      navigation.navigate(screenName);
    }
  };

  const getMenuItems = () => {
    if (role === 'Admin') {
      return [
        {key: 'AdminDash', label: 'Dashboard', icon: '🏠'},
        {key: 'MentorManagement', label: 'Mentors', icon: '👨‍💼'},
        {key: 'Departments', label: 'Departments', icon: '🏢'},
        {key: 'AdminInterns', label: 'Interns', icon: '🎓'},
        {key: 'ActivityLogs', label: 'Activity Logs', icon: '📋'},
      ];
    } else if (role === 'Mentor') {
      return [
        {key: 'MentorDash', label: 'Dashboard', icon: '🏠'},
        {key: 'CreateIntern', label: 'Add New Intern', icon: '➕'},
        {key: 'AttendanceView', label: 'Attendance Logs', icon: '📍'},
        {key: 'Tasks', label: 'Assign Tasks', icon: '📝'},
        {key: 'GatePassApproval', label: 'Pass & Card Approvals', icon: '🎫'},
        {key: 'MentorCerts', label: 'Certificates', icon: '🎓'},
      ];
    } else {
      return [
        {key: 'InternDash', label: 'Home Dashboard', icon: '🏠'},
        {key: 'FaceRegistration', label: 'Face Registration', icon: '👤'},
        {key: 'Attendance', label: 'Mark Attendance', icon: '📍'},
        {key: 'MyTasks', label: 'My Tasks', icon: '📝'},
        {key: 'GatePass', label: 'Gate Pass Request', icon: '🎫'},
        {key: 'IdCard', label: 'ID Card Request', icon: '🪪'},
        {key: 'Certificate', label: 'Certificate Request', icon: '🎓'},
      ];
    }
  };

  const menuItems = getMenuItems();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}>
      <View style={styles.overlay}>
        <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

        <SafeAreaView style={styles.drawerContainer}>
          <View style={styles.drawerContent}>
            
            {/* Header / Profile info */}
            <View style={styles.profileHeader}>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
              
              <View style={styles.avatarCircle}>
                <Text style={styles.avatarText}>
                  {profile?.fullName ? profile.fullName[0].toUpperCase() : user?.username ? user.username[0].toUpperCase() : 'U'}
                </Text>
              </View>
              
              <Text style={styles.userName}>{profile?.fullName || user?.username || 'User'}</Text>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{role || 'User'}</Text>
              </View>
              {profile?.department && (
                <Text style={styles.deptText}>🏢 {profile.department}</Text>
              )}
            </View>

            <View style={styles.divider} />

            {/* Menu Links */}
            <Text style={styles.menuSectionTitle}>NAVIGATION</Text>
            <ScrollView style={styles.menuList} showsVerticalScrollIndicator={false}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.key}
                  style={styles.menuItem}
                  onPress={() => navigateTo(item.key)}>
                  <Text style={styles.menuIcon}>{item.icon}</Text>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  <Text style={styles.menuChevron}>›</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.divider} />

            {/* Logout Button */}
            <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
              <Text style={styles.logoutIcon}>🚪</Text>
              <Text style={styles.logoutText}>Logout</Text>
            </TouchableOpacity>

          </View>
        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.65)',
  },
  backdrop: {
    flex: 1,
  },
  drawerContainer: {
    width: '78%',
    maxWidth: 320,
    backgroundColor: theme.colors.surface,
    height: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 24,
    borderLeftWidth: 1,
    borderLeftColor: theme.colors.border,
  },
  drawerContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'space-between',
  },
  profileHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 16,
    position: 'relative',
  },
  closeBtn: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  closeBtnText: {
    color: theme.colors.textSecondary,
    fontSize: 16,
    fontWeight: '700',
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 10,
    shadowColor: theme.colors.primary,
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 6,
  },
  avatarText: {
    color: '#fff',
    fontSize: 26,
    fontWeight: '800',
  },
  userName: {
    color: theme.colors.text,
    fontSize: 18,
    fontWeight: '700',
    textAlign: 'center',
  },
  roleBadge: {
    backgroundColor: theme.colors.primary + '22',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: theme.colors.primary + '44',
  },
  roleBadgeText: {
    color: theme.colors.primary,
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  deptText: {
    color: theme.colors.textMuted,
    fontSize: 12,
    marginTop: 6,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: 12,
  },
  menuSectionTitle: {
    color: theme.colors.textMuted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 4,
  },
  menuList: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  menuIcon: {
    fontSize: 18,
    marginRight: 12,
  },
  menuLabel: {
    flex: 1,
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  menuChevron: {
    color: theme.colors.textMuted,
    fontSize: 18,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.error + '18',
    borderRadius: 14,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: theme.colors.error + '44',
    marginTop: 8,
  },
  logoutIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  logoutText: {
    color: theme.colors.error,
    fontSize: 15,
    fontWeight: '700',
  },
});
