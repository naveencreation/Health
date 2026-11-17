import { resolveWalkthroughView } from '../firstMealWalkthrough';

const base = { state: 'intro' as const, hasMeals: false, activeTab: 'today', overlayOpen: false };

describe('resolveWalkthroughView', () => {
  it('shows the intro on Today with no meals and no overlay', () => {
    expect(resolveWalkthroughView(base)).toBe('intro');
  });
  it('finishes silently when meals already exist', () => {
    expect(resolveWalkthroughView({ ...base, hasMeals: true })).toBe('finish');
    expect(resolveWalkthroughView({ ...base, hasMeals: true, activeTab: 'ria' })).toBe('finish');
  });
  it('waits while another tab or an overlay is up', () => {
    expect(resolveWalkthroughView({ ...base, activeTab: 'profile' })).toBe('none');
    expect(resolveWalkthroughView({ ...base, overlayOpen: true })).toBe('none');
  });
  it('shows the tip only after a meal is logged', () => {
    expect(resolveWalkthroughView({ ...base, state: 'ria_tip' })).toBe('none');
    expect(resolveWalkthroughView({ ...base, state: 'ria_tip', hasMeals: true })).toBe('tip');
    expect(
      resolveWalkthroughView({ ...base, state: 'ria_tip', hasMeals: true, overlayOpen: true })
    ).toBe('none');
  });
  it('shows nothing when done or not loaded', () => {
    expect(resolveWalkthroughView({ ...base, state: 'done', hasMeals: true })).toBe('none');
    expect(resolveWalkthroughView({ ...base, state: null })).toBe('none');
  });
});
