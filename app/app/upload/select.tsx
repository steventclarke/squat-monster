import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { Colors, Spacing, Typography } from '../../constants/theme';

export default function UploadSelect() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Panel>
          <Text style={styles.title}>SELECT VIDEO</Text>
          <Text style={styles.body}>
            Choose an existing side-on video of your barbell back squat set from your device.
          </Text>
          <Button label="BROWSE FILES" onPress={() => router.push('/upload/inputs')} />
          <Button label="BACK TO LANDING" variant="ghost" onPress={() => router.back()} />
        </Panel>
        <Panel>
          <Text style={styles.sectionTitle}>CONSTRAINTS</Text>
          <Text style={styles.body}>• Max 60 seconds</Text>
          <Text style={styles.body}>• Max 100 MB</Text>
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
