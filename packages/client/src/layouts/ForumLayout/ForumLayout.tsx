import { Outlet } from 'react-router-dom';

import { Page } from 'src/components/organisms';

export const ForumLayout = () => {
  return (
    <Page title='Forum' isFullWidth withHeader hasBackButton>
      <Outlet />
    </Page>
  );
};
