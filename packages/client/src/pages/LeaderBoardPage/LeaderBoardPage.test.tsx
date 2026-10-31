import { render } from 'src/utils/tests';

import { LeaderBoardPage } from './LeaderBoardPage';

describe('LeaderBoardPage', () => {
  it('match snapshot', () => {
    const { container } = render(<LeaderBoardPage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
