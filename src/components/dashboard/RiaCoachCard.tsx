import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView, Platform } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

interface SuggestionPrompt {
  id: string;
  icon: string;
  label: string;
  response: string;
}

const RIA_PROMPTS: SuggestionPrompt[] = [
  {
    id: 'protein',
    icon: '🍳',
    label: 'High-protein idea',
    response:
      'Try 2 Moong Dal Chilas with mint chutney (~220 kcal, 14g protein) or 2 Boiled Eggs with avocado toast for a power-packed start!',
  },
  {
    id: 'dinner',
    icon: '🥗',
    label: 'Low-carb dinner',
    response:
      'A warm bowl of Palak Paneer or Dal Tadka with 1 multi-grain Roti and cucumber salad is satisfying, high in fiber, and light (~360 kcal).',
  },
  {
    id: 'snack',
    icon: '🍵',
    label: 'Snack under 150 cal',
    response:
      'A handful of roasted chana (30g) with green tea is only 115 kcal, packing 6g of plant protein and 4g fiber to keep hunger away.',
  },
  {
    id: 'recovery',
    icon: '⚡',
    label: 'Post-workout fuel',
    response:
      '1 scoop of whey protein or a bowl of fresh Greek curd with sliced almonds will kickstart muscle protein synthesis and recovery!',
  },
];

interface RiaCoachCardProps {
  onOpenChat?: (promptText?: string) => void;
}

