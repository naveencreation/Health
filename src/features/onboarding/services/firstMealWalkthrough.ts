export const WALKTHROUGH_KEY = 'first_meal_walkthrough_v1';

export type WalkthroughState = 'intro' | 'ria_tip' | 'done';
export type WalkthroughView = 'intro' | 'tip' | 'none' | 'finish';

interface Inputs {
  state: WalkthroughState | null;
  hasMeals: boolean;
  activeTab: string;
  overlayOpen: boolean;
}

/** What the walkthrough should show now. 'finish' means: mark done silently. */
export function resolveWalkthroughView({
  state,
  hasMeals,
  activeTab,
  overlayOpen,
}: Inputs): WalkthroughView {
  if (state === 'intro' && hasMeals) return 'finish';
  if (activeTab !== 'today' || overlayOpen) return 'none';
  if (state === 'intro') return 'intro';
  if (state === 'ria_tip' && hasMeals) return 'tip';
  return 'none';
}
