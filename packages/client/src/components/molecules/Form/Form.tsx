import { useState } from 'react';

import { Text } from '@gravity-ui/uikit';
import type { FormikErrors, FormikHelpers, FormikValues } from 'formik';
import { Field, Form as FormikForm, Formik } from 'formik';
import type * as Yup from 'yup';

import { Button } from 'src/components/atoms/Button';
import { Container } from 'src/components/atoms/Container';
import type { InputProps } from 'src/components/atoms/Input';
import { Input } from 'src/components/atoms/Input';

interface FormProps<T> {
  initialValues?: T;
  validationSchema?: Yup.Schema<T>;
  onSubmit: (values: T, formikHelpers: FormikHelpers<T>) => Promise<void>;
  inputs?: InputProps[];
  inputView?: InputProps['view'];
  errorMessage?: string;
  submitButtonText?: string;
  showEditButton?: boolean;
  showResetButton?: boolean;
  children?: React.ReactNode;
}

export const Form = <T extends FormikValues>({
  initialValues = {} as T,
  validationSchema,
  onSubmit,
  inputs,
  inputView = 'normal',
  errorMessage,
  submitButtonText = 'Submit',
  showEditButton = false,
  showResetButton = false,
  children,
}: FormProps<T>) => {
  const [isEditing, setIsEditing] = useState(!showEditButton);

  const handleEditClick = () => {
    setIsEditing(true);
  };

  return (
    <Formik
      initialValues={initialValues}
      validationSchema={validationSchema}
      onSubmit={async (values, formikHelpers) => {
        await onSubmit(values, formikHelpers).then(() => {
          setIsEditing(false);
        });
      }}>
      {({ values, errors, touched, handleChange, handleBlur, handleReset, isSubmitting, isValid }) => (
        <FormikForm style={{ width: '100%' }}>
          <Container direction='column' alignItems='center' width='100%' gap={4}>
            {inputs?.map(input => (
              <Field
                key={input.name}
                as={Input}
                {...input}
                size='xl'
                view={inputView}
                controlProps={{
                  readOnly: !isEditing,
                }}
                hasClear={isEditing}
                onChange={handleChange}
                onBlur={handleBlur}
                validationState={touched[input.name as keyof T] && errors[input.name as keyof T] && 'invalid'}
                errorMessage={errors[input.name as keyof T] as FormikErrors<string>}
                errorPlacement='inside'
                value={values[input.name as keyof T] || ''}
              />
            ))}
            {errorMessage && (
              <Text variant='body-short' color='danger'>
                {errorMessage}
              </Text>
            )}
            <Container direction='row' gap={2}>
              {showEditButton && !isEditing ? (
                <Button type='button' view='flat' onClick={handleEditClick}>
                  Edit
                </Button>
              ) : (
                <>
                  {showResetButton && (
                    <Button type='button' view='flat-secondary' onClick={handleReset} disabled={isSubmitting}>
                      Reset
                    </Button>
                  )}
                  <Button
                    view='action'
                    type='submit'
                    width='max'
                    loading={isSubmitting}
                    disabled={!isValid || isSubmitting}>
                    {submitButtonText}
                  </Button>
                </>
              )}
            </Container>
          </Container>
          {children}
        </FormikForm>
      )}
    </Formik>
  );
};