export const RiaCoachCard: React.FC<RiaCoachCardProps> = ({ onOpenChat }) => {
  const { totalProtein, userGoals, remainingCalories, currentLog } = useHealth();
  const [activePromptId, setActivePromptId] = useState<string | null>(null);

  // Default personalized insight based on live user data
  const liveDefaultAdvice = useMemo(() => {
    const proteinDeficit = userGoals.targetProtein - totalProtein;
    if (proteinDeficit > 25) {
      return `You have ${proteinDeficit}g of protein left to hit your ${userGoals.targetProtein}g target today. Adding paneer, Greek curd, or eggs to dinner will get you there!`;
    }
    if (currentLog.waterMl < 1500) {
      return `You've logged ${currentLog.waterMl}ml of water so far. Two more glasses before dinner will keep your metabolism active and hydration on track.`;
    }
    if (remainingCalories > 500) {
      return `You have ${remainingCalories} kcal left for the day. You can enjoy a wholesome balanced dinner with rotis, dal, and fresh greens!`;
    }
    return `Incredible consistency today! You're hitting your calorie and macro milestones. Keep this momentum going strong.`;
  }, [totalProtein, userGoals.targetProtein, currentLog.waterMl, remainingCalories]);

  const activeMessage = useMemo(() => {
    if (activePromptId) {
      const match = RIA_PROMPTS.find((p) => p.id === activePromptId);
      if (match) return match.response;
    }
    return liveDefaultAdvice;
  }, [activePromptId, liveDefaultAdvice]);

  return (
    <View style={styles.card}>
      {/* Top Header: Coach Avatar + Identity + Live Status */}
      <View style={styles.coachHeader}>
        <View style={styles.coachProfile}>
          {/* Ria 3D Avatar with Ambient Glow Ring */}
          <View style={styles.avatarWrapper}>
            <Image
              source={require('../../../assets/ria_avatar.png')}
              style={styles.avatarImg}
              contentFit="cover"
              transition={150}
            />
            {/* Active Online Pulse Dot */}
            <View style={styles.onlineDot} />
          </View>

          {/* Coach Name & Role */}
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.coachName}>Ria</Text>
              <View style={styles.aiTag}>
                <Ionicons name="sparkles" size={10} color="#F47551" />
                <Text style={styles.aiTagText}>AI COACH</Text>
              </View>
            </View>
            <Text style={styles.coachSubtitle}>Personal Nutritionist • Active Now</Text>
          </View>
        </View>

        {/* Action button: Open full conversation */}
        <Pressable
          style={({ pressed }) => [
            styles.chatActionBtn,
            pressed && styles.pressedChatBtn,
          ]}
          onPress={() => (onOpenChat ? onOpenChat() : setActivePromptId(null))}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityRole="button"
          accessibilityLabel="Open chat with Ria"
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={18}
            color="#F47551"
          />
        </Pressable>
      </View>

      {/* The Conversational Speech Bubble */}
      <View style={styles.bubbleWrapper}>
        {/* Pointer Arrow Tail pointing to Ria */}
        <View style={styles.bubbleTail} />

        <Pressable
          style={({ pressed }) => [
            styles.bubbleCard,
            pressed && styles.bubbleCardPressed,
          ]}
          onPress={() => onOpenChat && onOpenChat(activeMessage)}
          accessibilityRole="button"
          accessibilityLabel="Ask Ria about this insight"
        >
          {/* Subtle Insight Tag */}
          <View style={styles.insightTagRow}>
            <Text style={styles.insightTag}>
              {activePromptId ? '💡 RIA SUGGESTS' : '✨ DAILY NUTRITION INSIGHT'}
            </Text>
            <View style={styles.askRiaPill}>
              <Text style={styles.askRiaPillText}>Tap to chat 💬</Text>
            </View>
          </View>

          {/* Dynamic Coach Message */}
          <Text style={styles.messageText}>{activeMessage}</Text>
        </Pressable>
      </View>

      {/* Suggestion Chips: Quick Prompt Carousel */}
      <View style={styles.chipsSection}>
        <Text style={styles.chipsLabel}>Ask Ria for recommendations:</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsScroll}
        >
          {RIA_PROMPTS.map((prompt) => {
            const isSelected = activePromptId === prompt.id;
            return (
              <Pressable
                key={prompt.id}
                style={({ pressed }) => [
                  styles.chip,
                  isSelected && styles.chipSelected,
                  pressed && styles.chipPressed,
                ]}
                onPress={() => setActivePromptId(isSelected ? null : prompt.id)}
                accessibilityRole="button"
                accessibilityLabel={`Ask Ria: ${prompt.label}`}
              >
                <Text style={styles.chipIcon}>{prompt.icon}</Text>
                <Text style={[styles.chipText, isSelected && styles.chipTextSelected]}>
                  {prompt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFDFB',
    borderRadius: 20,
    marginHorizontal: 16,
    marginTop: 14,
    marginBottom: 10,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(244, 117, 81, 0.22)',
    shadowColor: '#F47551',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 2,
  },
  coachHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  coachProfile: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Ria 3D Avatar: 48x48 circle with coral border and glowing online dot
  avatarWrapper: {
    position: 'relative',
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#F47551',
    shadowColor: '#F47551',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  avatarImg: {
    width: '100%',
    height: '100%',
    borderRadius: 24,
  },
  onlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#10B981', // Emerald active dot
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  nameContainer: {
    marginLeft: 12,
    justifyContent: 'center',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  coachName: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  aiTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(244, 117, 81, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  aiTagText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 9,
    fontWeight: '700',
    color: '#F47551',
    letterSpacing: 0.4,
  },
  coachSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 1,
  },
  chatActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(244, 117, 81, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedChatBtn: {
    opacity: 0.7,
    transform: [{ scale: 0.94 }],
  },
  // Conversational Speech Bubble UX
  bubbleWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  // Bubble pointer pointing towards Ria's avatar
  bubbleTail: {
    position: 'absolute',
    top: -6,
    left: 20,
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    transform: [{ rotate: '45deg' }],
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: 'rgba(244, 117, 81, 0.18)',
    zIndex: 1,
  },
  bubbleCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderTopLeftRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: 'rgba(244, 117, 81, 0.18)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  bubbleCardPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.99 }],
  },
  insightTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  insightTag: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 9.5,
    fontWeight: '700',
    color: '#F47551',
    letterSpacing: 0.3,
  },
  insightTimestamp: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 10,
    color: '#94A3B8',
  },
  askRiaPill: {
    backgroundColor: '#FFF7ED',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFEDD5',
  },
  askRiaPillText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 9,
    color: '#EA580C',
  },
  messageText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13.5,
    lineHeight: 20,
    color: '#1E293B',
    fontWeight: '500',
  },
  // Suggestions / Quick Prompt Chips
  chipsSection: {
    marginTop: 2,
  },
  chipsLabel: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#64748B',
    marginBottom: 8,
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.08)',
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 5,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.02,
    shadowRadius: 3,
    elevation: 1,
  },
  chipPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.96 }],
  },
  chipSelected: {
    backgroundColor: '#F47551',
    borderColor: '#F47551',
    shadowColor: '#F47551',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 3,
  },
  chipIcon: {
    fontSize: 13,
  },
  chipText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11.5,
    color: '#334155',
    fontWeight: '500',
  },
  chipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
