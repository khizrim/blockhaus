import { Text } from '@gravity-ui/uikit';

import { Page } from 'src/components/organisms/Page';

export const OfflinePage = () => {
  return (
    <Page>
      <Text variant='display-1' style={{ textAlign: 'center' }}>
        Uh-oh, Looks Like You’re Offline!
      </Text>
      <Text variant='body-1' style={{ textAlign: 'center' }}>
        We’ll keep things cozy until you’re back online.
      </Text>
    </Page>
  );
};
