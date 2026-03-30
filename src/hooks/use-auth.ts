import {
  useAuth as useClerkAuth,
  useClerk,
  useUser as useClerkUser,
} from "@clerk/clerk-react";
import { useCallback, useEffect, useMemo } from "react";

export type AuthUser = {
  id_token?: string;
  profile: {
    sub?: string;
    name?: string;
    email?: string;
    picture?: string;
  };
} | null;

export type UseAuthHook = {
  user: AuthUser;
  isLoading: boolean;
  error: Error | undefined;
  isAuthenticated: boolean;
  signinRedirect: () => Promise<void>;
  signoutRedirect: () => Promise<void>;
  removeUser: () => Promise<void>;
  fetchAccessToken: (args: { forceRefreshToken: boolean }) => Promise<string | null>;
};

export function useAuth(): UseAuthHook {
  const { isLoaded, isSignedIn, signOut, getToken } = useClerkAuth();
  const { openSignIn } = useClerk();
  const { user: clerkUser, isLoaded: userLoaded } = useClerkUser();

  const signinRedirect = useCallback(async () => {
    openSignIn({});
  }, [openSignIn]);

  const signoutRedirect = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const removeUser = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const fetchAccessToken = useCallback(
    async ({ forceRefreshToken }: { forceRefreshToken: boolean }) => {
      return getToken({ template: "convex", skipCache: forceRefreshToken });
    },
    [getToken],
  );

  const user = useMemo((): AuthUser => {
    if (!isSignedIn || !userLoaded || !clerkUser) return null;
    return {
      profile: {
        sub: clerkUser.id,
        name:
          clerkUser.fullName ??
          ([clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") ||
            undefined),
        email: clerkUser.primaryEmailAddress?.emailAddress,
        picture: clerkUser.imageUrl ?? undefined,
      },
    };
  }, [isSignedIn, userLoaded, clerkUser]);

  const isLoading = !isLoaded || (!!isSignedIn && !userLoaded);

  return useMemo(
    () => ({
      user,
      isLoading,
      error: undefined,
      isAuthenticated: !!isSignedIn,
      signinRedirect,
      signoutRedirect,
      removeUser,
      fetchAccessToken,
    }),
    [
      user,
      isLoading,
      isSignedIn,
      signinRedirect,
      signoutRedirect,
      removeUser,
      fetchAccessToken,
    ],
  );
}

type UseUserProps = {
  /**
   * Whether to automatically redirect to the login if the user is not authenticated
   */
  shouldRedirect?: boolean;
};

export function useUser({ shouldRedirect }: UseUserProps = {}) {
  const { user, isLoading, error, isAuthenticated, signinRedirect } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated && shouldRedirect) {
      signinRedirect();
    }
  }, [isLoading, isAuthenticated, shouldRedirect, signinRedirect]);

  return useMemo(() => {
    const id = user?.profile.sub;
    const name = user?.profile.name;
    const email = user?.profile.email;
    const avatar = user?.profile.picture;
    return {
      ...(user ?? {}),
      id,
      name,
      email,
      avatar,
      isAuthenticated,
      isLoading,
      error,
    };
  }, [user, isAuthenticated, isLoading, error]);
}
