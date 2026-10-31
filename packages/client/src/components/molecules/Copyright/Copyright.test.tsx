import { render } from 'src/utils/tests';

import { Copyright } from './Copyright';

describe('Copyright', () => {
  it('matches snapshot', () => {
    const { container } = render(<Copyright />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
