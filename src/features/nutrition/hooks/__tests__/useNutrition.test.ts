import { renderHook, act } from '@testing-library/react-native';
import { useNutrition } from '../useNutrition';

const mockAddMealItem = jest.fn();
const mockRemoveMealItem = jest.fn();
const mockUpdateMealQuantity = jest.fn();
const mockUpdateGoals = jest.fn();

let mockDailyLogData: any = {
  meals: [
    {
      id: 'm_1',
      foodId: 'apple',
      name: 'Apple',
      mealType: 'breakfast',
      servingUnit: 'piece',
      quantity: 1,
      calories: 95,
      carbs: 25,
      protein: 0.5,
      fat: 0.3,
      fiber: 4.4,
      loggedAt: '2026-10-04T08:00:00Z',
    },
  ],
};

let mockGoalsData: any = {
  dailyCalorieBudget: 2000,
  targetCarbs: 250,
  targetProtein: 100,
  targetFat: 60,
  targetFiber: 30,
};

jest.mock('@/context/HealthContext', () => ({
  useDailyLog: () => ({
    selectedDate: '2026-10-04',
    currentLog: mockDailyLogData,
    dailyLogs: {
      '2026-10-04': mockDailyLogData,
    },
    totalConsumed: 1200,
    totalBurned: 300,
    remainingCalories: 1100, // 2000 - 1200 + 300
    totalCarbs: 150,
    totalProtein: 80,
    totalFat: 40,
    totalFiber: 20,
    mealsByType: {
      breakfast: mockDailyLogData.meals,
      lunch: [],
      snacks: [],
      dinner: [],
    },
    mealCalories: {
      breakfast: 95,
      lunch: 0,
      snacks: 0,
      dinner: 0,
    },
    addMealItem: mockAddMealItem,
    removeMealItem: mockRemoveMealItem,
    updateMealQuantity: mockUpdateMealQuantity,
  }),
  useGoals: () => ({
    userGoals: mockGoalsData,
    updateGoals: mockUpdateGoals,
  }),
}));

describe('useNutrition Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('computes calorie budget, burn adjustments, net calories, and macros correctly', async () => {
    const { result } = await renderHook(() => useNutrition());

    expect(result.current.date).toBe('2026-10-04');
    expect(result.current.calorieBudget).toBe(2000);
    expect(result.current.caloriesConsumed).toBe(1200);
    expect(result.current.caloriesBurned).toBe(300);
    expect(result.current.remainingCalories).toBe(1100);
    expect(result.current.netCalories).toBe(900); // 1200 - 300
    expect(result.current.caloriePercentage).toBe(60); // (1200 / 2000) * 100
    expect(result.current.isOverBudget).toBe(false);

    // Macros
    expect(result.current.consumedCarbs).toBe(150);
    expect(result.current.targetCarbs).toBe(250);
    expect(result.current.carbsPercent).toBe(60); // 150/250

    expect(result.current.consumedProtein).toBe(80);
    expect(result.current.targetProtein).toBe(100);
    expect(result.current.proteinPercent).toBe(80); // 80/100

    expect(result.current.consumedFat).toBe(40);
    expect(result.current.targetFat).toBe(60);
    expect(result.current.fatPercent).toBe(67); // Math.round(40/60 * 100)

    expect(result.current.consumedFiber).toBe(20);
    expect(result.current.targetFiber).toBe(30);
    expect(result.current.fiberPercent).toBe(67); // Math.round(20/30 * 100)

    expect(result.current.meals).toHaveLength(1);
    expect(result.current.mealCalories.breakfast).toBe(95);
  });

  test('triggers meal mutations and target updates', async () => {
    const { result } = await renderHook(() => useNutrition());

    const sampleFood = {
      id: 'banana',
      name: 'Banana',
      category: 'fruits' as const,
      categoryLabel: 'Fruits',
      servingUnit: 'piece',
      defaultServingSize: 1,
      calories: 105,
      carbs: 27,
      protein: 1.3,
      fat: 0.3,
      fiber: 3.1,
    };

    await act(async () => {
      result.current.addMealItem('breakfast', sampleFood, 1);
    });
    expect(mockAddMealItem).toHaveBeenCalledWith('breakfast', sampleFood, 1);

    await act(async () => {
      result.current.updateMealQuantity('m_1', 2);
    });
    expect(mockUpdateMealQuantity).toHaveBeenCalledWith('m_1', 2);

    await act(async () => {
      result.current.removeMealItem('m_1');
    });
    expect(mockRemoveMealItem).toHaveBeenCalledWith('m_1');

    await act(async () => {
      result.current.setCalorieBudget(2200);
    });
    expect(mockUpdateGoals).toHaveBeenCalledWith({ dailyCalorieBudget: 2200 });

    await act(async () => {
      result.current.setMacroTargets({ targetProtein: 120 });
    });
    expect(mockUpdateGoals).toHaveBeenCalledWith({ targetProtein: 120 });
  });
});
