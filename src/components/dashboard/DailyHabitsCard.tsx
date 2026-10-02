import React from 'react';
import {
  MovementTrackerCard,
  MovementTrackerCardProps,
} from './MovementTrackerCard';

/**
 * @deprecated Use `MovementTrackerCard` instead. `DailyHabitsCard` is retained as an alias for backwards compatibility.
 */
export const DailyHabitsCard: React.FC<MovementTrackerCardProps> = (props) => (
  <MovementTrackerCard testID="daily-habits-card" {...props} />
);

export default DailyHabitsCard;
