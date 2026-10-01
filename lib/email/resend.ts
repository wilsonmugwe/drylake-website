import "server-only";

import { Resend } from "resend";

let resendClient: Resend | null = null;

export function getResendClient() {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    throw new Error("Missing RESEND_API_KEY");
  }

  if (!resendClient) {
    resendClient = new Resend(apiKey);
  }

  return resendClient;
}

export function getEmailFromAddress() {
  const from = process.env.EMAIL_FROM;

  if (!from) {
    throw new Error("Missing EMAIL_FROM");
  }

  return from;
}