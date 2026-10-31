import { render } from '@testing-library/react';

import { Logo } from './Logo';

describe('Logo', () => {
  it('renders correctly with default props', () => {
    const { container } = render(<Logo />);
    expect(container.firstChild).toMatchSnapshot();
  });

  it('renders with size sm', () => {
    const { getByAltText } = render(<Logo size='sm' />);
    const img = getByAltText('Blockhaus');
    expect(img).toHaveStyle('width: 240px');
  });

  it('renders with size "auto"', () => {
    const { getByAltText } = render(<Logo size='auto' />);
    const img = getByAltText('Blockhaus');
    expect(img).toHaveStyle('width: auto');
  });
});
