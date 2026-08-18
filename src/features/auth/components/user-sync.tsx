"use client";

import { useSyncUser } from "../hooks/use-sync-user";

export default function UserSync() {
  useSyncUser();

  return null;
}