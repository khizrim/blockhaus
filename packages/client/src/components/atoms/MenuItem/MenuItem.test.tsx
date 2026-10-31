import { render, screen, fireEvent } from 'src/utils/tests';

import { mockedUseNavigate } from 'src/utils/tests/mocks';

import { MenuItem } from './MenuItem';

describe('MenuItem', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the label text', () => {
    render(<MenuItem label='Test' />);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('calls the custom onClick handler when clicked', () => {
    const onClick = jest.fn();
    render(<MenuItem label='Test' onClick={onClick} />);
    const item = screen.getByText('Test');
    fireEvent.click(item);
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(mockedUseNavigate).not.toHaveBeenCalled();
  });

  it('calls navigate with href when clicked', () => {
    render(<MenuItem label='Test' href='/test' />);
    const item = screen.getByText('Test');
    fireEvent.click(item);
    expect(mockedUseNavigate).toHaveBeenCalledWith('/test');
  });
});
