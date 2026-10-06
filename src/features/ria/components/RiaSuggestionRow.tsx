/**
 * RiaSuggestionRow.tsx
 * 
 * 2 to 3 static suggestion chips rendered above the composer.
 * Templated deterministically by time of day and user onboarding struggles.
 * Strictly non-AI generated to preserve quota.
 * 
 * Spec: RIA_Chat.md section 5, 8.
 */

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

export interface RiaSuggestionRowProps {
  onSelectSuggestion: (query: string) => void;
  userStruggles?: string[];
  testID?: string;
}

interface SuggestionItem {
  id: string;
  icon: string;
  label: string;
  prompt: string;
}

export function getSuggestionsByTimeOfDay(hour: number = new Date().getHours(), struggles: string[] = []): SuggestionItem[] {
  // Morning (5:00 - 11:59)
  if (hour >= 5 && hour < 12) {
    const list: SuggestionItem[] = [
      { id: 'm1', icon: '🍳', label: 'High-protein breakfast', prompt: 'What is a quick high-protein Indian breakfast idea?' },
      { id: 'm2', icon: '☕', label: 'Coffee calories', prompt: 'How many calories are in a cup of Indian milk tea or filter coffee?' },
      { id: 'm3', icon: '💧', label: 'Water timing', prompt: 'How should I pace my water intake today for optimal fat loss?' },
    ];
    return list;
  }

  // Afternoon (12:00 - 16:59)
  if (hour >= 12 && hour < 17) {
    const list: SuggestionItem[] = [
      { id: 'a1', icon: '🍛', label: 'Healthy lunch under 500 cal', prompt: 'Suggest a balanced Indian lunch under 500 kcal with good protein.' },
      { id: 'a2', icon: '🥗', label: 'Rice in my deficit', prompt: 'Can I eat white rice for lunch and stay within my calorie deficit?' },
      { id: 'a3', icon: '⚡', label: 'Beat afternoon slump', prompt: 'What can I eat or drink right now to beat the post-lunch energy slump?' },
    ];
    return list;
  }

  // Evening (17:00 - 20:59)
  if (hour >= 17 && hour < 21) {
    const list: SuggestionItem[] = [
      { id: 'e1', icon: '🍵', label: 'Snack under 120 cal', prompt: 'What is a quick evening snack under 120 calories with some protein?' },
      { id: 'e2', icon: '🥘', label: 'Light dinner idea', prompt: 'What is a light, high-protein dinner idea for tonight?' },
      { id: 'e3', icon: '📊', label: 'Review my day', prompt: 'How is my calorie and protein progress looking today?' },
    ];
    return list;
  }

  // Night (21:00 - 4:59)
  const list: SuggestionItem[] = [
    { id: 'n1', icon: '🌙', label: 'Review my day', prompt: 'How did my nutrition and calories go today?' },
    { id: 'n2', icon: '🍵', label: 'Night craving fix', prompt: 'I feel like snacking right now. What is a safe, zero-guilt way to satisfy this craving?' },
    { id: 'n3', icon: '🥣', label: 'Tomorrow breakfast plan', prompt: 'Help me plan a high-protein breakfast for tomorrow morning.' },
  ];

  // If user has specific late night struggle, prioritize craving chip
  if (struggles.includes('late_night') || struggles.includes('cravings')) {
    return [list[1], list[0], list[2]];
  }

  return list;
}

export const RiaSuggestionRow: React.FC<RiaSuggestionRowProps> = ({
  onSelectSuggestion,
  userStruggles = [],
  testID = 'ria-suggestion-row',
}) => {
  const suggestions = useMemo(
    () => getSuggestionsByTimeOfDay(undefined, userStruggles),
    [userStruggles]
  );

  const handlePress = (prompt: string) => {
    haptics.selection();
    onSelectSuggestion(prompt);
  };

  return (
    <View style={styles.container} testID={testID}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {suggestions.map(item => (
          <Pressable
            key={item.id}
            style={({ pressed }) => [styles.chip, pressed && styles.chipPressed]}
            onPress={() => handlePress(item.prompt)}
            testID={`suggestion-chip-${item.id}`}
            accessibilityRole="button"
            accessibilityLabel={item.label}
          >
            <Text style={styles.chipIcon}>{item.icon}</Text>
            <Text style={styles.chipText}>{item.label}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 6,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    gap: 6,
    elevation: 0,
    shadowColor: 'transparent',
  },
  chipPressed: {
    backgroundColor: '#FFF5F1',
    borderColor: '#FFD5C6',
    transform: [{ scale: 0.98 }],
  },
  chipIcon: {
    fontSize: 12,
  },
  chipText: {
    fontFamily: Fonts.urbanist.medium,
    fontSize: 12,
    color: '#334155',
  },
});
