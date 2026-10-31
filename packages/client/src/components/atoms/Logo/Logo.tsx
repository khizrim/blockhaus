import { useMemo } from 'react';

import logoWithBlocks from 'src/assets/logos/blockhaus-full.svg';
import logo from 'src/assets/logos/blockhaus.svg';

export type LogoProps = {
  size?: 'auto' | 'sm' | 'md';
  isFull?: boolean;
};

export const Logo = ({ size = 'md', isFull = false }: LogoProps) => {
  const width = useMemo(() => {
    switch (size) {
      case 'auto':
        return 'auto';
      case 'sm':
        return '240px';
      case 'md':
        return '340px';
      default:
        return '340px';
    }
  }, [size]);

  return <img style={{ display: 'flex', width }} src={isFull ? logoWithBlocks : logo} alt='Blockhaus' />;
};
