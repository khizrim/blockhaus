import { PAGE_ROUTES } from 'src/utils/constants';
import { render, screen, waitFor } from 'src/utils/tests';
import { mockedUseNavigate } from 'src/utils/tests/mocks';
import { handlers, unauthorizedHandlers } from 'src/utils/tests/mocks/handlers';
import { server } from 'src/utils/tests/mocks/server';

import { SignInPage } from './SignInPage';
import { USER_DATA_MOCK } from './SignInPage.constants';

describe('SignInPage', () => {
  it('matches snapshot', async () => {
    server.use(...unauthorizedHandlers);
    const { container } = render(<SignInPage />);
    await waitFor(() => expect(screen.getByText('Sign in')).toBeInTheDocument());
    expect(container.firstChild).toMatchSnapshot();
  });

  it('shows loader when user is loading', () => {
    render(<SignInPage />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('navigates to menu page if user is authenticated', async () => {
    render(<SignInPage />);
    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());
    expect(location.href).toMatch(PAGE_ROUTES.MENU);
  });

  it('navigates back on back button click', async () => {
    server.use(...unauthorizedHandlers);
    const { user } = render(<SignInPage />);

    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

    const backButton = screen.getByRole('button', { name: /back/i });
    expect(backButton).toBeInTheDocument();
    await user.click(backButton);
    expect(mockedUseNavigate).toHaveBeenCalledWith(PAGE_ROUTES.MENU);
  });

  it('navigates to sign up on sign up button click', async () => {
    server.use(...unauthorizedHandlers);
    const { user } = render(<SignInPage />);

    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

    const signUpButton = screen.getByRole('link', { name: 'First time here? Sign up' });
    expect(signUpButton).toBeInTheDocument();
    await user.click(signUpButton);
    expect(location.href).toMatch(PAGE_ROUTES.SIGN_UP);
  });

  it('displays an error message on failed sign in', async () => {
    server.use(...unauthorizedHandlers);
    const { user } = render(<SignInPage />);

    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

    await user.type(screen.getByLabelText(/login/i), 'wrong_login');
    await user.type(screen.getByLabelText(/password/i), 'wrong_password');
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(await screen.findByText(/Invalid credentials/i)).toBeInTheDocument();
  });

  it('calls signin with correct data', async () => {
    server.use(...unauthorizedHandlers);
    const { user } = render(<SignInPage />);

    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());

    server.use(...handlers);
    await user.type(screen.getByLabelText(/login/i), USER_DATA_MOCK.login);
    await user.type(screen.getByLabelText(/password/i), USER_DATA_MOCK.password);
    await user.click(screen.getByRole('button', { name: /submit/i }));

    expect(location.href).toMatch(PAGE_ROUTES.MENU);
  });
});
