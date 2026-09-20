import React, { useState } from 'react';
import {
  StyleSheet,
  ScrollView,
  View,
} from 'react-native';
import { useHealth } from '@/context/HealthContext';
import {
  ProfileHeaderCard,
  ProfileQuickNavGrid,
  ProfileMetricInspector,
  GoalsModalSheet,
  PreferencesModalSheet,
  MetabolicSummaryModalSheet,
  AwardsModalSheet,
  AvatarPickerModal,
} from '@/components';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';

interface ProfileScreenProps {
  onSignIn?: () => void;
  onSignOut?: () => void;
  onBack?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({
  onSignIn,
  onSignOut,
  onBack,
}) => {
  const { userGoals, currentUser, updateGoals } = useHealth();

  // Modal Visibility States
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [preferencesModalVisible, setPreferencesModalVisible] = useState(false);
  const [summaryModalVisible, setSummaryModalVisible] = useState(false);
  const [awardsModalVisible, setAwardsModalVisible] = useState(false);

  // Derived Biometrics & Health Baseline
  const weightNum = userGoals.currentWeightKg || 74.2;
  const targetWeightNum = userGoals.targetWeightKg || 68.0;
  const startWeight = userGoals.startWeightKg || userGoals.currentWeightKg || weightNum;
  const heightNum = userGoals.heightCm || 178;
  const heightM = heightNum / 100;
  const bmi = (weightNum / (heightM * heightM)).toFixed(1);
  const bmiNum = parseFloat(bmi);

  const getBmiStatus = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: '#3B82F6' };
    if (val < 25) return { label: 'Healthy Weight', color: '#16A34A' };
    if (val < 30) return { label: 'Overweight', color: '#F59E0B' };
    return { label: 'Obese', color: '#EF4444' };
  };

  const bmiStatus = getBmiStatus(bmiNum);
  const streakDays = userGoals.streakDays || 7;

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. Identity & Top Navigation Header (< Profile ⚙️) */}
        <ProfileHeaderCard
          name={currentUser?.name || userGoals.name || 'User'}
          email={currentUser?.email || (currentUser?.isGuest ? 'guest.user@calori.fit' : '')}
          avatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
          onEditAvatar={() => setAvatarPickerVisible(true)}
          isGuest={currentUser?.isGuest}
          onBack={onBack}
          onOpenSettings={() => setPreferencesModalVisible(true)}
          streakDays={streakDays}
        />

        {/* 2. 2×2 Quick Navigation Matrix (Separation of Concerns Hub) */}
        <ProfileQuickNavGrid
          streakDays={streakDays}
          calorieBudget={userGoals.dailyCalorieBudget}
          riaTone={userGoals.riaTone}
          onOpenAwards={() => setAwardsModalVisible(true)}
          onOpenSummary={() => setSummaryModalVisible(true)}
          onOpenPreferences={() => setPreferencesModalVisible(true)}
          onOpenGoals={() => setGoalsModalVisible(true)}
        />

        {/* 3. Interactive Biometric Telemetry Inspector */}
        <ProfileMetricInspector
          bmi={bmi}
          bmiStatus={bmiStatus}
          heightCm={heightNum}
          weightNum={weightNum}
          targetWeightNum={targetWeightNum}
          startWeight={startWeight}
          calorieBudget={userGoals.dailyCalorieBudget}
          targetProtein={userGoals.targetProtein}
          targetCarbs={userGoals.targetCarbs}
          targetFat={userGoals.targetFat}
          stepGoal={userGoals.stepGoal}
          waterGoal={userGoals.waterGoalMl}
          onOpenGoalsModal={() => setGoalsModalVisible(true)}
        />
      </ScrollView>

      {/* MODAL SHEETS (Focused Editing & Deep Dives) */}
      <GoalsModalSheet
        visible={goalsModalVisible}
        onClose={() => setGoalsModalVisible(false)}
      />

      <PreferencesModalSheet
        visible={preferencesModalVisible}
        onClose={() => setPreferencesModalVisible(false)}
        onSignIn={onSignIn}
        onSignOut={onSignOut}
      />

      <MetabolicSummaryModalSheet
        visible={summaryModalVisible}
        onClose={() => setSummaryModalVisible(false)}
      />

      <AwardsModalSheet
        visible={awardsModalVisible}
        onClose={() => setAwardsModalVisible(false)}
      />

      <AvatarPickerModal
        visible={avatarPickerVisible}
        currentAvatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
        onClose={() => setAvatarPickerVisible(false)}
        onSelectAvatar={(newUrl) => updateGoals({ avatarUrl: newUrl })}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF9F6',
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 110,
  },
});

export const ProfileTab = ProfileScreen;
