import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { TimePickerModal } from '../TimePickerModal';

jest.mock('@expo/vector-icons', () => ({
  Ionicons: 'Ionicons',
}));

jest.mock('@/utils/haptics', () => ({
  haptics: {
    selection: jest.fn(),
    impactLight: jest.fn(),
  },
}));

describe('TimePickerModal', () => {
  it('renders correctly with initial time and title', async () => {
    const { getByText } = await render(
      <TimePickerModal
        visible={true}
        title="Breakfast Reminder Time"
        initialTime="08:30"
        onSave={jest.fn()}
        onClose={jest.fn()}
      />
    );

    expect(getByText('Breakfast Reminder Time')).toBeTruthy();
    expect(getByText('08')).toBeTruthy();
    expect(getByText('30')).toBeTruthy();
  });

  it('adjusts hours and minutes using buttons', async () => {
    const { getByLabelText, getByText } = await render(
      <TimePickerModal
        visible={true}
        title="Set Time"
        initialTime="08:30"
        onSave={jest.fn()}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(getByLabelText('Increase hour'));
    await waitFor(() => {
      expect(getByText('09')).toBeTruthy();
    });

    fireEvent.press(getByLabelText('Decrease minutes'));
    await waitFor(() => {
      expect(getByText('25')).toBeTruthy();
    });
  });

  it('selects preset when clicked', async () => {
    const onSave = jest.fn();
    const { getByLabelText, getByText } = await render(
      <TimePickerModal
        visible={true}
        title="Set Time"
        initialTime="08:00"
        presets={['07:30', '08:30', '09:00']}
        onSave={onSave}
        onClose={jest.fn()}
      />
    );

    fireEvent.press(getByLabelText('Preset 08:30'));
    await waitFor(() => {
      expect(getByText('30')).toBeTruthy();
    });

    fireEvent.press(getByText('Save Time'));
    expect(onSave).toHaveBeenCalledWith('08:30');
  });

  it('calls onClose when Cancel is pressed', async () => {
    const onClose = jest.fn();
    const { getByText } = await render(
      <TimePickerModal
        visible={true}
        title="Set Time"
        initialTime="08:00"
        onSave={jest.fn()}
        onClose={onClose}
      />
    );

    fireEvent.press(getByText('Cancel'));
    expect(onClose).toHaveBeenCalled();
  });
});
