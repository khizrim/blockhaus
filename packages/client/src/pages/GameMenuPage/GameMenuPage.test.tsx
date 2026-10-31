import { PAGE_ROUTES } from 'src/utils/constants';
import { render, screen, waitFor } from 'src/utils/tests';

import { mockedUseNavigate, mockedUser } from 'src/utils/tests/mocks';
import { unauthorizedHandlers } from 'src/utils/tests/mocks/handlers';
import { server } from 'src/utils/tests/mocks/server';

import { GameMenuPage } from './GameMenuPage';

describe('GameMenuPage', () => {
  it('shows loader when user is loading', () => {
    render(<GameMenuPage />);

    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders sign in option when user is not logged in', async () => {
    server.use(...unauthorizedHandlers);
    render(<GameMenuPage />);

    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
    expect(screen.getByText(/sign in/i)).toBeInTheDocument();
  });

  it('renders user component when user is logged in', async () => {
    render(<GameMenuPage />);

    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
    expect(screen.getByText(mockedUser.display_name)).toBeInTheDocument();
  });

  it('renders all menu items correctly', () => {
    render(<GameMenuPage />);
    expect(screen.getByText('never-ending')).toBeInTheDocument();
  });

  it('navigates to sign in page when menu item is clicked', async () => {
    server.use(...unauthorizedHandlers);
    const { user } = render(<GameMenuPage />);

    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
    await user.click(screen.getByText('sign in'));
    expect(mockedUseNavigate).toHaveBeenCalledWith(PAGE_ROUTES.SIGN_IN);
  });
});
