import { waitFor } from '@testing-library/react';

import { PAGE_ROUTES } from 'src/utils/constants';
import { render, screen } from 'src/utils/tests';

import { unauthorizedHandlers } from 'src/utils/tests/mocks/handlers';
import { server } from 'src/utils/tests/mocks/server';

import { SignUpPage } from './SignUpPage';

describe('SignUpPage', () => {
  it('matches snapshot', async () => {
    server.use(...unauthorizedHandlers);
    const { container } = render(<SignUpPage />);
    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());
    expect(container.firstChild).toMatchSnapshot();
  });

  it('navigate to menu if user is authenticated', async () => {
    render(<SignUpPage />);
    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());
    expect(location.href).toMatch(PAGE_ROUTES.MENU);
  });

  it('navigates back on back button click', async () => {
    server.use(...unauthorizedHandlers);
    const { user } = render(<SignUpPage />);

    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());
    await user.click(screen.getByRole('button', { name: 'Go Back' }));
    expect(location.href).toMatch(PAGE_ROUTES.MENU);
  });

  it('navigates to sign in on sign in button click', async () => {
    server.use(...unauthorizedHandlers);
    const { user } = render(<SignUpPage />);

    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());
    await user.click(screen.getByRole('link', { name: 'Signed up already? Sign In' }));
    expect(location.href).toMatch(PAGE_ROUTES.SIGN_IN);
  });
});
