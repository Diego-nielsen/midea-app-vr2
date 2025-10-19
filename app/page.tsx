'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    setMounted(true)
    // Verificar si ya hay sesión activa
    checkSession()
  }, [])

  const checkSession = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      router.push('/dashboard')
    }
  }

  if (!mounted) return null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-[#00A0E9] to-[#007FBA]">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8 text-center space-y-8">
        
        {/* Logo Midea */}
        <div className="flex justify-center">
          <div className="w-32 h-32 bg-gradient-to-br from-[#00A0E9] to-[#007FBA] rounded-full flex items-center justify-center shadow-lg">
            <span className="text-white text-6xl font-bold">M</span>
          </div>
        </div>
        
        {/* Título */}
        <div>
          <h1 className="text-3xl font-bold text-[#0A0A0A] mb-2">
            Bienvenido a
          </h1>
          <h2 className="text-4xl font-bold text-[#00A0E9]">
            Midea Experience
          </h2>
        </div>
        
        {/* Descripción */}
        <p className="text-gray-600 text-lg">
          Escanea tu código QR para comenzar la aventura interactiva
        </p>
        
        {/* Botón principal */}
        <div className="pt-4">
          <button
            onClick={() => router.push('/auth-qr')}
            className="w-full bg-[#00A0E9] hover:bg-[#007FBA] text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            Iniciar sesión o registrarse
          </button>
        </div>
        
        {/* Link admin */}
        <div className="pt-4 border-t border-gray-200">
          <p className="text-sm text-gray-500">
            ¿Eres organizador?{' '}
            <button
              onClick={() => router.push('/admin')}
              className="text-[#00A0E9] font-semibold hover:underline"
            >
              Ir al panel admin
            </button>
          </p>
        </div>
        
      </div>
      
      {/* Footer */}
      <div className="mt-8 text-white/80 text-sm">
        Powered by Midea
      </div>
    </div>
  )
}