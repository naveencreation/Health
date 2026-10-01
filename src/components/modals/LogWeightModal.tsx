import React from 'react';
import { Modal } from 'react-native';
import { LogWeightScreen, LogWeightScreenProps } from '@/screens/main/LogWeightScreen';

export interface LogWeightModalProps extends Omit<LogWeightScreenProps, 'onClose'> {
  visible: boolean;
  onClose: () => void;
}

export const LogWeightModal: React.FC<LogWeightModalProps> = ({
  visible,
  initialWeight,
  initialNote,
  targetDate,
  targetEntryId,
  onClose,
  onSave,
  onDelete,
}) => {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <LogWeightScreen
        initialWeight={initialWeight}
        initialNote={initialNote}
        targetDate={targetDate}
        targetEntryId={targetEntryId}
        onClose={onClose}
        onSave={onSave}
        onDelete={onDelete}
      />
    </Modal>
  );
};
