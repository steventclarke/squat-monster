import { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { Colors, Spacing, Typography } from '../constants/theme';
import { MAX_VIDEO_DURATION_SEC, MAX_VIDEO_SIZE_BYTES } from '@squat-monster/shared';

export default function Record() {
  const [error, setError] = useState<string | null>(null);

  const startRecording = async () => {
    setError(null);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        setError('Camera permission required. Please allow camera access.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: MAX_VIDEO_DURATION_SEC,
        quality: 1,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      const size = asset.fileSize ?? 0;
      if (size > MAX_VIDEO_SIZE_BYTES) {
        setError(`Recording exceeds ${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)} MB. Trim externally or re-record shorter.`);
        return;
      }
      router.push('/record/inputs');
    } catch (e: any) {
      setError(e?.message || 'Failed to record video');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Panel>
          <Text style={styles.title}>RECORD</Text>
          <Text style={styles.body}>Side-on, full body and barbell visible. Include full profile of the largest-diameter plate on the near side.</Text>
          <Text style={styles.body}>Max {MAX_VIDEO_DURATION_SEC}s, max {MAX_VIDEO_SIZE_BYTES / (1024 * 1024)} MB. Portrait or landscape.</Text>
          <Button label="START RECORDING" onPress={startRecording} />
          <Button label="BACK TO LANDING" variant="ghost" onPress={() => router.back()} />
          {error ? <Text style={[styles.body, { color: Colors.accentAlert }]}>{error}</Text> : null}
        </Panel>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, gap: Spacing.lg, maxWidth: 720, alignSelf: 'center', width: '100%' },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  body: { ...Typography.body, color: Colors.textSecondary },
});
