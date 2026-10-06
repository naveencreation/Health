/**
 * RiaContextStrip.tsx
 * 
 * Slender, collapsible nutritional context strip pinned beneath the Ria Space header.
 * Displays live remaining calories and protein target to ground the conversation.
 * Hides raw numbers when sensitive mode is active.
 * 
 * Spec: RIA_Chat.md section 5, 11.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { haptics } from '@/utils/haptics';

export interface RiaContextStripProps {
  remainingCalories: number;
  proteinRemaining: number;
  isSensitiveMode?: boolean;
  testID?: string;
}

export const RiaContextStrip: React.FC<RiaContextStripProps> = ({
  remainingCalories,
  proteinRemaining,
  isSensitiveMode = false,
  testID = 'ria-context-strip',
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);

  const toggleCollapse = () => {
    haptics.selection();
    setIsCollapsed(prev => !prev);
  };

  const displayText = isSensitiveMode
    ? 'Gentle mode · Focus on balance and nourishment'
    : `${Math.max(0, remainingCalories).toLocaleString()} kcal left · ${Math.max(0, proteinRemaining)}g protein to go`;

  return (
    <Pressable
      style={styles.container}
      onPress={toggleCollapse}
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={isCollapsed ? 'Expand nutrition context' : 'Collapse nutrition context'}
    >
      <View style={styles.pillContent}>
        <View style={styles.flameDot}>
          <Ionicons
            name={isSensitiveMode ? 'heart-outline' : 'flame'}
            size={12}
            color={isSensitiveMode ? Colors.protein : Colors.primary}
          />
        </View>

        {!isCollapsed && (
          <Text style={styles.contextText} numberOfLines={1} testID="ria-context-text">
            {displayText}
          </Text>
        )}

        <Ionicons
          name={isCollapsed ? 'chevron-down' : 'chevron-up'}
          size={13}
          color="#94A3B8"
          style={styles.chevron}
        />
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    backgroundColor: '#FAF9F6',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.04)',
  },
  pillContent: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.06)',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 16,
    gap: 7,
    maxWidth: '92%',
  },
  flameDot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#FFF5F1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contextText: {
    fontFamily: Fonts.urbanist.semiBold,
    fontSize: 12,
    color: '#334155',
    letterSpacing: 0.1,
  },
  chevron: {
    marginLeft: 2,
  },
});
