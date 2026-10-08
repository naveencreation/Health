export type CaptureState = 'idle' | 'capturing' | 'captured' | 'preview' | 'error';

export type CameraFacing = 'back' | 'front';

export type CameraFlashMode = 'off' | 'on' | 'auto';

export interface CapturedPhoto {
  uri: string;
  width: number;
  height: number;
  base64?: string;
}

export interface CameraSheetProps {
  visible: boolean;
  onClose: () => void;
  onPhotoCaptured: (photo: CapturedPhoto) => void;
  onOpenGallery?: () => void;
}

export interface FocusPoint {
  x: number;
  y: number;
}
