import React from 'react';
import { render, act } from '@testing-library/react-native';
import { UserAvatar } from '../UserAvatar';

// Mock expo-image
jest.mock('expo-image', () => {
  const { View } = require('react-native');
  return {
    Image: ({ source, onError, ...props }: any) => {
      return <View testID="avatar-image" source={source} onError={onError} {...props} />;
    },
  };
});

describe('UserAvatar', () => {
  it('renders default bundled local asset when avatarUrl is missing', async () => {
    const { getByTestId } = await render(<UserAvatar avatarUrl={null} size={48} />);
    const image = getByTestId('avatar-image');
    expect(image.props.source).toBeDefined();
    // Verify it is not a remote Unsplash URL
    expect(image.props.source?.uri).toBeUndefined();
  });

  it('renders local bundled asset when asset: url is provided', async () => {
    const { getByTestId } = await render(<UserAvatar avatarUrl="asset:women" size={48} />);
    const image = getByTestId('avatar-image');
    expect(image.props.source).toBeDefined();
  });

  it('renders remote uri when http url is provided', async () => {
    const remoteUrl = 'https://example.com/custom-photo.jpg';
    const { getByTestId } = await render(<UserAvatar avatarUrl={remoteUrl} size={48} />);
    const image = getByTestId('avatar-image');
    expect(image.props.source).toEqual({ uri: remoteUrl });
  });

  it('falls back to local bundled default when remote image fails to load', async () => {
    const remoteUrl = 'https://example.com/broken-photo.jpg';
    const { getByTestId } = await render(<UserAvatar avatarUrl={remoteUrl} size={48} />);
    const image = getByTestId('avatar-image');
    expect(image.props.source).toEqual({ uri: remoteUrl });

    // Trigger onError
    await act(async () => {
      image.props.onError();
    });

    // Should now fallback to local bundled asset, not broken remote URL
    const updatedImage = getByTestId('avatar-image');
    expect(updatedImage.props.source?.uri).toBeUndefined();
    expect(updatedImage.props.source).toBeDefined();
  });
});
