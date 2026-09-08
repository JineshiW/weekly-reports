import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as authApi from "../api/auth";
import { clearToken, getToken, saveToken } from "../api/http";

// Context that holds the current auth state, available to any component
// wrapped in <AuthProvider>.
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Tracks whether we're still verifying an existing token on first load,
  // so consumers can show a loading state instead of flashing "logged out".
  const [checking, setChecking] = useState(true);

  // Restore the session on a full page reload if a token is still around.
  useEffect(() => {
    if (!getToken()) {
      // No token stored — nothing to restore, stop checking immediately.
      setChecking(false);
      return;
    }
    authApi
      .currentUser()
      .then((data) => setUser(data.user))
      // Token is invalid/expired — wipe it so we don't keep retrying with it.
      .catch(() => clearToken())
      .finally(() => setChecking(false));
  }, []);

  // Logs in with credentials, stores the returned token, and updates user state.
  const signIn = useCallback(async (credentials) => {
    const data = await authApi.login(credentials);
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Registers a new account, then signs them in the same way login does.
  const signUp = useCallback(async (details) => {
    const data = await authApi.register(details);
    saveToken(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  // Logs out on the server, then always clears local state/token —
  // even if the server call fails, we still want the user signed out locally.
  const signOut = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      clearToken();
      setUser(null);
    }
  }, []);

  // Memoized context value so consumers don't re-render on every provider render.
  // isManager is derived here for convenience so components don't need to
  // check user.role themselves everywhere.
  const value = useMemo(
    () => ({ user, checking, signIn, signUp, signOut, isManager: user?.role === "manager" }),
    [user, checking, signIn, signUp, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Convenience hook for consuming the auth context.
// Throws if used outside <AuthProvider> so misuse fails loudly instead of
// silently returning null/undefined.
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}