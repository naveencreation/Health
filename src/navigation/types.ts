import { MealType } from '@/types';

export type ActiveModal =
  | { type: 'foodLog'; initialMeal?: MealType; prefillBarcode?: string }
  | { type: 'foodVision'; initialMeal?: MealType }
  | { type: 'barcodeScanner'; prefill?: string; initialMeal?: MealType }
  | { type: 'byokSetup' }
  | { type: 'notifications' }
  | { type: 'avatarPicker' }
  | { type: 'riaChat' }
  | { type: 'auth'; mode?: 'welcome' | 'signin' | 'signup' }
  | { type: 'signOutConfirm' }
  | { type: 'waterTracker' }
  | { type: 'weightTracker' }
  | { type: 'stepTracker' };

export type ActiveModalType = ActiveModal['type'];

export interface OverlayContextValue {
  activeModal: ActiveModal | null;
  openModal: (modal: ActiveModal) => void;
  closeModal: () => void;
  isOpen: (type: ActiveModalType) => boolean;
}
