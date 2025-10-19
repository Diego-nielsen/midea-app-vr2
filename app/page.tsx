'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'

export default function HomePage() {
  const router = useRouter()

  const checkSession = useCallback(() => {
    const userId = localStorage.getItem('midea_user')
    if (userId) {
      router.push('/dashboard')
    }
  }, [router])

  useEffect(() => {
    checkSession()
  }, [checkSession])

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] flex flex-col items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-8 max-w-md w-full shadow-2xl">
        {/* Logos en esquinas superiores */}
        <div className="flex justify-between items-start mb-6 px-4">
          <img 
            src="/midea-logo.png" 
            alt="Midea Logo" 
            className="h-12 w-auto object-contain"
          />
          <img 
            src="/begas-control.png" 
            alt="Begas Control Logo" 
            className="h-12 w-auto object-contain"
          />
        </div>

        {/* Title */}
        <h1 className="text-center mb-2 text-gray-800">
          <span className="text-2xl font-normal">Bienvenido a</span>
        </h1>
        <h2 className="text-center text-3xl font-bold text-[#00A0E9] mb-6">
          Midea Experience
        </h2>

        {/* Description */}
        <p className="text-center text-gray-600 mb-8">
          Escanea tu código QR para comenzar la aventura interactiva
        </p>

        {/* Main Button */}
        <Button
          onClick={() => router.push('/auth-qr')}
          className="w-full bg-[#00A0E9] hover:bg-[#007FBA] text-white py-6 text-lg rounded-lg mb-4"
        >
          Iniciar sesión o registrarse
        </Button>

        {/* Admin Link */}
        <div className="text-center">
          <button
            onClick={() => router.push('/admin')}
            className="text-gray-600 text-sm hover:text-[#00A0E9] transition-colors"
          >
            ¿Eres organizador? <span className="text-[#00A0E9] font-semibold">Ir al panel admin</span>
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-8 text-white text-sm">
        Powered by Midea
      </div>
    </div>
  )
}