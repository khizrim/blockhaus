import { useState } from 'react';

import type { FormikHelpers } from 'formik';

import { Form } from 'src/components/molecules/Form';
import { Page } from 'src/components/organisms/Page';
import { inputs } from 'src/pages/ChangePassword/ChangePassword.constants';
import { userAPI } from 'src/pages/ProfilePage';
import type { TUserPassword } from 'src/shared/types/user';
import { changePasswordValidationSchema } from 'src/shared/validation/user';
import Helpers from 'src/utils/helpers';

export const ChangePassword = () => {
  const [error, setError] = useState<string | undefined>(undefined);

  const handleSubmit = async (password: TUserPassword, { setSubmitting }: FormikHelpers<TUserPassword>) => {
    setSubmitting(true);

    const changePasswordRequest = {
      oldPassword: password.current_password,
      newPassword: password.new_password === password.confirm_password ? password.new_password : '',
    };

    await userAPI.changePassword(changePasswordRequest, updUserData, errorHandler);
  };
  const updUserData = () => {
    console.log('Password Updated');
  };

  const errorHandler = (err: unknown) => {
    setError(String(err));
    Helpers.Log('ERROR', err);
  };

  return (
    <Page withHeader hasBackButton>
      <Form
        inputs={inputs}
        onSubmit={handleSubmit}
        validationSchema={changePasswordValidationSchema}
        errorMessage={error}
        submitButtonText='Change Password'
      />
    </Page>
  );
};
