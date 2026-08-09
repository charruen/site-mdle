'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function RosesRedirect() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/p/roses')
  }, [router])

  return (
    <div className="min-h-screen bg-[#FAFAF8] flex items-center justify-center p-6 text-[#1B2A4A]">
      <div className="text-center space-y-3">
        <div className="w-10 h-10 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm font-bold">Redirection vers la page de commande des roses...</p>
      </div>
    </div>
  )
}
