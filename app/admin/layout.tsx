import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Administration — MDLE Jean Perrin',
  description: 'Panneau de gestion du site de la MDLE',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}