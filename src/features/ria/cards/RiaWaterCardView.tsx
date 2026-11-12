/**
 * Ria's water proposal: one row, one-tap log, Undo for 10 s.
 */

import React, { useState } from 'react';
import { WaterCardData } from '@/services/ai/types/ai.types';
import { CardHeader, CardShell, CollapsedCard, SmallButton, UndoCountdown, fmt } from './RiaCardUI';

export interface RiaWaterCardViewProps {
  data: WaterCardData;
  onConfirm?: (amountMl: number) => void;
  onUndo?: () => void;
  onDismiss?: () => void;
  testID?: string;
}

export const RiaWaterCardView: React.FC<RiaWaterCardViewProps> = ({
  data,
  onConfirm,
  onUndo,
  testID = 'ria-water-card',
}) => {
  const [shown, setShown] = useState(false);
  const amount = `${fmt(data.amountMl)} mL water`;

  if (data.state === 'dismissed' && !shown) {
    return (
      <CollapsedCard
        text={`${amount} not logged`}
        onShow={onConfirm ? () => setShown(true) : undefined}
        testID={testID}
      />
    );
  }

  const logged = data.state === 'logged';
  return (
    <CardShell testID={testID}>
      <CardHeader
        icon="water"
        tone="water"
        title={amount}
        subtitle={logged ? 'Added to today' : 'Adds to today'}
        subtitleDone={logged}
        right={
          logged ? (
            onUndo && data.undoUntil ? (
              <UndoCountdown
                key={data.undoUntil}
                undoUntil={data.undoUntil}
                onUndo={onUndo}
                what="water"
                variant="button"
              />
            ) : null
          ) : onConfirm ? (
            <SmallButton
              label="Log"
              icon="add"
              onPress={() => onConfirm(data.amountMl)}
              accessibilityLabel={`Log ${data.amountMl} millilitres of water`}
            />
          ) : null
        }
      />
    </CardShell>
  );
};
