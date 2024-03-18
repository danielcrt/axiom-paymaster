import './globals.css'
import type { Metadata } from 'next'
import Providers from './providers'
import MainLayout from '@/components/layout/MainLayout';
import AxiomProvider from './axiomProvider';

export const metadata: Metadata = {
  title: 'Axiom Paymaster Demo',
  description: 'An example of GaslessPaymaster powered by ZK proofs.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          <main className="flex flex-col w-screen max-w-sm min-h-screen justify-center items-center m-auto">
            <MainLayout>
              <AxiomProvider>
                {children}
              </AxiomProvider>
            </MainLayout>
          </main>
        </Providers>
      </body>
    </html>
  )
}
