import { render } from '@testing-library/react';

import { Input } from './Input';

describe('Input', () => {
  it('renders correctly with default props', () => {
    const { container } = render(<Input name='test' />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
