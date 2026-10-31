import { render } from 'src/utils/tests';

import { GameResultPage } from './GameResultPage';

describe('GameResultPage', () => {
  it('matches snapshot', () => {
    const { container } = render(<GameResultPage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
