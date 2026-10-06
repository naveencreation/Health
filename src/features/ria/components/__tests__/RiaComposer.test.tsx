/**
 * RiaComposer.test.tsx
 * 
 * Unit tests for RiaComposer component:
 * - Text entry and character count warning
 * - Send button enabling only when non-empty
 * - Stop button in streaming mode
 * - Photo trigger
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    impactLight: jest.fn(),
    selection: jest.fn(),
  },
}));

import { RiaComposer } from '../RiaComposer';
import { haptics } from '@/utils/haptics';

describe('RiaComposer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('disables send button when input query is empty', async () => {
    const onSendMock = jest.fn();
    const { getByTestId } = await render(
      <RiaComposer value="" onChangeText={jest.fn()} onSend={onSendMock} />
    );

    const sendBtn = getByTestId('composer-send-btn');
    fireEvent.press(sendBtn);

    expect(onSendMock).not.toHaveBeenCalled();
  });

  it('enables send button and triggers onSend when input has text', async () => {
    const onSendMock = jest.fn();
    const { getByTestId } = await render(
      <RiaComposer value="What should I eat?" onChangeText={jest.fn()} onSend={onSendMock} />
    );

    const sendBtn = getByTestId('composer-send-btn');
    fireEvent.press(sendBtn);

    expect(haptics.impactLight).toHaveBeenCalled();
    expect(onSendMock).toHaveBeenCalledWith('What should I eat?');
  });

  it('renders Stop button instead of Send while streaming and calls onStop', async () => {
    const onStopMock = jest.fn();
    const { getByTestId, queryByTestId } = await render(
      <RiaComposer
        value=""
        onChangeText={jest.fn()}
        onSend={jest.fn()}
        onStop={onStopMock}
        isStreaming={true}
      />
    );

    expect(queryByTestId('composer-send-btn')).toBeNull();
    const stopBtn = getByTestId('composer-stop-btn');
    fireEvent.press(stopBtn);

    expect(haptics.selection).toHaveBeenCalled();
    expect(onStopMock).toHaveBeenCalled();
  });

  it('calls onPhotoPress when photo button is tapped', async () => {
    const onPhotoMock = jest.fn();
    const { getByTestId } = await render(
      <RiaComposer
        value=""
        onChangeText={jest.fn()}
        onSend={jest.fn()}
        onPhotoPress={onPhotoMock}
      />
    );

    const photoBtn = getByTestId('composer-photo-btn');
    fireEvent.press(photoBtn);

    expect(haptics.impactLight).toHaveBeenCalled();
    expect(onPhotoMock).toHaveBeenCalled();
  });

  it('displays character counter when exceeding 400 characters', async () => {
    const longText = 'a'.repeat(420);
    const { getByText } = await render(
      <RiaComposer value={longText} onChangeText={jest.fn()} onSend={jest.fn()} />
    );

    expect(getByText('420/500')).toBeTruthy();
  });
});
