import { waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import * as Yup from 'yup';

import type { InputProps } from 'src/components/atoms/Input';
import { render, screen } from 'src/utils/tests';

import { Form } from './Form';

describe('Form', () => {
  const initialValues = {
    username: '',
    password: '',
  };

  const validationSchema = Yup.object({
    username: Yup.string().required('Username is required'),
    password: Yup.string().required('Password is required'),
  });

  const inputs: InputProps[] = [
    {
      name: 'username',
      label: 'Username',
    },
    {
      name: 'password',
      label: 'Password',
      type: 'password',
    },
  ];

  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders all inputs with initial values', () => {
    render(
      <Form initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit} inputs={inputs} />
    );

    inputs.forEach(input => {
      expect(screen.getByLabelText(input.label as string)).toBeInTheDocument();
      expect(screen.getByLabelText(input.label as string)).toHaveValue('');
    });
  });

  it('updates formik value on input change', async () => {
    render(
      <Form initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit} inputs={inputs} />
    );

    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Username'), 'test');
    await user.type(screen.getByLabelText('Password'), 'test');

    expect(screen.getByLabelText('Username')).toHaveValue('test');
    expect(screen.getByLabelText('Password')).toHaveValue('test');
  });

  it('shows a error message if provided', () => {
    const errorMessage = 'Something went wrong';
    render(
      <Form
        initialValues={initialValues}
        validationSchema={validationSchema}
        onSubmit={onSubmit}
        inputs={inputs}
        errorMessage={errorMessage}
      />
    );
    expect(screen.getByText(errorMessage)).toBeInTheDocument();
  });

  it('submits the form with correct values', async () => {
    render(
      <Form initialValues={initialValues} validationSchema={validationSchema} onSubmit={onSubmit} inputs={inputs} />
    );

    const user = userEvent.setup();

    await user.type(screen.getByLabelText('Username'), 'test');
    await user.type(screen.getByLabelText('Password'), 'test');
    await user.click(screen.getByRole('button', { name: 'Submit' }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        {
          username: 'test',
          password: 'test',
        },
        expect.anything()
      );
    });
  });
});
