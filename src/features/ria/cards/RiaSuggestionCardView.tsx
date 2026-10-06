/**
 * RiaSuggestionCardView.tsx
 *
 * Double-bezel Action Card for Ria's Meal Suggestions.
 * Renders 2-3 nutritious meal options with macro pills and 1-tap "Log this"
 * buttons per RIA_Chat.md.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';
import { SuggestionCardData, SuggestionOption } from '@/services/ai/types/ai.types';

export interface RiaSuggestionCardViewProps {
  data: SuggestionCardData;
  onLogOption: (option: SuggestionOption) => void;
  testID?: string;
}

export const RiaSuggestionCardView: React.FC<RiaSuggestionCardViewProps> = ({
  data,
  onLogOption,
  testID = 'ria-suggestion-card',
}) => {
  const handleOptionPress = async (opt: SuggestionOption) => {
    await haptics.impactLight();
    onLogOption(opt);
  };

  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        {/* Header Bar */}
        <View style={styles.headerRow}>
          <View style={styles.titleGroup}>
            <View style={styles.chefCircle}>
              <Ionicons name="restaurant" size={15} color="#059669" />
            </View>
            <View>
              <Text style={styles.titleText}>Suggested Options</Text>
              <Text style={styles.subtitleText}>Tailored to your remaining budget</Text>
            </View>
          </View>
        </View>

        {/* Options List */}
        <View style={styles.optionsList}>
          {data.options.map((opt, idx) => (
            <View key={idx} style={styles.optionCard} testID={`${testID}-option-${idx}`}>
              <View style={styles.optionHeaderRow}>
                <View style={styles.namePortionCol}>
                  <Text style={styles.optionNameText}>{opt.name}</Text>
                  {Boolean(opt.portion) && (
                    <Text style={styles.optionPortionText}>{opt.portion}</Text>
                  )}
                </View>

                {Boolean(opt.tag) && (
                  <View style={styles.tagBadge}>
                    <Text style={styles.tagBadgeText}>{opt.tag}</Text>
                  </View>
                )}
              </View>

              {/* Macro Row */}
              <View style={styles.macroRow}>
                <View style={styles.macroPill}>
                  <Text style={styles.macroPillText}>{opt.kcal} kcal</Text>
                </View>
                <View style={[styles.macroPill, styles.proteinPill]}>
                  <Text style={[styles.macroPillText, styles.proteinPillText]}>
                    {opt.protein}g P
                  </Text>
                </View>
                <View style={styles.macroPill}>
                  <Text style={styles.macroPillText}>{opt.carbs}g C</Text>
                </View>
                <View style={styles.macroPill}>
                  <Text style={styles.macroPillText}>{opt.fat}g F</Text>
                </View>

                {/* Log This CTA */}
                <Pressable
                  style={({ pressed }) => [styles.logThisBtn, pressed && styles.btnPressed]}
                  onPress={() => handleOptionPress(opt)}
                  accessibilityRole="button"
                  accessibilityLabel={`Log ${opt.name}`}
                  testID={`${testID}-log-btn-${idx}`}
                >
                  <Ionicons name="add-circle" size={14} color="#059669" />
                  <Text style={styles.logThisBtnText}>Log this</Text>
                </Pressable>
              </View>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShell: {
    backgroundColor: '#ECFDF5',
    borderRadius: 20,
    padding: 3,
    borderWidth: 1,
    borderColor: '#D1FAE5',
    marginVertical: 6,
    width: '100%',
  },
  innerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 17,
    padding: 14,
    borderWidth: 1,
    borderColor: '#ECFDF5',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chefCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#0F172A',
  },
  subtitleText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  optionsList: {
    gap: 8,
  },
  optionCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 6,
  },
  namePortionCol: {
    flex: 1,
  },
  optionNameText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  optionPortionText: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  tagBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10,
    color: '#92400E',
  },
  macroRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flexWrap: 'wrap',
  },
  macroPill: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  macroPillText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 10.5,
    color: '#475569',
  },
  proteinPill: {
    backgroundColor: '#EFF6FF',
    borderColor: '#DBEAFE',
  },
  proteinPillText: {
    color: '#2563EB',
  },
  logThisBtn: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 8,
  },
  logThisBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 11,
    color: '#059669',
  },
  btnPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
