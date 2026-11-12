/**
 * Ria's weigh-in proposal: the new weight, the change since the last entry in words
 * (neutral, since a gain can be the goal) and a check for jumps over 3 kg.
 */

import React, { useState } from 'react';
import { View } from 'react-native';
import { ProfileButton } from '@/components/profile/ProfileUI';
import { WeightCardData } from '@/services/ai/types/ai.types';
import { BigValue, CardHeader, CardNotice, CardShell, CollapsedCard, ui } from './RiaCardUI';

export interface RiaWeightCardViewProps {
  data: WeightCardData;
  onConfirm?: () => void;
  onDismiss?: () => void;
  testID?: string;
}

const kg = (n: number) => n.toFixed(1);

export const RiaWeightCardView: React.FC<RiaWeightCardViewProps> = ({
  data,
  onConfirm,
  onDismiss,
  testID = 'ria-weight-card',
}) => {
  const [shown, setShown] = useState(false);
  const weight = kg(data.weightKg);

  if (data.state === 'dismissed' && !shown) {
    return (
      <CollapsedCard
        text={`Weigh-in ${weight} kg not saved`}
        onShow={onConfirm ? () => setShown(true) : undefined}
        testID={testID}
      />
    );
  }

  const delta =
    data.deltaKg ??
    (data.previousWeightKg !== undefined ? data.weightKg - data.previousWeightKg : undefined);
  const change =
    delta === undefined
      ? 'Adds to your weight log'
      : Math.abs(delta) < 0.05
        ? 'Same as your last entry'
        : `${kg(Math.abs(delta))} kg ${delta < 0 ? 'down' : 'up'} since last entry`;
  const logged = data.state === 'logged';

  return (
    <CardShell testID={testID} accessibilityLabel={`Weigh-in ${weight} kg`}>
      <CardHeader
        icon="scale-outline"
        tone="weight"
        title="Weigh-in"
        subtitle={logged ? 'Saved to your weight log' : change}
        subtitleDone={logged}
        right={<BigValue value={weight} unit="kg" />}
      />
      {!logged && data.needsSanityConfirm ? (
        <CardNotice
          kind="warn"
          text={
            data.previousWeightKg !== undefined
              ? `That's a big change from ${kg(data.previousWeightKg)} kg. Check the number before saving.`
              : "That's a big change from your last entry. Check the number before saving."
          }
        />
      ) : null}
      {!logged && onConfirm ? (
        <View style={ui.buttons}>
          <ProfileButton
            label={data.needsSanityConfirm ? `Save ${weight} kg` : 'Save weigh-in'}
            variant="primary"
            onPress={onConfirm}
            accessibilityLabel={`Save weigh-in, ${weight} kilograms`}
            style={ui.mainButton}
          />
          {onDismiss ? <ProfileButton label="Not now" onPress={onDismiss} /> : null}
        </View>
      ) : null}
    </CardShell>
  );
};
