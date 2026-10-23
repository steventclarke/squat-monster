import { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Button } from '../../components/Button';
import { Panel } from '../../components/Panel';
import { Colors, Spacing, Typography } from '../../constants/theme';
import { DEFAULT_PLATE_DIAMETER_MM, LOAD_UNITS } from '@squat-monster/shared';

export default function RecordInputs() {
  const [plateDiameter, setPlateDiameter] = useState(String(DEFAULT_PLATE_DIAMETER_MM));
  const [loadValue, setLoadValue] = useState('');
  const [loadUnit, setLoadUnit] = useState<'kg' | 'lb'>('kg');

  const canContinue = loadValue.trim().length > 0 && Number(loadValue) > 0;

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'left', 'right']}>
      <View style={styles.container}>
        <Panel>
          <Text style={styles.title}>RECORD INPUTS</Text>
          <Text style={styles.body}>Total weight including the bar is required to compute force.</Text>

          <Text style={styles.label}>PLATE DIAMETER (MM)</Text>
          <TextInput
            value={plateDiameter}
            onChangeText={setPlateDiameter}
            keyboardType="numeric"
            style={styles.input}
            placeholderTextColor={Colors.textTertiary}
          />

          <Text style={styles.label}>TOTAL LOAD</Text>
          <View style={styles.row}>
            <TextInput
              value={loadValue}
              onChangeText={setLoadValue}
              keyboardType="decimal-pad"
              style={[styles.input, styles.loadInput]}
              placeholder="e.g. 100"
              placeholderTextColor={Colors.textTertiary}
            />
            <View style={styles.unitRow}>
              {LOAD_UNITS.map((unit) => (
                <Button
                  key={unit}
                  label={unit.toUpperCase()}
                  variant={loadUnit === unit ? 'primary' : 'ghost'}
                  onPress={() => setLoadUnit(unit)}
                  style={styles.unitBtn}
                />
              ))}
            </View>
          </View>

          <Button label="CONTINUE" onPress={() => router.push('/analyzing')} disabled={!canContinue} />
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
  label: { ...Typography.label, color: Colors.textTertiary },
  body: { ...Typography.body, color: Colors.textSecondary },
  input: {
    backgroundColor: Colors.surface,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: Radius.sm,
    color: Colors.textPrimary,
    padding: Spacing.md,
    fontSize: 16,
  },
  row: { flexDirection: 'row', gap: Spacing.md, alignItems: 'center', flexWrap: 'wrap' },
  loadInput: { flex: 1, minWidth: 120 },
  unitRow: { flexDirection: 'row', gap: Spacing.sm },
  unitBtn: { paddingHorizontal: Spacing.lg },
});
