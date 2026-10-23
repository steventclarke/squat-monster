import { View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../components/Button';
import { Panel } from '../components/Panel';
import { Colors, Spacing, Typography } from '../constants/theme';

export default function Record() {
  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Panel>
          <Text style={styles.title}>RECORD</Text>
          <Text style={styles.body}>Camera capture placeholder. Full implementation in Phase 2.</Text>
          <Text style={styles.body}>Permissions and guidance will be added there.</Text>
          <Button label="GO TO LOAD INPUTS" onPress={() => router.push('/record/inputs')} />
          <Button label="BACK" variant="ghost" onPress={() => router.back()} />
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
