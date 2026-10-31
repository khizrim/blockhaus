import { useCallback } from 'react';

import { Avatar, Loader, Text, useFileInput } from '@gravity-ui/uikit';

import type { FormikHelpers } from 'formik';

import { Button } from 'src/components/atoms/Button';
import { Container } from 'src/components/atoms/Container';
import { Form } from 'src/components/molecules';
import { BackButton } from 'src/components/molecules/BackButton';
import { Page } from 'src/components/organisms/Page';
import { inputs } from 'src/pages/ProfilePage/ProfilePage.constants';
import UserAPI from 'src/services/api/user-api';
import type { TUser } from 'src/shared/types/user';
import { userProfileValidationSchema } from 'src/shared/validation/user';
import { useGetUserQuery, useUpdateAvatarMutation, useUpdateProfileMutation } from 'src/store/features';
import { isFetchBaseQueryError } from 'src/utils/api-errors';
import { PAGE_ROUTES, RESOURCE_URL } from 'src/utils/constants';

export const userAPI = new UserAPI();

export const ProfilePage = () => {
  const { data: user } = useGetUserQuery();
  const [updateAvatar] = useUpdateAvatarMutation();
  const [updateProfile, { error: updateProfileError }] = useUpdateProfileMutation();

  const onUpdate = useCallback((files: File[]) => {
    files[0] && updateUserAvatar(files[0]);
  }, []);

  const { controlProps, triggerProps } = useFileInput({ onUpdate });

  const updateUserAvatar = async (avatar: File) => {
    const formData = new FormData();

    formData.append('avatar', avatar);

    await updateAvatar(formData);
  };

  const updateUserInfo = async (user: TUser, { setSubmitting }: FormikHelpers<TUser>) => {
    setSubmitting(true);
    await updateProfile(user).finally(() => setSubmitting(false));
  };

  const getErrorMessage = () => {
    if (isFetchBaseQueryError(updateProfileError)) {
      return (updateProfileError.data as { reason?: string })?.reason;
    }
  };

  if (user) {
    const name = user?.display_name || `${user?.first_name} ${user?.second_name}`;
    return (
      <Page>
        <Container direction='column' gap='2' alignItems='center' width='100%'>
          <input {...controlProps} />
          <Button style={{ height: '50px', width: '50px' }} pin='circle-circle' view='flat' {...triggerProps}>
            <Avatar size='xl' imgUrl={user?.avatar ? `${RESOURCE_URL}${user.avatar}` : undefined} text={name} />
          </Button>
          <Text variant='display-1'>{name}</Text>
        </Container>

        <Form
          initialValues={user}
          inputs={inputs}
          validationSchema={userProfileValidationSchema}
          inputView='clear'
          onSubmit={updateUserInfo}
          errorMessage={getErrorMessage()}
          submitButtonText='Save'
          showEditButton={true}
          showResetButton={true}
        />

        <Container direction='column' width='100%'>
          <Button isNavigate navigateTo={PAGE_ROUTES.CHANGE_PASSWORD} view='flat-danger' width='max'>
            Change Password
          </Button>
          <BackButton fallbackRoute={PAGE_ROUTES.MENU} />
        </Container>
      </Page>
    );
  }

  return (
    <Page>
      <Loader qa='loader' size='l' />
    </Page>
  );
};
