/**
 * Ria's meal ideas: a pick-one list. Log adds the idea to the meal for the current
 * time of day, which the header names.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { SuggestionCardData, SuggestionOption } from '@/services/ai/types/ai.types';
import { resolveContextualMealSlot } from '@/services/ai/cards/RiaCardParser';
import { CardHeader, CardShell, SmallButton, fmt, slotLabel, CardText as Text } from './RiaCardUI';

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
  const meal = slotLabel(resolveContextualMealSlot());
  return (
    <CardShell testID={testID}>
      <CardHeader
        icon="sparkles"
        tone="ria"
        title={`${meal} ideas`}
        subtitle={onLogOption ? `Tap Log to add to ${meal}` : undefined}
      />
      <View>
        {data.options.map((opt, i) => {
          const logged = data.loggedOptions?.includes(opt.name);
          return (
            <View key={`${opt.name}_${i}`} style={[styles.row, i > 0 && styles.rowDivider]}>
              <View style={styles.body}>
                <Text style={styles.name}>
                  {opt.name}
                  {opt.tag ? <Text style={styles.tag}>{`  ${opt.tag}  `}</Text> : null}
                </Text>
                <Text style={styles.meta}>
                  {`${fmt(opt.kcal)} kcal · ${Math.round(opt.protein)} g protein${opt.portion ? ` · ${opt.portion}` : ''}`}
                </Text>
              </View>
              {logged ? (
                <View style={styles.logged} accessible accessibilityLabel={`${opt.name} logged`}>
                  <Ionicons name="checkmark" size={16} color={Colors.primaryDeep} />
                  <Text style={styles.loggedText}>Logged</Text>
                </View>
              ) : onLogOption ? (
                <SmallButton
                  label="Log"
                  onPress={() => onLogOption(opt)}
                  accessibilityLabel={`Log ${opt.name}`}
                />
              ) : null}
            </View>
          );
        })}
      </View>
    </CardShell>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  rowDivider: { borderTopWidth: 1, borderTopColor: Colors.borderWhisper },
  body: { flex: 1, minWidth: 0 },
  name: { fontFamily: Fonts.urbanist.bold, fontSize: 14, color: Colors.textPrimary },
  tag: {
    fontFamily: Fonts.urbanist.bold,
    fontSize: 11,
    color: Colors.textSlate600,
    backgroundColor: Colors.surfaceContainer,
  },
  meta: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 13,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  logged: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 36,
    paddingHorizontal: 6,
  },
  loggedText: { fontFamily: Fonts.urbanist.bold, fontSize: 13, color: Colors.primaryDeep },
});
