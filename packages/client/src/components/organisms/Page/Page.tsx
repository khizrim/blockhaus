import { Container } from 'src/components/atoms/Container';

import { Header } from 'src/components/organisms/Header';

export type PageProps = {
  title?: string;
  withHeader?: boolean;
  hasBackButton?: boolean;
  isFullWidth?: boolean;
  children?: React.ReactNode;
};

export const Page = ({ title, withHeader, hasBackButton, isFullWidth, children }: PageProps) => {
  return (
    <Container
      minHeight='100vh'
      justifyContent='center'
      alignItems='center'
      direction='column'
      width={isFullWidth ? '100%' : 'auto'}>
      {withHeader && <Header title={title} hasBackButton={hasBackButton} />}
      <Container
        width='100%'
        maxWidth={isFullWidth ? 'none' : '380px'}
        direction='column'
        justifyContent='center'
        alignItems='center'
        gap={8}
        grow>
        {children}
      </Container>
    </Container>
  );
};
