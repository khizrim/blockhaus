import * as Yup from 'yup';

const loginSchema = Yup.string()
  .trim()
  .matches(/^[a-zA-Z0-9_]+$/, 'Login can only contain letters, numbers, and underscores')
  .max(15, 'Login must be 15 characters or less')
  .required('Login is required');

const passwordSchema = Yup.string()
  .min(8, 'Password must be at least 8 characters')
  .max(100, 'Password cannot be longer than 100 characters')
  .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
  .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .matches(/[0-9]/, 'Password must contain at least one number')
  .matches(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character')
  .required('Password is required');

const emailSchema = Yup.string()
  .trim()
  .email('Invalid email address')
  .matches(/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Invalid email address')
  .required('Email is required');

const firstNameSchema = Yup.string()
  .trim()
  .min(2, 'First name must have at least 3 characters')
  .max(50, 'First name must be 50 characters or less')
  .required('First name is required');

const secondNameSchema = Yup.string()
  .trim()
  .min(2, 'Second name must have at least 3 characters')
  .max(50, 'Second name must be 50 characters or less')
  .required('Second name is required');

const displayNameSchema = Yup.string()
  .trim()
  .min(3, 'Display name must have at least 3 characters')
  .max(50, 'Display name must be 50 characters or less')
  .nonNullable();

const phoneSchema = Yup.string()
  .trim()
  .matches(/^\+?[1-9]\d{1,14}$/, 'Phone number is not valid')
  .required('Phone number is required');

export const signUpValidationSchema = Yup.object({
  first_name: firstNameSchema,
  second_name: secondNameSchema,
  display_name: displayNameSchema,
  login: loginSchema,
  email: emailSchema,
  phone: phoneSchema,
  password: passwordSchema,
});

export const userProfileValidationSchema = Yup.object({
  first_name: firstNameSchema,
  second_name: secondNameSchema,
  display_name: displayNameSchema,
  login: loginSchema,
  email: emailSchema,
  phone: phoneSchema,
});

export const changePasswordValidationSchema = Yup.object({
  current_password: passwordSchema.label('Current Password').required('Current password is required'),
  new_password: passwordSchema.label('New Password').required('New password is required'),
  confirm_password: Yup.string()
    .oneOf([Yup.ref('new_password'), ''], 'Passwords must match')
    .required('Please confirm your new password'),
});

export const findUserValidationSchema = Yup.object({
  login: loginSchema,
});
