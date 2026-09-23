import React from 'react';
import { render } from '@testing-library/react-native';
import { MarkdownText } from '../MarkdownText';

describe('<MarkdownText />', () => {
  test('renders plain text', async () => {
    const { getByText } = await render(<MarkdownText content="Hello world" />);
    getByText('Hello world');
  });

  test('renders bold markdown', async () => {
    const { getByText } = await render(<MarkdownText content="**Important** note" />);
    getByText('Important');
  });

  test('matches snapshot', async () => {
    const tree = (await render(<MarkdownText content={'# Title\n\nSome **bold** text'} />)).toJSON();
    expect(tree).toMatchSnapshot();
  });
});
