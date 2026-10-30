/**
 * RiaSuggestionCardView.tsx
 *
 * Spec-driven Suggestion Options card for Ria AI.
 * Displays up to 3 interactive food option pills that the user can 1-tap log.
 */

import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Fonts } from '@/theme/typography';
import { Colors } from '@/theme/colors';
import { SuggestionCardData, SuggestionOption } from '@/services/ai/types/ai.types';

export interface RiaSuggestionCardViewProps {
  data: SuggestionCardData;
  onLogOption?: (option: SuggestionOption) => void;
  testID?: string;
}

export const RiaSuggestionCardView: React.FC<RiaSuggestionCardViewProps> = ({
  data,
  onLogOption,
  testID = 'ria-suggestion-card',
}) => {
  return (
    <View style={styles.outerShell} testID={testID}>
      <View style={styles.innerCore}>
        <View style={styles.headerRow}>
          <Ionicons name="sparkles" size={14} color={Colors.primary} />
          <Text style={styles.headerTitle}>Curated Meal Suggestions</Text>
        </View>

        <View style={styles.optionsList}>
          {data.options.map((opt, index) => (
            <View key={index} style={styles.optionRow}>
              <View style={styles.optionInfo}>
                <View style={styles.titleRow}>
                  <Text style={styles.optionName}>{opt.name}</Text>
                  {opt.tag ? (
                    <View style={styles.tagBadge}>
                      <Text style={styles.tagText}>{opt.tag}</Text>
                    </View>
                  ) : null}
                </View>
                <Text style={styles.optionMeta}>
                  {opt.kcal} kcal · {opt.protein}g P · {opt.carbs}g C · {opt.fat}g F
                </Text>
              </View>

              {onLogOption ? (
                <Pressable
                  style={({ pressed }) => [styles.addBtn, pressed ? styles.btnPressed : null]}
                  onPress={() => onLogOption(opt)}
                >
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Log</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  outerShell: {
    backgroundColor: '#FEF3C7',
    borderRadius: 18,
    padding: 3,
    marginVertical: 6,
  },
  innerCore: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  headerTitle: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: Colors.primaryDark,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  optionsList: {
    gap: 8,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FAF9F6',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  optionInfo: {
    flex: 1,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  optionName: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 13,
    color: '#0F172A',
  },
  tagBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 9,
    color: '#166534',
  },
  optionMeta: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  addBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addBtnText: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 12,
    color: '#FFFFFF',
  },
  btnPressed: {
    opacity: 0.85,
  },
});
