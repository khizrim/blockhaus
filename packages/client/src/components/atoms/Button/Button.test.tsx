import { render } from '@testing-library/react';

import { Button } from './Button';

describe('Button', () => {
  it('renders correctly with default props', () => {
    const { container } = render(<Button>Button</Button>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
