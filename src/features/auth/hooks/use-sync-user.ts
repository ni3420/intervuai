"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";

export const useSyncUser = () => {
  const { user, isLoaded } = useUser();

  const createUser = useMutation(
    api.users.createUser
  );

  useEffect(() => {
    if (!isLoaded || !user) return;

    createUser({
      userId: user.id,
      name: user.fullName ?? undefined,
      email: user.primaryEmailAddress?.emailAddress,
      image: user.imageUrl,
    });
  }, [isLoaded, user, createUser]);
};