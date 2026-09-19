import React from 'react';
import { StyleSheet, View, Text, Modal, ScrollView, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';

interface AwardsModalSheetProps {
  visible: boolean;
  onClose: () => void;
}

export const AwardsModalSheet: React.FC<AwardsModalSheetProps> = ({ visible, onClose }) => {
  const { userGoals, dailyLogs } = useHealth();
  const streakDays = userGoals.streakDays || 1;

  // Real database analytics derived from dailyLogs
  const logsList = Object.values(dailyLogs || {});
  const totalLifetimeSteps = logsList.reduce((sum, l) => sum + (l.steps || 0), 0);
  const targetWater = userGoals.waterGoalMl || 2000;
  const daysWaterGoalMet = logsList.filter((l) => (l.waterMl || 0) >= targetWater).length;
  const daysMealsLogged = logsList.filter((l) => Array.isArray(l.meals) && l.meals.length > 0).length;

  const awards = [
    {
      id: 'streak-7',
      title: '7-Day Discipline',
      desc: 'Logged nutrition and activity for 7 consecutive days',
      icon: 'flame',
      color: '#EA580C',
      bgColor: '#FFEDD5',
      unlocked: streakDays >= 7,
      progress: streakDays >= 7 ? 'Unlocked' : `${streakDays} / 7 days`,
    },
    {
      id: 'hydration-master',
      title: 'Hydration Pioneer',
      desc: `Achieved daily ${(targetWater / 1000).toFixed(1)}L water intake target 5 times`,
      icon: 'water',
      color: '#2563EB',
      bgColor: '#DBEAFE',
      unlocked: daysWaterGoalMet >= 5,
      progress: daysWaterGoalMet >= 5 ? 'Unlocked' : `${daysWaterGoalMet} / 5 days`,
    },
    {
      id: 'macro-balance',
      title: 'Nutritional Consistency',
      desc: 'Logged complete daily meals on at least 3 separate days',
      icon: 'ribbon',
      color: '#16A34A',
      bgColor: '#DCFCE7',
      unlocked: daysMealsLogged >= 3,
      progress: daysMealsLogged >= 3 ? 'Unlocked' : `${daysMealsLogged} / 3 days`,
    },
    {
      id: 'century-club',
      title: 'Century Stepper',
      desc: 'Accumulate 100,000 total recorded steps in Calori',
      icon: 'footsteps',
      color: '#8B5CF6',
      bgColor: '#EDE9FE',
      unlocked: totalLifetimeSteps >= 100000,
      progress: totalLifetimeSteps >= 100000 ? 'Unlocked' : `${totalLifetimeSteps.toLocaleString()} / 100,000`,
    },
  ];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable style={styles.backdropPressable} onPress={onClose} />

        <View style={styles.sheetContainer}>
          {/* Header Bar */}
          <View style={styles.sheetHeader}>
            <View style={styles.dragPill} />
            <View style={styles.headerRow}>
              <View style={styles.headerTitleStack}>
                <Text style={styles.sheetTitle}>Awards & Achievements</Text>
                <Text style={styles.sheetSubtitle}>Milestones, consistency streaks, and badges</Text>
              </View>
              <Pressable
                style={({ pressed }) => [styles.closeBtn, pressed && styles.pressedSubtle]}
                onPress={onClose}
                hitSlop={8}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </Pressable>
            </View>
          </View>

          <ScrollView
            style={styles.sheetScroll}
            contentContainerStyle={styles.sheetScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Streak Spotlight Hero */}
            <View style={styles.streakHero}>
              <View style={styles.streakIconCircle}>
                <Ionicons name="flame" size={28} color="#EA580C" />
              </View>
              <View style={styles.streakInfo}>
                <Text style={styles.streakVal}>{streakDays} Days</Text>
                <Text style={styles.streakLabel}>Current Active Logging Streak</Text>
              </View>
              <View style={styles.streakBadge}>
                <Text style={styles.streakBadgeText}>ON FIRE</Text>
              </View>
            </View>

            <Text style={styles.sectionHeader}>Trophies & Badges</Text>
            
            <View style={styles.awardsList}>
              {awards.map((item, index) => (
                <View key={item.id}>
                  <View style={[styles.awardItem, !item.unlocked && styles.awardItemLocked]}>
                    <View style={[styles.awardIconBox, { backgroundColor: item.bgColor }]}>
                      <Ionicons
                        name={item.icon as any}
                        size={20}
                        color={item.unlocked ? item.color : '#94A3B8'}
                      />
                    </View>
                    <View style={styles.awardTextStack}>
                      <View style={styles.awardTitleRow}>
                        <Text style={[styles.awardTitle, !item.unlocked && styles.awardTitleLocked]}>
                          {item.title}
                        </Text>
                        <Text style={[styles.awardProgress, item.unlocked && styles.awardUnlockedText]}>
                          {item.progress}
                        </Text>
                      </View>
                      <Text style={styles.awardDesc}>{item.desc}</Text>
                    </View>
                  </View>
                  {index < awards.length - 1 && <View style={styles.divider} />}
                </View>
              ))}
            </View>

            <Pressable
              style={({ pressed }) => [styles.doneBtn, pressed && styles.pressedSubtle]}
              onPress={onClose}
            >
              <Text style={styles.doneBtnText}>Close Awards</Text>
            </Pressable>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  backdropPressable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  sheetContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#F8FAFC',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 20,
    overflow: 'hidden',
  },
  sheetHeader: {
    alignItems: 'center',
    paddingTop: 10,
    paddingHorizontal: 20,
    paddingBottom: 14,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.05)',
  },
  dragPill: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#CBD5E1',
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  headerTitleStack: {
    flex: 1,
  },
  sheetTitle: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 17,
    color: '#0F172A',
  },
  sheetSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressedSubtle: {
    opacity: 0.75,
  },
  sheetScroll: {
    flexGrow: 0,
  },
  sheetScrollContent: {
    padding: 16,
    paddingBottom: 36,
  },
  streakHero: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
    gap: 12,
  },
  streakIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FFEDD5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakInfo: {
    flex: 1,
  },
  streakVal: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 20,
    color: '#0F172A',
  },
  streakLabel: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11.5,
    color: '#64748B',
    marginTop: 1,
  },
  streakBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  streakBadgeText: {
    fontFamily: Fonts.poppins.bold,
    fontSize: 10,
    color: '#C2410C',
    letterSpacing: 0.5,
  },
  sectionHeader: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#334155',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 10,
    marginTop: 6,
  },
  awardsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.05)',
  },
  awardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    gap: 12,
  },
  awardItemLocked: {
    opacity: 0.6,
  },
  awardIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  awardTextStack: {
    flex: 1,
  },
  awardTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  awardTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  awardTitleLocked: {
    color: '#64748B',
  },
  awardProgress: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#94A3B8',
  },
  awardUnlockedText: {
    color: '#16A34A',
  },
  awardDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
    lineHeight: 15,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
  },
  doneBtn: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  doneBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 14,
    color: '#FFFFFF',
  },
});
