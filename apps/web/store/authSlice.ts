import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  firstName?: string;
  lastName?: string;
  role?: string;
};

type AuthState = {
  user: AuthUser | null;
  token: string | null;
  hydrated: boolean;
};

const initialState: AuthState = {
  user: null,
  token: null,
  hydrated: false,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthUser; token?: string | null }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token ?? null;
      state.hydrated = true;
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.hydrated = true;
    },
    setHydrated: (state) => {
      state.hydrated = true;
    },
  },
});

export const { setCredentials, logout, setHydrated } = authSlice.actions;
export default authSlice.reducer;

export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  Boolean(state.auth.user && state.auth.token);
