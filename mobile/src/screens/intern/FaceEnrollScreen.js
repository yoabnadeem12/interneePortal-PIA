import React, {useState, useRef} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Animated,
} from 'react-native';
import {Camera, useCameraDevices} from 'react-native-vision-camera';
import client from '../../api/client';
import {useDispatch, useSelector} from 'react-redux';
import {setCredentials} from '../../store/slices/authSlice';
import theme from '../../theme';

export default function FaceEnrollScreen() {
  const dispatch = useDispatch();
  const {user, role, profile} = useSelector(s => s.auth);
  const [step, setStep] = useState('instructions'); // 'instructions' | 'scanning' | 'done'
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const devices = useCameraDevices();
  const frontCamera = devices.find(d => d.position === 'front');
  const progressAnim = useRef(new Animated.Value(0)).current;

  const startEnrollment = async () => {
    setStep('scanning');
    setProgress(0);

    // Simulate scan progress (in production: collect 5 frames and average embeddings)
    const interval = setInterval(() => {
      setProgress(p => {
        if (p >= 100) { clearInterval(interval); return 100; }
        return p + 10;
      });
    }, 300);

    setTimeout(async () => {
      clearInterval(interval);
      setProgress(100);

      // In production: extract real face embedding using TFLite FaceNet model
      // For now: generate a random 128-dim embedding (replace with real model)
      const mockEmbedding = Array.from({length: 128}, () => Math.random() * 2 - 1);

      setEnrolling(true);
      try {
        await client.post('/intern/face/enroll', {embedding: mockEmbedding});
        setStep('done');
        // Update profile to mark face enrolled
        setTimeout(() => {
          dispatch(setCredentials({
            user,
            role,
            profile: {...profile, faceEnrolled: true},
          }));
        }, 2000);
      } catch (e) {
        Alert.alert('Enrollment Failed', e.response?.data?.message || 'Please try again');
        setStep('instructions');
      } finally { setEnrolling(false); }
    }, 3500);
  };

  if (step === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>🔐</Text>
        </View>
        <Text style={styles.title}>Face Enrollment Required</Text>
        <Text style={styles.subtitle}>
          Set up face recognition for secure attendance marking.
          This is a one-time setup.
        </Text>
        <View style={styles.tipsList}>
          {[
            '📡 Ensure good lighting',
            '👁️ Look directly at the camera',
            '😐 Keep a neutral expression',
            '🚫 Remove glasses or hats if possible',
            '😉 Blink when prompted (liveness check)',
          ].map((tip, i) => (
            <Text key={i} style={styles.tip}>{tip}</Text>
          ))}
        </View>
        <TouchableOpacity id="start-face-enroll-btn" style={styles.startBtn} onPress={startEnrollment}>
          <Text style={styles.startBtnText}>Start Face Enrollment</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'scanning') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Scanning Face...</Text>
        <Text style={styles.subtitle}>Hold still and look at the camera</Text>
        <View style={styles.cameraFrame}>
          {frontCamera ? (
            <Camera style={styles.camera} device={frontCamera} isActive={true} />
          ) : (
            <View style={styles.noCam}><Text style={styles.noCamText}>📷 Camera loading...</Text></View>
          )}
          <View style={styles.cameraOverlay}>
            <View style={styles.faceGuide} />
          </View>
        </View>
        <View style={styles.progressContainer}>
          <View style={styles.progressBg}>
            <View style={[styles.progressBar, {width: `${progress}%`}]} />
          </View>
          <Text style={styles.progressText}>{progress}%</Text>
        </View>
        {enrolling && <ActivityIndicator color={theme.colors.primary} style={{marginTop: 16}} />}
      </View>
    );
  }

  return (
    <View style={styles.doneContainer}>
      <Text style={styles.doneIcon}>✅</Text>
      <Text style={styles.doneTitle}>Face Enrolled!</Text>
      <Text style={styles.doneSubtitle}>Your face has been securely stored. Redirecting to dashboard...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex:1, backgroundColor:theme.colors.background, padding:24, alignItems:'center', justifyContent:'center'},
  iconBox: {width:80, height:80, borderRadius:40, backgroundColor:theme.colors.primary+'33', justifyContent:'center', alignItems:'center', marginBottom:16},
  icon: {fontSize:40},
  title: {color:theme.colors.text, fontSize:24, fontWeight:'700', textAlign:'center', marginBottom:8},
  subtitle: {color:theme.colors.textSecondary, fontSize:14, textAlign:'center', marginBottom:24},
  tipsList: {width:'100%', backgroundColor:theme.colors.surface, borderRadius:16, padding:20, marginBottom:28, borderWidth:1, borderColor:theme.colors.border},
  tip: {color:theme.colors.textSecondary, fontSize:14, marginBottom:8},
  startBtn: {backgroundColor:theme.colors.primary, borderRadius:16, paddingVertical:16, paddingHorizontal:48, shadowColor:theme.colors.primary, shadowOpacity:0.4, shadowRadius:12, elevation:6},
  startBtnText: {color:'#fff', fontSize:16, fontWeight:'700'},
  cameraFrame: {width:240, height:320, borderRadius:24, overflow:'hidden', borderWidth:3, borderColor:theme.colors.primary, marginBottom:24, position:'relative'},
  camera: {flex:1},
  noCam: {flex:1, justifyContent:'center', alignItems:'center', backgroundColor:theme.colors.card},
  noCamText: {color:theme.colors.textSecondary, fontSize:14},
  cameraOverlay: {position:'absolute', inset:0, justifyContent:'center', alignItems:'center'},
  faceGuide: {width:150, height:190, borderRadius:75, borderWidth:2, borderColor:theme.colors.primary, borderStyle:'dashed'},
  progressContainer: {width:'100%', flexDirection:'row', alignItems:'center', gap:12},
  progressBg: {flex:1, height:10, backgroundColor:theme.colors.card, borderRadius:5, overflow:'hidden'},
  progressBar: {height:'100%', backgroundColor:theme.colors.primary, borderRadius:5},
  progressText: {color:theme.colors.text, fontWeight:'700', width:40},
  doneContainer: {flex:1, backgroundColor:theme.colors.background, justifyContent:'center', alignItems:'center', padding:32},
  doneIcon: {fontSize:80, marginBottom:16},
  doneTitle: {color:theme.colors.text, fontSize:28, fontWeight:'800'},
  doneSubtitle: {color:theme.colors.textSecondary, fontSize:14, textAlign:'center', marginTop:8},
});
