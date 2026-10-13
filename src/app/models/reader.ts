export interface Reader {
  id: string;
  fullName: string;
  email: string;
  username: string;
  genre: string;
}

export interface RegistrationDetails {
  fullName: string;
  email: string;
  username: string;
  genre: string;
  password: string;
}

export interface LoginDetails {
  username: string;
  password: string;
}
