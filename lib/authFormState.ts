export interface AuthFormState {
  step: "start" | "code";
  email?: string;
  clinicName?: string;
  error?: string;
}

export const initialAuthState: AuthFormState = { step: "start" };
