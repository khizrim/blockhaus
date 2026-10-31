import { render } from 'src/utils/tests';

import { GameSetupPage } from './GameSetupPage';

describe('GameSetupPage', () => {
  it('matches snapshot', () => {
    const { container } = render(<GameSetupPage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
