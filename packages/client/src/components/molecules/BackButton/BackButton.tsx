import React from 'react';

import { useLocation, useNavigate } from 'react-router-dom';

import { Button } from 'src/components/atoms/Button';

interface BackButtonProps {
  fallbackRoute: string;
  children?: React.ReactNode;
}

export const BackButton = ({ fallbackRoute, children, ...props }: BackButtonProps) => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleBackClick = () => {
    if (location.key && window.history.length > 2) {
      navigate(-1);
    } else {
      navigate(fallbackRoute);
    }
  };

  return (
    <Button view='flat' onClick={handleBackClick} {...props}>
      {children || 'Go Back'}
    </Button>
  );
};
