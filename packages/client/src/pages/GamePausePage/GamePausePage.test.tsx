import { render } from 'src/utils/tests';

import { GamePausePage } from './GamePausePage';

describe('GamePausePage', () => {
  it('matches snapshot', () => {
    const { container } = render(<GamePausePage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
