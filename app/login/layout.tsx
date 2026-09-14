import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TSC • Sign In',
  description: 'Sign in to TSC — Your Personal AI School Operating System & Study Companion.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
