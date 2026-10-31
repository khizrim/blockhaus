import { render } from 'src/utils/tests';

import { OfflinePage } from './OfflinePage';

describe('OfflinePage', () => {
  it('match snapshot', () => {
    const { container } = render(<OfflinePage />);
    expect(container.firstChild).toMatchSnapshot();
  });
});
