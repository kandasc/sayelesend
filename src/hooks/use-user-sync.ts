import { useEffect } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api.js";
import { useAuth } from "@clerk/clerk-react";

export function useUserSync() {
  const { isSignedIn, isLoaded } = useAuth();
  const createOrUpdate = useMutation(api.users.createOrUpdateUser);
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    const timer = setTimeout(() => {
      createOrUpdate().catch(console.error);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isSignedIn, isLoaded, createOrUpdate]);
}
