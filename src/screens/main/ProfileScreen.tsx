import React, { useState, useEffect, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  Pressable,
  ScrollView,
  useWindowDimensions,
  BackHandler,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/theme/colors';
import { Fonts } from '@/theme/typography';
import { useAuth, useGoals } from '@/context/HealthContext';
import { AvatarPickerModal } from '@/components/modals/AvatarPickerModal';
import { SlideInSubScreen } from '@/components/common/SlideInSubScreen';
import { UserAvatar } from '@/components/common/UserAvatar';
import {
  HeaderIconButton,
  SettingsSection,
  SettingsRow,
  profileCard,
} from '@/components/profile/ProfileUI';
import {
  MetabolicSummaryScreen,
  GoalsScreen,
  RiaCoachScreen,
  RemindersScreen,
  AccountScreen,
  RIA_TONE_LABELS,
} from '@/screens/profile';
import { AchievementCenterScreen } from '@/features/gamification';
import { usePro, ProMembershipCard, ProPaywallModal } from '@/features/subscription';
import { DEFAULT_AVATAR_URL } from '@/data/avatars';
import { getTodayBMICategory } from '@/features/weight/utils/bmiCalculator';
import { planFor, LBS_PER_KG } from '@/features/onboarding/services/goalsForm';

export type ProfileSubView =
  | 'main'
  | 'awards'
  | 'summary'
  | 'goals'
  | 'ria'
  | 'reminders'
  | 'account';
type SubView = Exclude<ProfileSubView, 'main'>;

interface ProfileScreenProps {
  onSignIn?: () => void;
  onSignOut?: () => void;
  scrollRef?: React.RefObject<ScrollView | null>;
  initialScrollOffset?: number;
  onScrollPositionChange?: (offset: number) => void;
}

const ProfileScreenComponent: React.FC<ProfileScreenProps> = ({
  onSignIn,
  onSignOut,
  scrollRef,
  initialScrollOffset = 0,
  onScrollPositionChange,
}) => {
  const { width: screenWidth } = useWindowDimensions();
  const { userGoals, updateGoals } = useGoals();
  const { currentUser } = useAuth();
  const { isPro } = usePro();

  const [navStack, setNavStack] = useState<SubView[]>([]);
  const [closingView, setClosingView] = useState<SubView | null>(null);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [paywallVisible, setPaywallVisible] = useState(false);

  const handleOpenSubView = useCallback(
    (view: SubView, nested = false) => {
      if (closingView) return;
      setNavStack(prev => {
        if (prev[prev.length - 1] === view) return prev;
        // A fast second tap on the base screen must not stack another sub-screen
        if (!nested && prev.length > 0) return prev;
        return [...prev, view];
      });
    },
    [closingView]
  );

  const handleBack = useCallback(() => {
    if (navStack.length === 0 || closingView) return;
    setClosingView(navStack[navStack.length - 1]);
  }, [navStack, closingView]);

  const handleClosed = useCallback((view: SubView) => {
    setNavStack(prev => prev.filter(item => item !== view));
    setClosingView(prev => (prev === view ? null : prev));
  }, []);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      if (initialScrollOffset > 0) {
        scrollRef?.current?.scrollTo({ y: initialScrollOffset, animated: false });
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [initialScrollOffset, scrollRef]);

  const handleScrollEnd = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      onScrollPositionChange?.(event.nativeEvent.contentOffset.y);
    },
    [onScrollPositionChange]
  );

  // Android back pops the sub-screen stack first
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (navStack.length === 0) return false;
      handleBack();
      return true;
    });
    return () => sub.remove();
  }, [navStack.length, handleBack]);

  const renderSubScreenContent = (view: SubView) => {
    switch (view) {
      case 'awards':
        return <AchievementCenterScreen onBack={handleBack} />;
      case 'summary':
        return (
          <MetabolicSummaryScreen
            onBack={handleBack}
            onOpenGoals={() => handleOpenSubView('goals', true)}
          />
        );
      case 'goals':
        return <GoalsScreen onBack={handleBack} />;
      case 'ria':
        return <RiaCoachScreen onBack={handleBack} />;
      case 'reminders':
        return <RemindersScreen onBack={handleBack} />;
      case 'account':
        return <AccountScreen onBack={handleBack} onSignIn={onSignIn} onSignOut={onSignOut} />;
    }
  };

  const isGuest = !currentUser || Boolean(currentUser.isGuest);
  const name = currentUser?.name || userGoals.name || (isGuest ? 'Guest' : 'Calorify member');
  const email = currentUser?.email && currentUser.email !== name ? currentUser.email : '';
  const streakDays = userGoals.streakDays ?? 0;

  const isLbs = userGoals.weightUnit === 'lbs';
  const unit = isLbs ? 'lbs' : 'kg';
  const fmtW = (kg: number) => (Math.round((isLbs ? kg * LBS_PER_KG : kg) * 10) / 10).toFixed(1);
  const weightKg = userGoals.currentWeightKg;
  const targetKg = userGoals.targetWeightKg || weightKg;
  const startKg = userGoals.startWeightKg || weightKg;
  const totalChange = Math.abs(targetKg - startKg);
  const doneChange = Math.min(totalChange, Math.max(0, Math.abs(weightKg - startKg)));
  // Moving away from the target (gaining on a loss plan) counts as no progress
  const movingRight = Math.sign(targetKg - startKg) === Math.sign(weightKg - startKg);
  const progress = totalChange > 0 && movingRight ? doneChange / totalChange : 0;

  // BMI only when a height is on file (no invented 175 cm)
  const heightCm = userGoals.heightCm;
  const bmi = heightCm && weightKg ? weightKg / (heightCm / 100) ** 2 : null;
  const bmiCategory = bmi ? getTodayBMICategory(bmi) : null;
  const bmiLabel = bmiCategory?.name === 'Normal' ? 'Healthy weight' : bmiCategory?.name;

  const plan = planFor(userGoals);
  const budget = userGoals.dailyCalorieBudget;
  const balance = budget ? plan.tdee - budget : 0;
  const summarySubtitle = budget
    ? `Burn ${plan.tdee.toLocaleString()} kcal · ${Math.abs(balance).toLocaleString()} kcal ${balance >= 0 ? 'deficit' : 'surplus'}`
    : `Burn ${plan.tdee.toLocaleString()} kcal a day`;
  const fmtInt = (n?: number) => (n ? n.toLocaleString() : '—');

  // The base screen stays mounted under sub-screens; keep screen readers out of it
  const baseA11y = navStack.length
    ? { accessibilityElementsHidden: true, importantForAccessibility: 'no-hide-descendants' as const }
    : {};

  return (
    <View style={styles.root}>
      <View style={styles.header} {...baseA11y}>
        <Text style={styles.title} accessibilityRole="header">
          Profile
        </Text>
        <HeaderIconButton
          icon="settings-outline"
          label="Account and settings"
          onPress={() => handleOpenSubView('account')}
        />
      </View>

      <ScrollView
        ref={scrollRef}
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        onScrollEndDrag={handleScrollEnd}
        {...baseA11y}
      >
        <View style={[profileCard, styles.identity]}>
          <Pressable
            style={({ pressed }) => [styles.avatarBtn, pressed && styles.pressed]}
            onPress={() => setAvatarPickerVisible(true)}
            accessibilityRole="button"
            accessibilityLabel="Change avatar"
          >
            <UserAvatar avatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL} size={64} />
            <View style={styles.cameraBadge}>
              <Ionicons name="camera" size={12} color={Colors.textInverse} />
            </View>
          </Pressable>
          <View style={styles.flex1}>
            <Text style={styles.name} numberOfLines={1}>
              {name}
            </Text>
            {email ? (
              <Text style={styles.email} numberOfLines={1}>
                {email}
              </Text>
            ) : null}
            <View style={styles.chips}>
              <View
                style={[styles.chip, styles.chipStreak]}
                accessible
                accessibilityLabel={`${streakDays} day streak`}
              >
                <Ionicons name="flame" size={12} color={Colors.steps} />
                <Text style={[styles.chipText, styles.chipStreakText]}>
                  {streakDays}-day streak
                </Text>
              </View>
              <View style={styles.chip}>
                <Text style={styles.chipText}>
                  {isGuest ? 'Guest' : isPro ? 'Pro member' : 'Free plan'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        <Pressable
          style={({ pressed }) => [profileCard, styles.plan, pressed && styles.pressed]}
          onPress={() => handleOpenSubView('goals')}
          accessibilityRole="button"
          accessibilityLabel={`Your plan: ${fmtInt(budget)} kilocalories a day, weight ${fmtW(weightKg)} ${unit}, goal ${fmtW(targetKg)} ${unit}. Edit goals`}
        >
          <View style={styles.planHead}>
            <Text style={styles.planTitle}>Your plan</Text>
            <Text style={styles.planEdit}>Edit</Text>
          </View>
          <View>
            <View style={styles.planWeightRow}>
              <Text style={styles.planMeta}>
                {fmtW(weightKg)} {unit} now
              </Text>
              <Text style={styles.planMeta}>
                Goal {fmtW(targetKg)} {unit}
              </Text>
            </View>
            <View style={styles.track}>
              <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` }]} />
            </View>
            {totalChange > 0 ? (
              <Text style={[styles.planMeta, styles.mt6]}>
                {progress >= 1
                  ? 'Goal reached'
                  : `${fmtW(movingRight ? doneChange : 0)} of ${fmtW(totalChange)} ${unit} done`}
              </Text>
            ) : null}
          </View>
          <View style={styles.statRow}>
            <View style={styles.stat}>
              <Text style={[styles.statValue, styles.statCalories]}>{fmtInt(budget)}</Text>
              <Text style={styles.statLabel}>kcal / day</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {userGoals.targetProtein ? `${userGoals.targetProtein} g` : '—'}
              </Text>
              <Text style={styles.statLabel}>protein</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>{fmtInt(userGoals.stepGoal)}</Text>
              <Text style={styles.statLabel}>steps</Text>
            </View>
            <View style={styles.stat}>
              <Text style={styles.statValue}>
                {userGoals.waterGoalMl ? `${(userGoals.waterGoalMl / 1000).toFixed(1)} L` : '—'}
              </Text>
              <Text style={styles.statLabel}>water</Text>
            </View>
          </View>
          <View style={styles.bmiRow}>
            <View
              style={[styles.bmiDot, { backgroundColor: bmiCategory?.color ?? Colors.textMuted }]}
            />
            <Text style={styles.planMeta}>
              {bmi ? `BMI ${bmi.toFixed(1)} · ${bmiLabel}` : 'Add your height to see BMI'}
            </Text>
          </View>
        </Pressable>

        <ProMembershipCard
          onUpgradePress={() => setPaywallVisible(true)}
          onManagePress={() => setPaywallVisible(true)}
        />

        <SettingsSection title="Health">
          <SettingsRow
            icon="locate-outline"
            iconColor={Colors.primaryDark}
            iconBackground={Colors.burnLight}
            title="My goals"
            subtitle="Calories, macros, activity, body"
            onPress={() => handleOpenSubView('goals')}
          />
          <SettingsRow
            icon="pulse-outline"
            title="Metabolic summary"
            subtitle={summarySubtitle}
            onPress={() => handleOpenSubView('summary')}
          />
          <SettingsRow
            icon="trophy-outline"
            iconColor={Colors.warningDark}
            iconBackground={Colors.warningLight}
            title="Achievements"
            subtitle={`${streakDays}-day streak`}
            onPress={() => handleOpenSubView('awards')}
            accessibilityLabel={`Achievements, ${streakDays} day streak`}
          />
        </SettingsSection>

        <SettingsSection title="App">
          <SettingsRow
            icon="sparkles-outline"
            iconColor={Colors.primaryDark}
            iconBackground={Colors.burnLight}
            title="Ria coach"
            subtitle={RIA_TONE_LABELS[userGoals.riaTone || 'supportive']}
            onPress={() => handleOpenSubView('ria')}
          />
          <SettingsRow
            icon="notifications-outline"
            iconColor={Colors.waterDark}
            iconBackground={Colors.waterTrack}
            title="Reminders"
            subtitle="Meals, water, steps, quiet hours"
            onPress={() => handleOpenSubView('reminders')}
          />
          <SettingsRow
            icon="shield-checkmark-outline"
            title="Account & security"
            subtitle={isGuest ? 'Guest · not backed up' : 'Sign out, delete account'}
            onPress={() => handleOpenSubView('account')}
          />
        </SettingsSection>
      </ScrollView>

      <AvatarPickerModal
        visible={avatarPickerVisible}
        currentAvatarUrl={userGoals.avatarUrl || DEFAULT_AVATAR_URL}
        onClose={() => setAvatarPickerVisible(false)}
        onSelectAvatar={newUrl => updateGoals({ avatarUrl: newUrl })}
      />

      <ProPaywallModal visible={paywallVisible} onClose={() => setPaywallVisible(false)} />

      {navStack.map((view, index) => (
        <SlideInSubScreen
          key={view}
          zIndex={10 + index}
          screenWidth={screenWidth}
          isClosing={closingView === view}
          onClosed={() => handleClosed(view)}
        >
          {renderSubScreenContent(view)}
        </SlideInSubScreen>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: Colors.background,
    zIndex: 10,
  },
  title: {
    fontFamily: Fonts.urbanist.extraBold,
    fontSize: 28,
    letterSpacing: -0.4,
    color: Colors.textPrimary,
  },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 120, gap: 24 },
  flex1: { flex: 1, minWidth: 0 },
  pressed: { opacity: 0.88 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16 },
  avatarBtn: { width: 64, height: 64, borderRadius: 32 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.textPrimary,
    borderWidth: 2,
    borderColor: Colors.card,
  },
  name: { fontFamily: Fonts.urbanist.bold, fontSize: 20, color: Colors.textPrimary },
  email: {
    fontFamily: Fonts.urbanist.regular,
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: 8,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainer,
  },
  chipText: { fontFamily: Fonts.urbanist.bold, fontSize: 12, color: Colors.textSlate600 },
  chipStreak: { backgroundColor: Colors.stepsLight },
  chipStreakText: { color: Colors.stepsDark },
  plan: { padding: 16, gap: 14 },
  planHead: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  planTitle: { fontFamily: Fonts.urbanist.bold, fontSize: 15, color: Colors.textPrimary },
  planEdit: { fontFamily: Fonts.urbanist.semiBold, fontSize: 14, color: Colors.primaryDark },
  planWeightRow: { flexDirection: 'row', justifyContent: 'space-between' },
  planMeta: { fontFamily: Fonts.urbanist.regular, fontSize: 13, color: Colors.textSecondary },
  mt6: { marginTop: 6 },
  track: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.weightLight,
    marginTop: 8,
    overflow: 'hidden',
  },
  fill: { height: 8, borderRadius: 4, backgroundColor: Colors.weight },
  statRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.borderWhisper,
    paddingTop: 12,
  },
  stat: { flex: 1 },
  statValue: { fontFamily: Fonts.urbanist.bold, fontSize: 18, color: Colors.textPrimary },
  statCalories: { color: Colors.primaryDark },
  statLabel: { fontFamily: Fonts.urbanist.regular, fontSize: 12, color: Colors.textSecondary },
  bmiRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bmiDot: { width: 8, height: 8, borderRadius: 4 },
});

export const ProfileScreen = React.memo(ProfileScreenComponent);
export const ProfileTab = ProfileScreen;
