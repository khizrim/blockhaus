import { waitFor } from '@testing-library/react';

import { PAGE_ROUTES } from 'src/utils/constants';
import { render, screen } from 'src/utils/tests';

import { unauthorizedHandlers } from 'src/utils/tests/mocks/handlers';
import { server } from 'src/utils/tests/mocks/server';

import { ProtectedRoute } from './ProtectedRoute';

describe('ProtectedRoute', () => {
  const testElement = <div>Test</div>;

  it('shows loader when user is loading', () => {
    render(<ProtectedRoute element={testElement} />);
    expect(screen.getByTestId('loader')).toBeInTheDocument();
  });

  it('navigate to sign in if user is not authenticated', async () => {
    server.use(...unauthorizedHandlers);
    render(<ProtectedRoute element={testElement} />);
    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());
    expect(location.href).toMatch(PAGE_ROUTES.SIGN_IN);
  });

  it('renders the element if user is authenticated', async () => {
    render(<ProtectedRoute element={testElement} />);

    await waitFor(() => expect(screen.queryByTestId('loader')).not.toBeInTheDocument());
    expect(screen.getByText('Test')).toBeInTheDocument();
  });
});
