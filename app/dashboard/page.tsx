'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface UserData {
  nombre: string
  apellido: string
  puntaje: number
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [estacionesCompletadas, setEstacionesCompletadas] = useState(0)
  const [loading, setLoading] = useState(true)

  const loadUserData = useCallback(async () => {
    const userId = localStorage.getItem('midea_user')
    
    if (!userId) {
      router.push('/auth-qr')
      return
    }

    try {
      // Cargar datos del invitado con puntaje
      const { data: invitado } = await supabase
        .from('invitados')
        .select('nombre, apellido, puntaje')
        .eq('id_invitado', userId)
        .single()

      // Cargar estaciones completadas
      const { data: resultados } = await supabase
        .from('resultados_estacion')
        .select('id_estacion')
        .eq('id_invitado', userId)

      if (invitado) setUserData(invitado)
      setEstacionesCompletadas(resultados?.length || 0)
    } catch (error) {
      console.error('Error loading user data:', error)
    } finally {
      setLoading(false)
    }
  }, [router, supabase])

  useEffect(() => {
    loadUserData()
  }, [loadUserData])

  const handleLogout = () => {
    localStorage.removeItem('midea_user')
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] flex items-center justify-center">
        <div className="text-white text-xl">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] p-4">
      <div className="max-w-md mx-auto pt-8">
        {/* Logos */}
        <div className="flex justify-between items-center mb-8 px-4">
          <img 
            src="/midea-logo.png" 
            alt="Midea Logo" 
            className="h-12 w-auto object-contain brightness-0 invert"
          />
          <img 
            src="/begas-control.png" 
            alt="Begas Control Logo" 
            className="h-10 w-auto object-contain brightness-0 invert"
          />
        </div>

        <div className="mb-8 text-center text-white">
          <h1 className="text-3xl font-bold mb-2">
            Midea Experience
          </h1>
          {userData && (
            <p className="text-xl">
              ¡Hola, {userData.nombre}!
            </p>
          )}
        </div>

        <Card className="p-6 mb-6">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Tu puntaje total</p>
            <p className="text-6xl font-bold text-[#00A0E9]">
              {userData?.puntaje || 0}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              Estaciones completadas: {estacionesCompletadas}
            </p>
          </div>
        </Card>

        <div className="space-y-3">
          <Button
            onClick={() => router.push('/trivia')}
            className="w-full bg-[#00A0E9] hover:bg-[#007FBA] text-white py-6 text-lg"
          >
            Ir a Trivias
          </Button>

          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full bg-white"
          >
            Cerrar Sesión
          </Button>
        </div>
      </div>
    </div>
  )
}