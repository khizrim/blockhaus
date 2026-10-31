type TUserCommon = {
  first_name: string;
  second_name: string;
  display_name?: string;
  login: string;
  email: string;
  phone: string;
};

type TPassword = {
  password: string;
};

export type TUser = TUserCommon & {
  id?: number;
  avatar?: string;
};

export type TSignUpRequest = TUserCommon & TPassword;

export type TSignUpResponse = {
  id: number;
};

export type TSignInRequest = {
  login: string;
} & TPassword;

export type TUserProfileRequest = TUserCommon;

export type TUserPassword = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export type TUserPasswordRequest = {
  oldPassword: string;
  newPassword: string;
};

export type TFindUserRequest = {
  login: string;
};

export type TErrorFn = (e: Error) => void;
