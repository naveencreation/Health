import React from 'react';
import { render } from '@testing-library/react-native';
import { Text } from 'react-native';

jest.mock('react-native-reanimated', () => {
  const ReactNative = require('react-native');
  return {
    __esModule: true,
    default: {
      View: ReactNative.View,
    },
    useSharedValue: (value: number) => ({ value }),
    useAnimatedStyle: (factory: () => unknown) => factory(),
    withTiming: (value: number) => value,
    runOnJS: (fn: any) => fn,
    Easing: {
      out: (fn: any) => fn,
      inOut: (fn: any) => fn,
      in: (fn: any) => fn,
      cubic: (t: number) => t,
      bezier: () => ({ factory: () => (t: number) => t }),
    },
  };
});

import { SlideInSubScreen } from '../SlideInSubScreen';

describe('SlideInSubScreen component', () => {
  it('renders children correctly without throwing worklet or easing errors', async () => {
    const onClosed = jest.fn();
    const { getByText } = await render(
      <SlideInSubScreen
        isClosing={false}
        onClosed={onClosed}
        screenWidth={390}
      >
        <Text>SubScreen Content</Text>
      </SlideInSubScreen>
    );

    expect(getByText('SubScreen Content')).toBeTruthy();
  });
});
