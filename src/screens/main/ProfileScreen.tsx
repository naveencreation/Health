import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useHealth } from '@/context/HealthContext';
import {
  AvatarPickerModal,
  ProfileHeaderCard,
  DailyTargetsCard,
  BodyCompositionCard,
  PreferencesCard,
  AccountSecurityCard,
} from '@/components';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';

type ProfileSubTab = 'goals' | 'body' | 'settings';

interface ProfileScreenProps {
  onSignIn?: () => void;
  onSignOut?: () => void;
}

export const ProfileScreen: React.FC<ProfileScreenProps> = ({ onSignIn, onSignOut }) => {
  const { userGoals, updateGoals, currentUser, logout } = useHealth();

  const [activeSubTab, setActiveSubTab] = useState<ProfileSubTab>('goals');
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);

  // Core Goal Inputs
  const [name, setName] = useState(currentUser?.name || userGoals.name);
  const [calorieBudget, setCalorieBudget] = useState(String(userGoals.dailyCalorieBudget));
  const [targetProtein, setTargetProtein] = useState(String(userGoals.targetProtein));
  const [targetCarbs, setTargetCarbs] = useState(String(userGoals.targetCarbs));
  const [targetFat, setTargetFat] = useState(String(userGoals.targetFat));
  const [targetFiber, setTargetFiber] = useState(String(userGoals.targetFiber));
  const [waterGoal, setWaterGoal] = useState(String(userGoals.waterGoalMl));
  const [stepGoal, setStepGoal] = useState(String(userGoals.stepGoal));
  const [currentWeight, setCurrentWeight] = useState(String(userGoals.currentWeightKg));
  const [targetWeight, setTargetWeight] = useState(String(userGoals.targetWeightKg));
  const [userHeightCm, setUserHeightCm] = useState(String(userGoals.heightCm || 175));

  // App & AI Preferences State
  const [riaTone, setRiaTone] = useState<'supportive' | 'focused' | 'scientific'>('supportive');
  const [waterReminder, setWaterReminder] = useState(true);
  const [mealReminder, setMealReminder] = useState(true);
  const [stepReminder, setStepReminder] = useState(false);
  const [activePreset, setActivePreset] = useState<'fat_loss' | 'muscle_gain' | 'maintenance'>('maintenance');
  const [savedMessage, setSavedMessage] = useState(false);

  // Live Calculations
  const pGrams = parseInt(targetProtein, 10) || 0;
  const cGrams = parseInt(targetCarbs, 10) || 0;
  const fGrams = parseInt(targetFat, 10) || 0;
  const computedMacroCals = pGrams * 4 + cGrams * 4 + fGrams * 9;
  const currentBudget = parseInt(calorieBudget, 10) || 1950;
  const macroDiff = computedMacroCals - currentBudget;

  const proteinPct = Math.round(((pGrams * 4) / (computedMacroCals || 1)) * 100);
  const carbsPct = Math.round(((cGrams * 4) / (computedMacroCals || 1)) * 100);
  const fatPct = Math.max(0, 100 - proteinPct - carbsPct);

  // Body Composition Math
  const weightNum = parseFloat(currentWeight) || 74.2;
  const targetWeightNum = parseFloat(targetWeight) || 68.0;
  const heightNum = parseFloat(userHeightCm) || 178;
  const heightM = heightNum / 100;
  const bmi = (weightNum / (heightM * heightM)).toFixed(1);
  const bmiNum = parseFloat(bmi);

  const getBmiStatus = (val: number) => {
    if (val < 18.5) return { label: 'Underweight', color: '#3B82F6' };
    if (val < 25) return { label: 'Healthy Weight 🟢', color: '#10B981' };
    if (val < 30) return { label: 'Overweight', color: '#F59E0B' };
    return { label: 'Obese', color: '#EF4444' };
  };

  const bmiStatus = getBmiStatus(bmiNum);
  // BMR uses user's real age and gender from onboarding data
  const userAge = userGoals.age || 24;
  const genderConstant = userGoals.gender === 'female' ? -161 : userGoals.gender === 'other' ? -78 : 5;
  const bmrEst = Math.round(10 * weightNum + 6.25 * heightNum - 5 * userAge + genderConstant);
  const tdeeEst = Math.round(bmrEst * 1.375);
  // Start weight from onboarding — the weight the user entered when they registered
  const startWeight = userGoals.startWeightKg || userGoals.currentWeightKg || weightNum;
  const totalToLose = Math.max(0.1, Math.abs(startWeight - targetWeightNum));
  const lostSoFar = Math.max(0, startWeight - weightNum);
  const weightProgressPct = Math.min(100, Math.round((lostSoFar / totalToLose) * 100));

  const handleSave = () => {
    updateGoals({
      name: name.trim() || currentUser?.name || 'User',
      dailyCalorieBudget: parseInt(calorieBudget, 10) || userGoals.dailyCalorieBudget,
      targetProtein: parseInt(targetProtein, 10) || userGoals.targetProtein,
      targetCarbs: parseInt(targetCarbs, 10) || userGoals.targetCarbs,
      targetFat: parseInt(targetFat, 10) || userGoals.targetFat,
      targetFiber: parseInt(targetFiber, 10) || userGoals.targetFiber,
      waterGoalMl: parseInt(waterGoal, 10) || userGoals.waterGoalMl,
      stepGoal: parseInt(stepGoal, 10) || userGoals.stepGoal,
      currentWeightKg: weightNum,
      targetWeightKg: targetWeightNum,
      heightCm: parseFloat(userHeightCm) || userGoals.heightCm || 175,
    });
    setSavedMessage(true);
    setTimeout(() => setSavedMessage(false), 2500);
  };

  const applyPreset = (preset: 'fat_loss' | 'muscle_gain' | 'maintenance') => {
    setActivePreset(preset);
    if (preset === 'fat_loss') {
      setCalorieBudget('1650');
      setTargetProtein('90');
      setTargetCarbs('160');
      setTargetFat('40');
      setTargetFiber('30');
    } else if (preset === 'muscle_gain') {
      setCalorieBudget('2300');
      setTargetProtein('130');
      setTargetCarbs('260');
      setTargetFat('60');
      setTargetFiber('35');
    } else {
      setCalorieBudget('1950');
      setTargetProtein('75');
      setTargetCarbs('220');
      setTargetFat('50');
      setTargetFiber('30');
    }
  };

  const handleSignOut = async () => {
    if (onSignOut) {
      onSignOut();
      return;
    }
    if (Platform.OS === 'web') {
      const confirmed = window.confirm('Are you sure you want to sign out of Calori?');
      if (confirmed) {
        await logout();
      }
      return;
    }
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of Calori?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
          },
        },
      ]
    );
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* 1. HERO MEMBER PROFILE CARD */}
      <ProfileHeaderCard
        name={name}
        email={currentUser?.email || (currentUser?.isGuest ? 'guest.user@calori.fit' : '')}
        avatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
        onEditAvatar={() => setAvatarPickerVisible(true)}
        weightNum={weightNum}
        targetWeightNum={targetWeightNum}
        bmi={bmi}
        bmiColor={bmiStatus.color}
        calorieBudget={calorieBudget}
        isGuest={currentUser?.isGuest}
        onSignIn={onSignIn}
        onSignOut={handleSignOut}
      />

      {/* 2. SUB-TAB SEGMENT CONTROLLER */}
      <View style={styles.segmentContainer}>
        <Pressable
          style={({ pressed }) => [
            styles.segmentBtn,
            activeSubTab === 'goals' && styles.segmentBtnActive,
            pressed && styles.segmentPressed,
          ]}
          onPress={() => setActiveSubTab('goals')}
        >
          <Ionicons
            name="flame"
            size={15}
            color={activeSubTab === 'goals' ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeSubTab === 'goals' && styles.segmentBtnTextActive,
            ]}
          >
            Nutrition Goals
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.segmentBtn,
            activeSubTab === 'body' && styles.segmentBtnActive,
            pressed && styles.segmentPressed,
          ]}
          onPress={() => setActiveSubTab('body')}
        >
          <Ionicons
            name="scale"
            size={15}
            color={activeSubTab === 'body' ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeSubTab === 'body' && styles.segmentBtnTextActive,
            ]}
          >
            Body & BMI
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.segmentBtn,
            activeSubTab === 'settings' && styles.segmentBtnActive,
            pressed && styles.segmentPressed,
          ]}
          onPress={() => setActiveSubTab('settings')}
        >
          <Ionicons
            name="options"
            size={15}
            color={activeSubTab === 'settings' ? Colors.primary : Colors.textSecondary}
          />
          <Text
            style={[
              styles.segmentBtnText,
              activeSubTab === 'settings' && styles.segmentBtnTextActive,
            ]}
          >
            AI & Settings
          </Text>
        </Pressable>
      </View>

      {/* 3. SUB-TAB CONTENT */}
      {activeSubTab === 'goals' && (
        <DailyTargetsCard
          calorieBudget={calorieBudget}
          setCalorieBudget={setCalorieBudget}
          targetProtein={targetProtein}
          setTargetProtein={setTargetProtein}
          targetCarbs={targetCarbs}
          setTargetCarbs={setTargetCarbs}
          targetFat={targetFat}
          setTargetFat={setTargetFat}
          targetFiber={targetFiber}
          setTargetFiber={setTargetFiber}
          waterGoal={waterGoal}
          setWaterGoal={setWaterGoal}
          stepGoal={stepGoal}
          setStepGoal={setStepGoal}
          activePreset={activePreset}
          applyPreset={applyPreset}
          proteinPct={proteinPct}
          carbsPct={carbsPct}
          fatPct={fatPct}
          macroDiff={macroDiff}
          computedMacroCals={computedMacroCals}
        />
      )}

      {activeSubTab === 'body' && (
        <BodyCompositionCard
          startWeight={startWeight}
          weightNum={weightNum}
          targetWeightNum={targetWeightNum}
          currentWeight={currentWeight}
          setCurrentWeight={setCurrentWeight}
          targetWeight={targetWeight}
          setTargetWeight={setTargetWeight}
          userHeightCm={userHeightCm}
          setUserHeightCm={setUserHeightCm}
          weightProgressPct={weightProgressPct}
          lostSoFar={lostSoFar}
          bmi={bmi}
          bmiStatus={bmiStatus}
          bmrEst={bmrEst}
          tdeeEst={tdeeEst}
          calorieBudget={calorieBudget}
          currentBudget={currentBudget}
        />
      )}

      {activeSubTab === 'settings' && (
        <View>
          <PreferencesCard
            riaTone={riaTone}
            setRiaTone={setRiaTone}
            waterReminder={waterReminder}
            setWaterReminder={setWaterReminder}
            mealReminder={mealReminder}
            setMealReminder={setMealReminder}
            stepReminder={stepReminder}
            setStepReminder={setStepReminder}
          />
          <AccountSecurityCard onSignIn={onSignIn} onSignOut={handleSignOut} />
        </View>
      )}

      {/* Confirmation Toast */}
      {savedMessage ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle" size={18} color="#059669" />
          <Text style={styles.successText}>Profile & goals saved successfully!</Text>
        </View>
      ) : null}

      {/* Save Button */}
      <Pressable
        style={({ pressed }) => [styles.saveBtn, pressed && styles.saveBtnPressed]}
        onPress={handleSave}
        testID="btn-profile-save-goals"
      >
        <Ionicons name="checkmark-sharp" size={18} color="#FFFFFF" style={styles.saveIcon} />
        <Text style={styles.saveBtnText}>Save Goals & Preferences</Text>
      </Pressable>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        visible={avatarPickerVisible}
        currentAvatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
        onClose={() => setAvatarPickerVisible(false)}
        onSelectAvatar={(newUrl) => updateGoals({ avatarUrl: newUrl })}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    padding: 16,
    paddingBottom: 50,
  },
  segmentContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  segmentBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  segmentBtnActive: {
    backgroundColor: '#FFF7ED',
  },
  segmentPressed: {
    opacity: 0.85,
  },
  segmentBtnText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 12,
    color: Colors.textSecondary,
  },
  segmentBtnTextActive: {
    color: Colors.primary,
    fontFamily: Fonts.poppins.semiBold,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#A7F3D0',
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginBottom: 16,
  },
  successText: {
    fontFamily: Fonts.poppins.medium,
    fontSize: 13,
    color: '#059669',
  },
  saveBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 16,
    height: 52,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
    marginTop: 4,
  },
  saveBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.985 }],
  },
  saveIcon: {
    marginRight: 6,
  },
  saveBtnText: {
    fontFamily: Fonts.poppins.semiBold,
    fontSize: 15,
    color: '#FFFFFF',
  },
});

export const ProfileTab = ProfileScreen;
