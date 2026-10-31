import { waitFor } from '@testing-library/react';

import { render, screen } from 'src/utils/tests';

import { mockedUseNavigate, mockedUser } from 'src/utils/tests/mocks';

import { Header } from './Header';

describe('Header', () => {
  it('renders with back button when hasBackButton is true', () => {
    render(<Header hasBackButton={true} />);
    expect(screen.getByText('Back')).toBeInTheDocument();
  });

  it('renders without back button when hasBackButton is false', () => {
    render(<Header hasBackButton={false} />);
    expect(screen.queryByText('Back')).not.toBeInTheDocument();
  });

  it('renders user when user is provided', async () => {
    render(<Header hasBackButton={false} />);
    await waitFor(() => expect(screen.queryByTestId('skeleton')).not.toBeInTheDocument());
    expect(screen.getByText(mockedUser.display_name)).toBeInTheDocument();
  });

  it('navigates back when the back button is clicked', async () => {
    const { user } = render(<Header hasBackButton={true} />);

    await user.click(screen.getByText('Back'));
    expect(mockedUseNavigate).toHaveBeenCalledTimes(1);
  });
});
