import type { InputProps } from 'src/components/atoms/Input';

export const USER_DATA_MOCK = {
  login: 'l586',
  password: '123!!321',
};

export const inputs: InputProps[] = [
  { name: 'login', label: 'Login', type: 'text' },
  {
    name: 'password',
    label: 'Password',
    type: 'password',
  },
];
