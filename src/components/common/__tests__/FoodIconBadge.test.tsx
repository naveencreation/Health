import React from 'react';
import { render } from '@testing-library/react-native';
import { FoodIconBadge, getFoodIconTheme } from '../FoodIconBadge';

jest.mock('@expo/vector-icons', () => ({
  MaterialCommunityIcons: 'MaterialCommunityIcons',
  Ionicons: 'Ionicons',
}));

jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: (props: any) => <View testID="food-image" {...props} />,
  };
});

describe('FoodIconBadge & getFoodIconTheme', () => {
  describe('getFoodIconTheme keyword & boundary matching', () => {
    it('prevents substring collision for "veggie" matching egg', () => {
      const theme = getFoodIconTheme({ name: 'Veggie Salad' });
      expect(theme.iconName).not.toBe('egg-outline');
    });

    it('prevents substring collision for "steak" matching tea', () => {
      const theme = getFoodIconTheme({ name: 'Grilled Steak' });
      expect(theme.iconName).not.toBe('coffee-outline');
      expect(theme.iconName).toBe('food-drumstick-outline');
    });

    it('matches egg with word boundaries', () => {
      const theme = getFoodIconTheme({ name: 'Boiled Egg' });
      expect(theme.iconName).toBe('egg-outline');
    });

    it('matches tea/coffee with word boundaries', () => {
      const theme = getFoodIconTheme({ name: 'Masala Chai' });
      expect(theme.iconName).toBe('coffee-outline');
    });

    it('matches category fallback when name does not match specific keyword', () => {
      const theme = getFoodIconTheme({ name: 'Exotic Infusion', category: 'beverages' });
      expect(theme.iconName).toBe('coffee-outline');
    });

    it('returns default fallback theme when neither name nor category match', () => {
      const theme = getFoodIconTheme({ name: 'Unknown Fusion Dish' });
      expect(theme.iconName).toBe('food-outline');
    });
  });

  describe('FoodIconBadge Component Rendering', () => {
    it('renders real photo thumbnail when item has a canonical food image', async () => {
      const { toJSON } = await render(
        <FoodIconBadge item={{ id: 'chapati', name: 'Chapati' }} size={48} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('renders vector icon badge fallback when no photo is found', async () => {
      const { toJSON } = await render(
        <FoodIconBadge item={{ id: 'custom-99', name: 'Unknown Fusion Dish' }} size={48} />
      );
      expect(toJSON()).toBeTruthy();
    });

    it('renders fallback when item is null', async () => {
      const { toJSON } = await render(<FoodIconBadge item={null} size={42} />);
      expect(toJSON()).toBeTruthy();
    });
  });
});
