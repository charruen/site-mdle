import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Administration Roses • MDLE Jean Perrin',
  description: 'Tableau de bord de gestion et trésorerie des roses de la Saint-Valentin MDLE',
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
