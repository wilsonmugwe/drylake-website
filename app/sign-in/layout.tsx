import ClerkScope from "@/components/auth/ClerkScope";

/* Clerk for the <SignIn> card. */
export default function SignInLayout({ children }: { children: React.ReactNode }) {
  return <ClerkScope>{children}</ClerkScope>;
}
