import React from 'react';
import { StyleSheet, View, Text, Switch, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';

interface PreferencesCardProps {
  riaTone: 'supportive' | 'focused' | 'scientific';
  setRiaTone: (t: 'supportive' | 'focused' | 'scientific') => void;
  waterReminder: boolean;
  setWaterReminder: (v: boolean) => void;
  mealReminder: boolean;
  setMealReminder: (v: boolean) => void;
  stepReminder: boolean;
  setStepReminder: (v: boolean) => void;
}

export const PreferencesCard: React.FC<PreferencesCardProps> = ({
  riaTone,
  setRiaTone,
  waterReminder,
  setWaterReminder,
  mealReminder,
  setMealReminder,
  stepReminder,
  setStepReminder,
}) => {
  return (
    <View style={styles.container}>
      {/* 1. Ria AI Coach Personality */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <View>
            <Text style={styles.cardTitle}>Ria AI Coaching Style</Text>
            <Text style={styles.cardSubtitle}>Customize how Ria interacts and motivates you</Text>
          </View>
          <View style={styles.coachBadge}>
            <Ionicons name="chatbubbles" size={16} color="#2563EB" />
          </View>
        </View>

        <View style={styles.personalityCol}>
          <Pressable
            style={({ pressed }) => [
              styles.personalityCard,
              riaTone === 'supportive' && styles.personalityCardActive,
              pressed && styles.personalityPressed,
            ]}
            onPress={() => setRiaTone('supportive')}
          >
            <Text style={styles.personalityEmoji}>🌟</Text>
            <View style={styles.flex1}>
              <Text style={styles.personalityTitle}>Warm & Encouraging</Text>
              <Text style={styles.personalityDesc}>
                Celebrates streaks, offers gentle reminders, and focuses on positive reinforcement.
              </Text>
            </View>
            {riaTone === 'supportive' ? (
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            ) : null}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.personalityCard,
              riaTone === 'focused' && styles.personalityCardActive,
              pressed && styles.personalityPressed,
            ]}
            onPress={() => setRiaTone('focused')}
          >
            <Text style={styles.personalityEmoji}>🎯</Text>
            <View style={styles.flex1}>
              <Text style={styles.personalityTitle}>Disciplined & Direct</Text>
              <Text style={styles.personalityDesc}>
                Firm accountability, timely notifications, and zero sugarcoating of calorie overages.
              </Text>
            </View>
            {riaTone === 'focused' ? (
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            ) : null}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.personalityCard,
              riaTone === 'scientific' && styles.personalityCardActive,
              pressed && styles.personalityPressed,
            ]}
            onPress={() => setRiaTone('scientific')}
          >
            <Text style={styles.personalityEmoji}>🔬</Text>
            <View style={styles.flex1}>
              <Text style={styles.personalityTitle}>Nutritional Scientist</Text>
              <Text style={styles.personalityDesc}>
                Deep analytical insights on glycemic index, micronutrients, and metabolic recovery.
              </Text>
            </View>
            {riaTone === 'scientific' ? (
              <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
            ) : null}
          </Pressable>
        </View>
      </View>

      {/* 2. Daily Reminders & Notifications */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Smart Reminders</Text>
        <Text style={styles.cardSubtitle}>Timely prompts to keep your habits consistent</Text>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="water-outline" size={20} color="#2563EB" style={styles.settingIcon} />
            <View>
              <Text style={styles.settingTitle}>Hydration Prompts</Text>
              <Text style={styles.settingSubtitle}>Every 2 hours during active daytime</Text>
            </View>
          </View>
          <Switch
            value={waterReminder}
            onValueChange={setWaterReminder}
            trackColor={{ false: '#E2E8F0', true: '#FFEDD5' }}
            thumbColor={waterReminder ? Colors.primary : '#FFFFFF'}
          />
        </View>

        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Ionicons name="restaurant-outline" size={20} color="#10B981" style={styles.settingIcon} />
            <View>
              <Text style={styles.settingTitle}>Meal Logging Check-in</Text>
              <Text style={styles.settingSubtitle}>Reminders at 1:30 PM and 8:30 PM</Text>
            </View>
          </View>
          <Switch
            value={mealReminder}
            onValueChange={setMealReminder}
            trackColor={{ false: '#E2E8F0', true: '#FFEDD5' }}
            thumbColor={mealReminder ? Colors.primary : '#FFFFFF'}
          />
        </View>

        <View style={[styles.settingRow, styles.noBorderBottom]}>
          <View style={styles.settingInfo}>
            <Ionicons name="footsteps-outline" size={20} color="#EA580C" style={styles.settingIcon} />
            <View>
              <Text style={styles.settingTitle}>Evening Step Target Check</Text>
              <Text style={styles.settingSubtitle}>Summary notification at 8:00 PM</Text>
            </View>
          </View>
          <Switch
            value={stepReminder}
            onValueChange={setStepReminder}
            trackColor={{ false: '#E2E8F0', true: '#FFEDD5' }}
            thumbColor={stepReminder ? Colors.primary : '#FFFFFF'}
          />
        </View>
      </View>

      {/* 3. Connected Services */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Connected Services</Text>
        <Text style={styles.cardSubtitle}>Sync health data with external sensors</Text>

        <View style={styles.serviceRow}>
          <View style={styles.serviceLeft}>
            <Ionicons name="fitness" size={22} color="#EF4444" style={styles.serviceIcon} />
            <View>
              <Text style={styles.serviceName}>Apple Health / Health Connect</Text>
              <Text style={styles.serviceStatus}>Steps & active calories syncing</Text>
            </View>
          </View>
          <View style={styles.syncBadge}>
            <Text style={styles.syncBadgeText}>Connected 🟢</Text>
          </View>
        </View>

        <View style={[styles.serviceRow, styles.noBorderBottom]}>
          <View style={styles.serviceLeft}>
            <Ionicons name="cloud-download-outline" size={22} color="#6366F1" style={styles.serviceIcon} />
            <View>
              <Text style={styles.serviceName}>Export 30-Day Nutrition Log</Text>
              <Text style={styles.serviceStatus}>Download CSV for doctor or dietitian</Text>
            </View>
          </View>
          <Pressable style={({ pressed }) => [styles.exportBtn, pressed && styles.exportBtnPressed]}>
            <Text style={styles.exportBtnText}>Export</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    gap: 4,
  },
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
  cardHeaderRow: {
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
  coachBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  personalityCol: {
    gap: 10,
  },
  personalityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    gap: 12,
  },
  personalityCardActive: {
    borderColor: Colors.primary,
    backgroundColor: '#FFF7ED',
  },
  personalityPressed: {
    transform: [{ scale: 0.985 }],
    opacity: 0.9,
  },
  personalityEmoji: {
    fontSize: 22,
  },
  flex1: {
    flex: 1,
  },
  personalityTitle: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 13,
    color: '#0F172A',
  },
  personalityDesc: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
    marginTop: 2,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  noBorderBottom: {
    borderBottomWidth: 0,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    marginRight: 10,
  },
  settingTitle: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#0F172A',
  },
  settingSubtitle: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  serviceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  serviceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  serviceIcon: {
    marginRight: 10,
  },
  serviceName: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#0F172A',
  },
  serviceStatus: {
    fontFamily: Fonts.poppins.regular,
    fontSize: 11,
    color: '#64748B',
  },
  syncBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  syncBadgeText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 11,
    color: '#059669',
  },
  exportBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  exportBtnPressed: {
    backgroundColor: '#E0E7FF',
  },
  exportBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 12,
    color: '#4F46E5',
  },
});
