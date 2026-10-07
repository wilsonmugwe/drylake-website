import ClerkScope from "@/components/auth/ClerkScope";

/* Clerk for the <SignUp> card. */
export default function SignUpLayout({ children }: { children: React.ReactNode }) {
  return <ClerkScope>{children}</ClerkScope>;
}
