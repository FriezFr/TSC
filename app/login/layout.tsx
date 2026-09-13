import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'TaskerBot / TSC AI • Sign In',
  description: 'Sign in to TaskerBot / TSC AI — Your Smart Personal School & Study Assistant.',
};

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
