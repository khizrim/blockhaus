import type { FC } from 'react';
import { useEffect } from 'react';

import ErrorBoundary from 'src/services/error/error-boundary';

const NormalComponent: FC = () => {
  return <div>normal</div>;
};

const ErrorComponent: FC = () => {
  useEffect(() => {
    throw new Error('Error from component');
  }, []);

  return <div>error</div>;
};

export const ErrorBoundaryPage = () => {
  return (
    <>
      <div>ErrorBoundaryPage - test page for error boundary</div>
      <hr />
      <ErrorBoundary>
        <NormalComponent />
      </ErrorBoundary>
      <hr />
      <ErrorBoundary>
        <ErrorComponent />
      </ErrorBoundary>
    </>
  );
};
