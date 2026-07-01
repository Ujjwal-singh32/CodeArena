"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { authApi } from "@/services/api";
import { useAuth } from "@/context/AuthContext";

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const { refresh } = useAuth();
  const [status, setStatus] = useState("verifying");
  const [message, setMessage] = useState("Verifying your email...");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Missing verification token.");
      return;
    }

    authApi
      .verifyEmail(token)
      .then(async () => {
        setStatus("success");
        setMessage("Your email has been verified successfully. You can now sign in.");
        await refresh();
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message || "Verification failed.");
      });
  }, [token, refresh]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-6">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center">
        <h1 className="text-2xl font-semibold">Email Verification</h1>
        <p
          className={`mt-3 text-sm ${status === "error" ? "text-danger" : status === "success" ? "text-primary" : "text-muted"}`}
        >
          {message}
        </p>
        <div className="mt-6">
          <Link href="/login" className="text-primary hover:underline">
            Go to login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<div className="min-h-[70vh] flex items-center justify-center text-muted">Loading...</div>}>
      <VerifyEmailContent />
    </Suspense>
  );
}
