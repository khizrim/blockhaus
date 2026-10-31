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
  { name: 'login', label: 'Login', type: 'text', autoComplete: 'username' },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
    autoComplete: 'new-password',
  },
  { name: 'phone', label: 'Phone', type: 'tel', autoComplete: 'tel' },
];
