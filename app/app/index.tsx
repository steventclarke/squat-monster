import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { Colors, Spacing, Typography } from '../constants/theme';

export default function Landing() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>SQUAT MONSTER</Text>
          <Text style={styles.subtitle}>BAR SPEED • BAR PATH • FORCE</Text>
        </View>

        <Panel>
          <Text style={styles.sectionTitle}>PRIMARY ACTION</Text>
          <Button label="UPLOAD A SET VIDEO" onPress={() => router.push('/upload/select')} />
          <Text style={styles.body}>
            Upload an existing side-on video of your barbell back squat set. Max 60 seconds, 100 MB. H.264/HEVC MP4/MOV.
          </Text>
        </Panel>

        <Panel>
          <Text style={styles.sectionTitle}>SECONDARY ACTION</Text>
          <Button label="RECORD A SET" variant="secondary" onPress={() => router.push('/record')} />
          <Text style={styles.body}>
            Record in-app if you don't have a video ready. Same constraints apply.
          </Text>
        </Panel>

        <Panel>
          <Text style={styles.sectionTitle}>CAMERA SETUP</Text>
          <Text style={styles.body}>• Side-on angle, full body and barbell visible</Text>
          <Text style={styles.body}>• Full profile of the largest-diameter plate on the near side</Text>
          <Text style={styles.body}>• Plate diameter default 450 mm (selectable)</Text>
          <Text style={styles.body}>• Total weight including bar must be entered for force</Text>
          <Text style={styles.body}>• Portrait or landscape; tripod preferred but not required</Text>
          <Text style={styles.body}>• Private by default; source video deleted after 30 days</Text>
        </Panel>

        <Panel>
          <Text style={styles.sectionTitle}>PLATFORMS</Text>
          <Text style={styles.body}>iOS 16+, Android 10+, latest two versions of Safari/Chrome/Firefox/Edge</Text>
        </Panel>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  container: {
    padding: Spacing.lg,
    gap: Spacing.lg,
    maxWidth: 720,
    alignSelf: 'center',
    width: '100%',
  },
  header: {
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.xl,
  },
  title: {
    ...Typography.title,
    color: Colors.textPrimary,
  },
  subtitle: {
    ...Typography.label,
    color: Colors.accent,
  },
  sectionTitle: {
    ...Typography.label,
    color: Colors.textTertiary,
  },
  body: {
    ...Typography.body,
    color: Colors.textSecondary,
  },
});
