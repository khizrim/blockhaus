import { render } from '@testing-library/react';

import { Container } from './Container';

describe('Container', () => {
  it('renders correctly with default props', () => {
    const { container } = render(<Container></Container>);
    expect(container.firstChild).toMatchSnapshot();
  });
});
