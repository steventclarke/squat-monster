import { useState } from 'react';
import { View, Text, StyleSheet, Platform, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as DocumentPicker from 'expo-document-picker';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { MAX_VIDEO_DURATION_SEC, MAX_VIDEO_SIZE_BYTES } from '@squat-monster/shared';

export default function UploadSelect() {
  const [error, setError] = useState<string | null>(null);

  const pickVideo = async () => {
    setError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['video/mp4', 'video/quicktime'],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const asset = result.assets?.[0];
      if (!asset) return;
      const size = asset.size ?? 0;
      if (size > MAX_VIDEO_SIZE_BYTES) {
        setError(`File too large. Max ${MAX_VIDEO_SIZE_BYTES / (1024 * 1024)} MB. Trim externally.`);
        return;
      }
      // Duration check is best-effort on web/native; enforce in server too
      router.push('/upload/inputs');
    } catch (e: any) {
      setError(e?.message || 'Failed to pick video');
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Panel>
          <Text style={styles.title}>SELECT VIDEO</Text>
          <Text style={styles.body}>
            Choose an existing side-on video of your barbell back squat set from your device.
          </Text>
          <Button label="BROWSE FILES" onPress={pickVideo} />
          <Button label="BACK TO LANDING" variant="ghost" onPress={() => router.back()} />
          {error ? <Text style={[styles.body, { color: Colors.accentAlert }]}>{error}</Text> : null}
        </Panel>
        <Panel>
          <Text style={styles.sectionTitle}>CONSTRAINTS</Text>
          <Text style={styles.body}>• Max {MAX_VIDEO_DURATION_SEC} seconds</Text>
          <Text style={styles.body}>• Max {MAX_VIDEO_SIZE_BYTES / (1024 * 1024)} MB</Text>
          <Text style={styles.body}>• H.264/HEVC MP4/MOV</Text>
          <Text style={styles.body}>• No in-app trim or transcode in V1</Text>
        </Panel>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  container: { padding: Spacing.lg, gap: Spacing.lg, maxWidth: 720, alignSelf: 'center', width: '100%' },
  title: { ...Typography.subtitle, color: Colors.textPrimary },
  sectionTitle: { ...Typography.label, color: Colors.textTertiary },
  body: { ...Typography.body, color: Colors.textSecondary },
});
