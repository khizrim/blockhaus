import { waitFor } from '@testing-library/react';

import { PAGE_ROUTES } from 'src/utils/constants';
import { render, screen } from 'src/utils/tests';
import { mockedUseNavigate, mockedUser } from 'src/utils/tests/mocks';

import { unauthorizedHandlers } from 'src/utils/tests/mocks/handlers';
import { server } from 'src/utils/tests/mocks/server';

import { User } from './User';

describe('User', () => {
  it('shows skeleton when user is loading', () => {
    render(<User />);
    expect(screen.getByTestId('skeleton')).toBeInTheDocument();
  });

  it('renders sign in button when no user is present', async () => {
    server.use(...unauthorizedHandlers);
    render(<User />);
    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
    expect(screen.getByRole('link', { name: /sign in/i })).toBeInTheDocument();
  });

  it('renders UserLabel when user is present and not in full size', async () => {
    render(<User />);
    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
    expect(screen.getByText(mockedUser.display_name)).toBeInTheDocument();
  });

  it('renders UserComponent when user is present and in full size', async () => {
    render(<User isFullSize />);
    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
    expect(screen.getByText(mockedUser.display_name)).toBeInTheDocument();
    expect(screen.getByText(mockedUser.email)).toBeInTheDocument();
  });

  it('calls logout when the logout button is clicked', async () => {
    const { user } = render(<User />);

    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());

    await user.click(screen.getByTestId('sign-out-button'));
  });

  it('navigates to the profile page when edit button is clicked', async () => {
    const { user } = render(<User isFullSize />);

    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
    await user.click(screen.getByTestId('edit-button'));

    expect(mockedUseNavigate).toHaveBeenCalledWith(PAGE_ROUTES.PROFILE);
  });
});
