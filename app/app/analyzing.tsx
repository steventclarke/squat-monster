import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { Colors, Spacing, Typography } from '../constants/theme';

export default function Analyzing() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Panel>
          <Text style={styles.title}>ANALYZING</Text>
          <Text style={styles.body}>Analysis pipeline placeholder (Phase 3). Using mock results.</Text>
          <Button label="VIEW REPORT (MOCK)" onPress={() => router.push('/report')} />
          <Button label="CANCEL / NEW SET" variant="ghost" onPress={() => router.replace('/')} />
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
