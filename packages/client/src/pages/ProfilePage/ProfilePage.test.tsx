import userEvent from '@testing-library/user-event';

import { PAGE_ROUTES } from 'src/utils/constants';
import { render, screen, waitFor } from 'src/utils/tests';
import { mockedUseNavigate, mockedUser } from 'src/utils/tests/mocks';

import { ProfilePage } from './ProfilePage';

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });
  it('shows loader when user is loading', () => {
    render(<ProfilePage />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('show user info when user is loaded', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText(mockedUser.display_name)).toBeInTheDocument());
  });

  it('navigates back to the previous page when clicking back', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText(mockedUser.display_name)).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByText('Go Back'));
    expect(mockedUseNavigate).toHaveBeenCalledWith(PAGE_ROUTES.MENU);
  });

  it('edit button is on the page', async () => {
    render(<ProfilePage />);
    await waitFor(() => expect(screen.getByText(mockedUser.display_name)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Edit' })).toBeInTheDocument();
  });

  it('shows Save and Reset buttons after Edit button was clicked', async () => {
    render(<ProfilePage />);

    await waitFor(() => expect(screen.getByText(mockedUser.display_name)).toBeInTheDocument());
    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Reset' })).toBeInTheDocument();
  });
});
