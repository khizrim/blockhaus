import type { FlexProps } from '@gravity-ui/uikit';
import { Flex } from '@gravity-ui/uikit';

export type ContainerProps = FlexProps;

export const Container = ({ as, children, ...props }: ContainerProps) => {
  return (
    <Flex as={as || 'section'} gap='3' {...props}>
      {children}
    </Flex>
  );
};
