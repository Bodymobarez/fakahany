import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AuthUser = {
  id: string;
  email: string | null;
  phone: string | null;
  firstName: string;
  lastName: string;
  role: string;
};

interface AuthState {
  user: AuthUser | null;
  accessToken: string | null;
  hydrated: boolean;
}

const initialState: AuthState = {
  user: null,
  accessToken: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(
      state,
      action: PayloadAction<{ user: AuthUser; accessToken: string }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.hydrated = true;
    },
    clearCredentials(state) {
      state.user = null;
      state.accessToken = null;
      state.hydrated = true;
    },
    hydrateAuth(
      state,
      action: PayloadAction<{ user: AuthUser | null; accessToken: string | null }>,
    ) {
      state.user = action.payload.user;
      state.accessToken = action.payload.accessToken;
      state.hydrated = true;
    },
  },
});

export const { setCredentials, clearCredentials, hydrateAuth } = authSlice.actions;
export default authSlice.reducer;
