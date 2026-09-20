import React from 'react';
import { StyleSheet, View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

interface DailyTargetsCardProps {
  calorieBudget: string;
  setCalorieBudget: (v: string) => void;
  targetProtein: string;
  setTargetProtein: (v: string) => void;
  targetCarbs: string;
  setTargetCarbs: (v: string) => void;
  targetFat: string;
  setTargetFat: (v: string) => void;
  targetFiber: string;
  setTargetFiber: (v: string) => void;
  waterGoal: string;
  setWaterGoal: (v: string) => void;
  stepGoal: string;
  setStepGoal: (v: string) => void;
  activePreset: 'fat_loss' | 'muscle_gain' | 'maintenance';
  applyPreset: (preset: 'fat_loss' | 'muscle_gain' | 'maintenance') => void;
  proteinPct: number;
  carbsPct: number;
  fatPct: number;
  macroDiff: number;
  computedMacroCals: number;
}

export const DailyTargetsCard: React.FC<DailyTargetsCardProps> = ({
  calorieBudget,
  setCalorieBudget,
  targetProtein,
  setTargetProtein,
  targetCarbs,
  setTargetCarbs,
  targetFat,
  setTargetFat,
  targetFiber,
  setTargetFiber,
  waterGoal,
  setWaterGoal,
  stepGoal,
  setStepGoal,
  activePreset,
  applyPreset,
  proteinPct,
  carbsPct,
  fatPct,
  macroDiff,
  computedMacroCals,
}) => {
  return (
    <View style={styles.card}>
      {/* Preset Buttons */}
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.cardTitle}>Goal Presets</Text>
          <Text style={styles.cardSubtitle}>Auto-tune calorie & macronutrient targets</Text>
        </View>
        <View style={styles.headerIconCircle}>
          <Ionicons name="sparkles" size={16} color={Colors.primary} />
        </View>
      </View>

      <View style={styles.presetsRow}>
        <Pressable
          style={({ pressed }) => [
            styles.presetBtn,
            activePreset === 'fat_loss' ? styles.presetBtnSelected : null,
            pressed ? styles.pressedPreset : null,
          ]}
          onPress={() => applyPreset('fat_loss')}
          accessibilityRole="button"
          accessibilityState={{ selected: activePreset === 'fat_loss' }}
          accessibilityLabel="Apply Fat Loss preset, 1650 kcal, 40% carbs, 30% protein, 30% fat"
        >
          <Text style={styles.presetEmoji}>🔥</Text>
          <Text style={styles.presetLabel}>Fat Loss</Text>
          <Text style={styles.presetMeta}>1,650 kcal</Text>
          <Text style={styles.presetSplit}>40C • 30P • 30F</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.presetBtn,
            activePreset === 'muscle_gain' ? styles.presetBtnSelected : null,
            pressed ? styles.pressedPreset : null,
          ]}
          onPress={() => applyPreset('muscle_gain')}
          accessibilityRole="button"
          accessibilityState={{ selected: activePreset === 'muscle_gain' }}
          accessibilityLabel="Apply Muscle Build preset, 2300 kcal, 45% carbs, 30% protein, 25% fat"
        >
          <Text style={styles.presetEmoji}>💪</Text>
          <Text style={styles.presetLabel}>Muscle Build</Text>
          <Text style={styles.presetMeta}>2,300 kcal</Text>
          <Text style={styles.presetSplit}>45C • 30P • 25F</Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.presetBtn,
            activePreset === 'maintenance' ? styles.presetBtnSelected : null,
            pressed ? styles.pressedPreset : null,
          ]}
          onPress={() => applyPreset('maintenance')}
          accessibilityRole="button"
          accessibilityState={{ selected: activePreset === 'maintenance' }}
          accessibilityLabel="Apply Maintenance preset, 1950 kcal, 45% carbs, 20% protein, 35% fat"
        >
          <Text style={styles.presetEmoji}>⚖️</Text>
          <Text style={styles.presetLabel}>Maintain</Text>
          <Text style={styles.presetMeta}>1,950 kcal</Text>
          <Text style={styles.presetSplit}>45C • 20P • 35F</Text>
        </Pressable>
      </View>

      {/* Macro Ratio Visual Bar */}
      <View style={styles.macroRatioSection}>
        <View style={styles.macroRatioHeader}>
          <Text style={styles.macroRatioTitle}>Macro Energy Distribution</Text>
          <Text style={styles.macroRatioSum}>{computedMacroCals} kcal calculated</Text>
        </View>
        <View style={styles.macroBar}>
          <View style={[styles.macroBarSeg, styles.macroBarProtein, { flex: Math.max(1, proteinPct) }]} />
          <View style={[styles.macroBarSeg, styles.macroBarCarbs, { flex: Math.max(1, carbsPct) }]} />
          <View style={[styles.macroBarSeg, styles.macroBarFat, { flex: Math.max(1, fatPct) }]} />
        </View>
        <View style={styles.macroLegendRow}>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotProtein]} />
            <Text style={styles.legendText}>Protein ({proteinPct}%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotCarbs]} />
            <Text style={styles.legendText}>Carbs ({carbsPct}%)</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, styles.legendDotFat]} />
            <Text style={styles.legendText}>Fat ({fatPct}%)</Text>
          </View>
        </View>
        {Math.abs(macroDiff) > 50 ? (
          <View style={styles.diffWarning}>
            <Ionicons name="information-circle-outline" size={14} color="#D97706" />
            <Text style={styles.diffWarningText}>
              Macros total {computedMacroCals} kcal ({macroDiff > 0 ? `+${macroDiff}` : macroDiff} kcal vs budget)
            </Text>
          </View>
        ) : null}
      </View>

      {/* Inputs Form */}
      <View style={styles.fieldGroup}>
        <View style={styles.fieldLabelRow}>
          <Ionicons name="flame" size={14} color={Colors.primary} style={styles.fieldIcon} />
          <Text style={styles.fieldLabel}>Daily Calorie Budget</Text>
          <Text style={styles.fieldUnit}>kcal / day</Text>
        </View>
        <TextInput
          style={styles.input}
          keyboardType="numeric"
          value={calorieBudget}
          onChangeText={setCalorieBudget}
        />
      </View>

      <View style={styles.grid2}>
        <View style={styles.flex1}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="restaurant" size={14} color="#10B981" style={styles.fieldIcon} />
            <Text style={styles.fieldLabel}>Protein</Text>
            <Text style={styles.fieldUnit}>g</Text>
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={targetProtein}
            onChangeText={setTargetProtein}
          />
        </View>

        <View style={styles.flex1}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="pizza" size={14} color="#EAB308" style={styles.fieldIcon} />
            <Text style={styles.fieldLabel}>Carbs</Text>
            <Text style={styles.fieldUnit}>g</Text>
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={targetCarbs}
            onChangeText={setTargetCarbs}
          />
        </View>
      </View>

      <View style={styles.grid2}>
        <View style={styles.flex1}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="water" size={14} color="#F47551" style={styles.fieldIcon} />
            <Text style={styles.fieldLabel}>Fat</Text>
            <Text style={styles.fieldUnit}>g</Text>
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={targetFat}
            onChangeText={setTargetFat}
          />
        </View>

        <View style={styles.flex1}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="leaf" size={14} color="#059669" style={styles.fieldIcon} />
            <Text style={styles.fieldLabel}>Dietary Fiber</Text>
            <Text style={styles.fieldUnit}>g</Text>
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={targetFiber}
            onChangeText={setTargetFiber}
          />
        </View>
      </View>

      <View style={styles.grid2}>
        <View style={styles.flex1}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="water-outline" size={14} color="#2563EB" style={styles.fieldIcon} />
            <Text style={styles.fieldLabel}>Water Target</Text>
            <Text style={styles.fieldUnit}>ml</Text>
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={waterGoal}
            onChangeText={setWaterGoal}
          />
        </View>

        <View style={styles.flex1}>
          <View style={styles.fieldLabelRow}>
            <Ionicons name="footsteps" size={14} color="#EA580C" style={styles.fieldIcon} />
            <Text style={styles.fieldLabel}>Step Goal</Text>
            <Text style={styles.fieldUnit}>steps</Text>
          </View>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={stepGoal}
            onChangeText={setStepGoal}
          />
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 10,
    elevation: 2,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 16,
    color: '#0F172A',
  },
  cardSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  headerIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF7ED',
    alignItems: 'center',
    justifyContent: 'center',
  },
  presetsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  presetBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF7ED',
  },
  pressedPreset: {
    transform: [{ scale: 0.98 }],
    opacity: 0.9,
  },
  presetEmoji: {
    fontSize: 18,
    marginBottom: 4,
  },
  presetLabel: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#0F172A',
    textAlign: 'center',
  },
  presetMeta: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#64748B',
    marginTop: 2,
  },
  presetSplit: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 9,
    color: Colors.primary,
    marginTop: 3,
  },
  macroRatioSection: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  macroRatioHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  macroRatioTitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#334155',
  },
  macroRatioSum: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  macroBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginBottom: 8,
  },
  macroBarSeg: {
    height: '100%',
  },
  macroBarProtein: {
    backgroundColor: '#10B981',
  },
  macroBarCarbs: {
    backgroundColor: '#F59E0B',
  },
  macroBarFat: {
    backgroundColor: '#F47551',
  },
  macroLegendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendDotProtein: {
    backgroundColor: '#10B981',
  },
  legendDotCarbs: {
    backgroundColor: '#F59E0B',
  },
  legendDotFat: {
    backgroundColor: '#F47551',
  },
  legendText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  diffWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    backgroundColor: '#FEF3C7',
    padding: 6,
    borderRadius: 6,
  },
  diffWarningText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#92400E',
  },
  fieldGroup: {
    marginBottom: 12,
  },
  fieldLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  fieldIcon: {
    marginRight: 6,
  },
  fieldLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: '#334155',
    flex: 1,
  },
  fieldUnit: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#94A3B8',
  },
  input: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 0,
    height: 44,
    fontFamily: Fonts.poppins.medium,
    fontSize: 14,
    color: '#0F172A',
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  grid2: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  flex1: {
    flex: 1,
  },
});
