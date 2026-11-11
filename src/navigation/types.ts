import { MealType } from '@/types';

export type ActiveModal =
  | { type: 'foodLog'; initialMeal?: MealType; prefillBarcode?: string }
  | { type: 'foodVision'; initialMeal?: MealType }
  | { type: 'barcodeScanner'; prefill?: string; initialMeal?: MealType }
  | { type: 'byokSetup' }
  | { type: 'notifications' }
  | { type: 'avatarPicker' }
  | { type: 'waterTracker' }
  | { type: 'weightTracker' }
  | { type: 'stepTracker' }
  | { type: 'goals' };

export type ActiveModalType = ActiveModal['type'];

export interface OverlayContextValue {
  activeModal: ActiveModal | null;
  openModal: (modal: ActiveModal) => void;
  closeModal: () => void;
  isOpen: (type: ActiveModalType) => boolean;
}
