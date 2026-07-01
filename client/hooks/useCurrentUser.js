"use client";

import { useAuth } from "@/context/AuthContext";

export default function useCurrentUser() {
  const { user, loading } = useAuth();
  return { user, loading };
}
