import type { TextInputProps } from '@gravity-ui/uikit';
import { TextInput } from '@gravity-ui/uikit';

export type InputProps = {
  name: string;
  required?: boolean;
} & TextInputProps;

export const Input = ({ label, name, type = 'text', onChange, ...props }: InputProps) => {
  return (
    <TextInput
      label={label}
      name={name}
      type={type}
      onChange={onChange}
      size='xl'
      view='normal'
      pin='brick-brick'
      {...props}
    />
  );
};
