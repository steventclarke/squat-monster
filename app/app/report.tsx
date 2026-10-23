import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { Colors, Spacing, Typography } from '../constants/theme';

export default function Report() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <ScrollView contentContainerStyle={styles.container}>
        <Panel>
          <Text style={styles.title}>REPORT</Text>
          <Text style={styles.sectionTitle}>SET SUMMARY (MOCK)</Text>
          <Text style={styles.body}>Reps: 3 | Set avg speed: 0.62 m/s | Set peak speed: 0.78 m/s</Text>
          <Text style={styles.body}>Set avg force: 1240 N | Set peak force: 1480 N</Text>
          <Text style={styles.body}>Verticality: Max dev 12 mm | RMS dev 6 mm</Text>
        </Panel>
        <Panel>
          <Text style={styles.sectionTitle}>REPS</Text>
          <Text style={styles.body}>Rep 1: 0.60 m/s avg / 0.76 m/s peak | 1200 N avg / 1460 N peak</Text>
          <Text style={styles.body}>Rep 2: 0.63 m/s avg / 0.78 m/s peak | 1260 N avg / 1480 N peak</Text>
          <Text style={styles.body}>Rep 3: 0.63 m/s avg / 0.77 m/s peak | 1260 N avg / 1470 N peak</Text>
        </Panel>
        <Panel>
          <Text style={styles.sectionTitle}>OVERLAY & CHARTS</Text>
          <Text style={styles.body}>Video overlay and charts will be implemented in Phase 6.</Text>
        </Panel>
        <Panel>
          <Text style={styles.sectionTitle}>NOTES</Text>
          <Text style={styles.body}>Force uses total external load including bar; bodyweight excluded. Shown only if valid load and stable acceleration.</Text>
        </Panel>
        <Button label="NEW SET" onPress={() => router.replace('/')} />
      </ScrollView>
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
