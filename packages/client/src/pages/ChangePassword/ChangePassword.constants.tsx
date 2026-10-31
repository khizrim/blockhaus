import type { InputProps } from 'src/components/atoms/Input';

export const inputs: InputProps[] = [
  {
    name: 'current_password',
    label: 'Current Password',
    type: 'password',
    required: true,
    autoComplete: 'password',
  },
  {
    name: 'new_password',
    label: 'Password',
    type: 'password',
    autoComplete: 'new-password',
  },
  {
    name: 'confirm_password',
    label: 'Confirm Password',
    type: 'password',
    autoComplete: 'new-password',
  },
];
