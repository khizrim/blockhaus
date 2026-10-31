import * as Yup from 'yup';

import type { InputProps } from 'src/components/atoms/Input';

export const inputs: InputProps[] = [
  { name: 'email', label: 'Email', type: 'email', autoComplete: 'email' },
  {
    name: 'first_name',
    label: 'First Name',
    type: 'text',
    autoComplete: 'given-name',
  },
  {
    name: 'second_name',
    label: 'Second Name',
    type: 'text',
    autoComplete: 'family-name',
  },
  {
    name: 'display_name',
    label: 'Display name',
    type: 'text',
    autoComplete: 'given-name',
  },
  { name: 'login', label: 'Login', type: 'text', autoComplete: 'username' },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
];

export const validationSchema = Yup.object({
  email: Yup.string().email('Invalid email address').required('Email is required'),
  first_name: Yup.string().max(50, 'First name must be 50 characters or less').required('First name is required'),
  second_name: Yup.string().max(50, 'Second name must be 50 characters or less').required('Second name is required'),
  display_name: Yup.string().max(50, 'Display name must be 50 characters or less'),
  login: Yup.string().max(15, 'Login must be 15 characters or less').required('Login is required'),
  phone: Yup.string().required('Phone number is required'),
});
