/**
 * RiaActionCard.tsx
 *
 * Master delegation component for all Ria Action Cards.
 * Routes to specialized card views based on card.type
 * per LangChain spec-driven UI architecture.
 */

import React from 'react';
import {
  RiaCard,
  MealCardData,
  WaterCardData,
  WeightCardData,
  SuggestionOption,
  PlanChangeCardData,
} from '@/services/ai/types/ai.types';
import { RiaMealCardView } from './RiaMealCardView';
import { RiaWaterCardView } from './RiaWaterCardView';
import { RiaWeightCardView } from './RiaWeightCardView';
import { RiaDayReviewCardView } from './RiaDayReviewCardView';
import { RiaSuggestionCardView } from './RiaSuggestionCardView';
import { RiaPlanChangeCardView } from './RiaPlanChangeCardView';
import { RiaMacroVisualizerCardView } from './RiaMacroVisualizerCardView';
import { RiaPlateDistributionCardView } from './RiaPlateDistributionCardView';

export interface RiaActionCardProps {
  card: RiaCard;
  messageId: string;
  onConfirmMeal?: (messageId: string, data: MealCardData) => void;
  onUndoMeal?: (messageId: string, data: MealCardData) => void;
  onEditMeal?: (messageId: string, data: MealCardData) => void;
  onDismissMeal?: (messageId: string, data: MealCardData) => void;
  onConfirmWater?: (messageId: string, amountMl: number, data: WaterCardData) => void;
  onUndoWater?: (messageId: string, data: WaterCardData) => void;
  onDismissWater?: (messageId: string, data: WaterCardData) => void;
  onConfirmWeight?: (messageId: string, data: WeightCardData) => void;
  onDismissWeight?: (messageId: string, data: WeightCardData) => void;
  onLogSuggestionOption?: (messageId: string, option: SuggestionOption) => void;
  onApplyPlanChange?: (messageId: string, data: PlanChangeCardData) => void;
  onDismissPlanChange?: (messageId: string, data: PlanChangeCardData) => void;
  testID?: string;
}

export const RiaActionCard: React.FC<RiaActionCardProps> = ({
  card,
  messageId,
  onConfirmMeal,
  onUndoMeal,
  onEditMeal,
  onDismissMeal,
  onConfirmWater,
  onUndoWater,
  onDismissWater,
  onConfirmWeight,
  onDismissWeight,
  onLogSuggestionOption,
  onApplyPlanChange,
  onDismissPlanChange,
  testID = 'ria-action-card',
}) => {
  switch (card.type) {
    case 'meal':
      return (
        <RiaMealCardView
          data={card.data}
          onConfirm={() => onConfirmMeal?.(messageId, card.data)}
          onUndo={() => onUndoMeal?.(messageId, card.data)}
          onEdit={onEditMeal ? () => onEditMeal(messageId, card.data) : undefined}
          onDismiss={onDismissMeal ? () => onDismissMeal(messageId, card.data) : undefined}
          testID={`${testID}-meal`}
        />
      );

    case 'water':
      return (
        <RiaWaterCardView
          data={card.data}
          onConfirm={(ml) => onConfirmWater?.(messageId, ml, card.data)}
          onUndo={() => onUndoWater?.(messageId, card.data)}
          onDismiss={onDismissWater ? () => onDismissWater(messageId, card.data) : undefined}
          testID={`${testID}-water`}
        />
      );

    case 'weight':
      return (
        <RiaWeightCardView
          data={card.data}
          onConfirm={() => onConfirmWeight?.(messageId, card.data)}
          onDismiss={onDismissWeight ? () => onDismissWeight(messageId, card.data) : undefined}
          testID={`${testID}-weight`}
        />
      );

    case 'day_review':
      return (
        <RiaDayReviewCardView
          data={card.data}
          testID={`${testID}-day-review`}
        />
      );

    case 'suggestion':
      return (
        <RiaSuggestionCardView
          data={card.data}
          onLogOption={(opt) => onLogSuggestionOption?.(messageId, opt)}
          testID={`${testID}-suggestion`}
        />
      );

    case 'plan_change':
      return (
        <RiaPlanChangeCardView
          data={card.data}
          onApply={() => onApplyPlanChange?.(messageId, card.data)}
          onDismiss={onDismissPlanChange ? () => onDismissPlanChange(messageId, card.data) : undefined}
          testID={`${testID}-plan-change`}
        />
      );

    case 'visual_macro_split':
      return (
        <RiaMacroVisualizerCardView
          data={card.data}
          testID={`${testID}-visual-macro-split`}
        />
      );

    case 'plate_distribution':
      return (
        <RiaPlateDistributionCardView
          data={card.data}
          testID={`${testID}-plate-distribution`}
        />
      );

    default:
      return null;
  }
};
