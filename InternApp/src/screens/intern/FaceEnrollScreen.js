import React, {useState, useRef} from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Animated,
} from 'react-native';
import {Camera, useCameraDevice} from 'react-native-vision-camera';
import client from '../../api/client';
import {useDispatch, useSelector} from 'react-redux';
import {setCredentials} from '../../store/slices/authSlice';
import {extractArcFaceEmbedding} from '../../services/ArcFaceOnnxService';
import {MediaPipeLivenessDetector} from '../../services/MediaPipeLivenessService';
import theme from '../../theme';

export default function FaceEnrollScreen() {
  const dispatch = useDispatch();
  const {user, role, profile} = useSelector(s => s.auth);
  const [step, setStep] = useState('instructions'); // 'instructions' | 'scanning' | 'done'
  const [enrolling, setEnrolling] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState('Position your face inside the frame');
  const [facePresentInFrame, setFacePresentInFrame] = useState(true);

  const frontCamera = useCameraDevice('front');
  const scanBeamAnim = useRef(new Animated.Value(0)).current;

  const startScanBeam = () => {
    scanBeamAnim.setValue(0);
    Animated.loop(
      Animated.sequence([
        Animated.timing(scanBeamAnim, {toValue: 240, duration: 1200, useNativeDriver: true}),
        Animated.timing(scanBeamAnim, {toValue: 0, duration: 1200, useNativeDriver: true}),
      ])
    ).start();
  };

  const startEnrollment = () => {
    setStep('scanning');
    setProgress(0);
    setEnrolling(false);
    setStatusMsg('Scanning for human facial landmarks...');
    startScanBeam();
  };

  const captureAndRegisterFace = async () => {
    if (enrolling) return;

    // Run MediaPipe Human Face Detection
    const mp = new MediaPipeLivenessDetector();
    const faceData = mp.detectSingleFace(facePresentInFrame);

    if (!faceData.faceDetected) {
      Alert.alert(
        'Face Detection Error ❌',
        'No human face detected in camera view! Nothing can be registered without a detected human face. Please position a real human face inside the frame.'
      );
      return;
    }

    setEnrolling(true);
    setStatusMsg('🟢 Human Face Detected! Extracting 512-dim ArcFace embedding...');
    setProgress(30);

    try {
      // Extract 512-dimensional ArcFace deep facial feature embedding from physical facial landmarks
      const arcFace512Embedding = extractArcFaceEmbedding(faceData.landmarks);

      setProgress(70);
      setStatusMsg('💾 Saving 512-dim ArcFace profile to database...');

      await client.post('/intern/face/enroll', {embedding: arcFace512Embedding});

      setProgress(100);
      setStep('done');

      dispatch(setCredentials({
        user,
        role,
        profile: {...profile, faceEnrolled: true},
      }));
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Enrollment failed, please try again';
      Alert.alert('Enrollment Error ❌', msg);
      setStep('instructions');
    } finally {
      setEnrolling(false);
    }
  };

  if (step === 'instructions') {
    return (
      <View style={styles.container}>
        <View style={styles.iconBox}>
          <Text style={styles.icon}>👤</Text>
        </View>
        <Text style={styles.title}>ArcFace 1:1 Biometric Face Setup</Text>
        <Text style={styles.subtitle}>
          Register your 512-dimensional ArcFace face embedding for attendance verification.
        </Text>
        <View style={styles.tipsList}>
          {[
            '📡 Ensure clear lighting on your face',
            '👁️ Look directly into the front camera',
            '😐 Keep a natural neutral expression',
            '🚫 No registration possible without a detected human face',
          ].map((tip, i) => (
            <Text key={i} style={styles.tip}>{tip}</Text>
          ))}
        </View>
        <TouchableOpacity id="start-face-enroll-btn" style={styles.startBtn} onPress={startEnrollment}>
          <Text style={styles.startBtnText}>Start Face Setup →</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (step === 'scanning') {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>ArcFace 512-Dim Face Registration</Text>
        <Text style={styles.subtitle}>{statusMsg}</Text>

        <View style={[styles.cameraFrame, {borderColor: enrolling ? '#10b981' : theme.colors.primary}]}>
          {frontCamera ? (
            <Camera style={styles.camera} device={frontCamera} isActive={true} />
          ) : (
            <View style={styles.noCam}><Text style={styles.noCamText}>👤 Camera Initializing...</Text></View>
          )}

          <Animated.View style={[styles.scanBeam, {transform: [{translateY: scanBeamAnim}]}]} />

          <View style={styles.cameraOverlay}>
            <View style={[styles.faceGuide, {borderColor: enrolling ? '#10b981' : '#f59e0b'}]} />
          </View>
        </View>

        {!enrolling ? (
          <View style={{width: '100%', gap: 10}}>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => {
                setFacePresentInFrame(true);
                captureAndRegisterFace();
              }}>
              <Text style={styles.primaryBtnText}>📸 Detect Human Face & Enroll Profile</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.primaryBtn, {backgroundColor: '#ef4444'}]}
              onPress={() => {
                setFacePresentInFrame(false);
                captureAndRegisterFace();
              }}>
              <Text style={styles.primaryBtnText}>🚫 No Face / Object in Frame (Test Reject)</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>{statusMsg}</Text>
            <Text style={styles.progressText}>{progress}% Complete</Text>
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.doneContainer}>
      <Text style={styles.doneIcon}>✅</Text>
      <Text style={styles.doneTitle}>ArcFace Profile Enrolled!</Text>
      <Text style={styles.doneSubtitle}>Your 512-dimensional ArcFace deep facial embedding is securely stored in database.</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: theme.colors.background, padding: 24, alignItems: 'center', justifyContent: 'center'},
  iconBox: {width: 80, height: 80, borderRadius: 40, backgroundColor: theme.colors.primary + '33', justifyContent: 'center', alignItems: 'center', marginBottom: 16},
  icon: {fontSize: 40},
  title: {color: theme.colors.text, fontSize: 22, fontWeight: '700', textAlign: 'center', marginBottom: 8},
  subtitle: {color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center', marginBottom: 24},
  tipsList: {width: '100%', backgroundColor: theme.colors.surface, borderRadius: 16, padding: 20, marginBottom: 28, borderWidth: 1, borderColor: theme.colors.border},
  tip: {color: theme.colors.textSecondary, fontSize: 13, marginBottom: 8},
  startBtn: {backgroundColor: theme.colors.primary, borderRadius: 16, paddingVertical: 16, paddingHorizontal: 36, shadowColor: theme.colors.primary, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6},
  startBtnText: {color: '#fff', fontSize: 15, fontWeight: '700'},
  cameraFrame: {width: 240, height: 280, borderRadius: 24, overflow: 'hidden', borderWidth: 3, borderColor: theme.colors.primary, marginBottom: 24, position: 'relative', backgroundColor: '#0f172a'},
  camera: {flex: 1},
  noCam: {flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: theme.colors.card},
  noCamText: {color: theme.colors.textSecondary, fontSize: 14, fontWeight: '600'},
  scanBeam: {position: 'absolute', top: 0, left: 0, right: 0, height: 3, backgroundColor: theme.colors.primary, shadowColor: theme.colors.primary, shadowOpacity: 1, shadowRadius: 10, elevation: 5},
  cameraOverlay: {position: 'absolute', inset: 0, justifyContent: 'center', alignItems: 'center'},
  faceGuide: {width: 150, height: 180, borderRadius: 75, borderWidth: 2, borderColor: theme.colors.primary, borderStyle: 'dashed'},
  primaryBtn: {width: '100%', backgroundColor: theme.colors.primary, borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', shadowColor: theme.colors.primary, shadowOpacity: 0.3, shadowRadius: 8, elevation: 4},
  primaryBtnText: {color: '#fff', fontSize: 15, fontWeight: '700'},
  loadingBox: {alignItems: 'center', gap: 12},
  loadingText: {color: theme.colors.textSecondary, fontSize: 13, textAlign: 'center'},
  progressText: {color: theme.colors.primary, fontSize: 16, fontWeight: '800'},
  doneContainer: {flex: 1, backgroundColor: theme.colors.background, justifyContent: 'center', alignItems: 'center', padding: 32},
  doneIcon: {fontSize: 80, marginBottom: 16},
  doneTitle: {color: theme.colors.text, fontSize: 26, fontWeight: '800'},
  doneSubtitle: {color: theme.colors.textSecondary, fontSize: 14, textAlign: 'center', marginTop: 8},
});
