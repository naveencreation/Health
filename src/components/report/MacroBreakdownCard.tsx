import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';

export interface MacroNutrientData {
  consumedGrams: number;
  targetGrams: number;
}

export interface MacroBreakdownCardProps {
  protein: MacroNutrientData;
  carbs: MacroNutrientData;
  fat: MacroNutrientData;
  fiber: MacroNutrientData;
  selectedDayLabel?: string;
}

export const MacroBreakdownCard: React.FC<MacroBreakdownCardProps> = ({
  protein,
  carbs,
  fat,
  fiber,
  selectedDayLabel,
}) => {
  const macros = [
    {
      name: 'PROTEIN',
      color: Colors.protein,
      bgColor: Colors.proteinLight,
      consumed: Math.round(protein.consumedGrams),
      target: Math.round(protein.targetGrams),
      unit: 'g',
      isOverOk: true, // Higher protein is good
    },
    {
      name: 'CARBS',
      color: Colors.carbs,
      bgColor: Colors.carbsLight,
      consumed: Math.round(carbs.consumedGrams),
      target: Math.round(carbs.targetGrams),
      unit: 'g',
      isOverOk: false,
    },
    {
      name: 'FAT',
      color: Colors.fat,
      bgColor: Colors.fatLight,
      consumed: Math.round(fat.consumedGrams),
      target: Math.round(fat.targetGrams),
      unit: 'g',
      isOverOk: false,
    },
    {
      name: 'FIBER',
      color: Colors.fiber,
      bgColor: Colors.fiberLight,
      consumed: Math.round(fiber.consumedGrams),
      target: Math.round(fiber.targetGrams),
      unit: 'g',
      isOverOk: true,
    },
  ];

  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.cardTitle}>Macronutrient Distribution</Text>
          <Text style={styles.cardSubtitle}>
            {selectedDayLabel ? `Daily macro breakdown for ${selectedDayLabel}` : 'Daily macro target compliance'}
          </Text>
        </View>
      </View>

      <View style={styles.macroList}>
        {macros.map((m) => {
          const ratio = m.target > 0 ? m.consumed / m.target : 0;
          const pct = Math.min(100, Math.round(ratio * 100));
          const isOver = m.consumed > m.target;
          const diff = m.consumed - m.target;

          let badgeStyle = styles.badgeNeutral;
          let badgeTextStyle = styles.badgeTextNeutral;
          let badgeLabel = `${pct}% Met`;
          let showCheck = false;

          if (m.consumed === 0) {
            badgeLabel = 'No logs';
          } else if (m.isOverOk) {
            if (m.consumed >= m.target) {
              badgeStyle = styles.badgeGreen;
              badgeTextStyle = styles.badgeTextGreen;
              badgeLabel = 'Target Met';
              showCheck = true;
            }
          } else {
            if (isOver) {
              badgeStyle = styles.badgeCoral;
              badgeTextStyle = styles.badgeTextCoral;
              badgeLabel = `+${diff}g Over`;
            } else {
              badgeStyle = styles.badgeGreen;
              badgeTextStyle = styles.badgeTextGreen;
              badgeLabel = 'On Budget';
              showCheck = true;
            }
          }

          return (
            <View key={m.name} style={styles.macroItem}>
              {/* Top row: Label & Status Badge */}
              <View style={styles.macroItemTop}>
                <View style={styles.labelGroup}>
                  <View style={[styles.macroDot, { backgroundColor: m.color }]} />
                  <Text style={styles.macroName}>{m.name}</Text>
                </View>

                <View style={[styles.badge, badgeStyle]}>
                  {showCheck && <Ionicons name="checkmark-circle" size={11} color="#15803D" style={{ marginRight: 3 }} />}
                  <Text style={[styles.badgeText, badgeTextStyle]}>{badgeLabel}</Text>
                </View>
              </View>

              {/* Middle row: Consumed / Target Grams */}
              <View style={styles.gramsRow}>
                <Text style={styles.gramsConsumed}>{m.consumed}{m.unit}</Text>
                <Text style={styles.gramsTarget}> / {m.target}{m.unit} daily goal</Text>
              </View>

              {/* Progress bar */}
              <View style={[styles.progressTrack, { backgroundColor: m.bgColor }]}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${pct}%`,
                      backgroundColor: m.color,
                    },
                  ]}
                />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderCurve: 'continuous',
    borderWidth: 1,
    borderColor: 'rgba(15, 23, 42, 0.06)',
    paddingVertical: 16,
    paddingHorizontal: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  cardTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: -0.2,
  },
  cardSubtitle: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  macroList: {
    gap: 12,
  },
  macroItem: {
    paddingVertical: 4,
  },
  macroItemTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  labelGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  macroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  macroName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    fontWeight: '700',
    color: '#334155',
    letterSpacing: 0.5,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  badgeGreen: {
    backgroundColor: '#E8F6E9',
  },
  badgeCoral: {
    backgroundColor: '#FEE2E2',
  },
  badgeNeutral: {
    backgroundColor: '#F1F5F9',
  },
  badgeText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    fontWeight: '700',
  },
  badgeTextGreen: {
    color: '#15803D',
  },
  badgeTextCoral: {
    color: '#DC2626',
  },
  badgeTextNeutral: {
    color: '#64748B',
  },
  gramsRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 6,
  },
  gramsConsumed: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  gramsTarget: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#94A3B8',
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
});
