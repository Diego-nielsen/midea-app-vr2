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

interface EstacionCompletada {
  id_estacion: string
  nombre: string
  correctas: number
  total_preguntas: number
  puntos: number
}

interface EstacionPendiente {
  id_estacion: string
  nombre: string
  descripcion: string
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [estacionesCompletadas, setEstacionesCompletadas] = useState<EstacionCompletada[]>([])
  const [estacionesPendientes, setEstacionesPendientes] = useState<EstacionPendiente[]>([])
  const [loading, setLoading] = useState(true)

  const loadUserData = useCallback(async () => {
    const userId = localStorage.getItem('midea_user')
    
    if (!userId) {
      router.push('/auth-qr')
      return
    }

    try {
      // Cargar datos del invitado
      const { data: invitado } = await supabase
        .from('invitados')
        .select('nombre, apellido, puntaje')
        .eq('id_invitado', userId)
        .single()

      if (invitado) setUserData(invitado)

      // Cargar todas las estaciones
      const { data: todasEstaciones } = await supabase
        .from('estaciones')
        .select('id_estacion, nombre, descripcion')
        .order('nombre')

      // Cargar resultados de estaciones completadas
      const { data: resultados } = await supabase
        .from('resultados_estacion')
        .select('id_estacion, correctas, puntos')
        .eq('id_invitado', userId)

      // Procesar estaciones completadas
      const completadas: EstacionCompletada[] = []
      for (const resultado of resultados || []) {
        const estacion = todasEstaciones?.find(e => e.id_estacion === resultado.id_estacion)
        if (estacion) {
          completadas.push({
            id_estacion: resultado.id_estacion,
            nombre: estacion.nombre,
            correctas: resultado.correctas,
            total_preguntas: 5, // Siempre son 5 preguntas
            puntos: resultado.puntos
          })
        }
      }
      setEstacionesCompletadas(completadas)

      // Procesar estaciones pendientes
      const completadasIds = completadas.map(e => e.id_estacion)
      const pendientes = todasEstaciones?.filter(e => !completadasIds.includes(e.id_estacion)) || []
      setEstacionesPendientes(pendientes)

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
    <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] p-4 pb-8">
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

        {/* Card de puntaje */}
        <Card className="p-6 mb-6">
          <div className="text-center">
            <p className="text-gray-600 mb-2">Tu puntaje total</p>
            <p className="text-6xl font-bold text-[#00A0E9]">
              {userData?.puntaje || 0}
            </p>
            <p className="text-sm text-gray-500 mt-4">
              {estacionesCompletadas.length} de {estacionesCompletadas.length + estacionesPendientes.length} estaciones completadas
            </p>
          </div>
        </Card>

        {/* Estaciones completadas */}
        {estacionesCompletadas.length > 0 && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-bold text-[#0A0A0A] mb-4">
              ✅ Estaciones completadas
            </h3>
            <div className="space-y-3">
              {estacionesCompletadas.map((est) => (
                <div 
                  key={est.id_estacion} 
                  className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 border border-green-200"
                >
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-[#0A0A0A]">{est.nombre}</h4>
                    <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded-full">
                      Completada
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="text-sm">
                      <span className="font-bold text-[#00A0E9]">{est.correctas}</span>
                      <span className="text-gray-600"> / {est.total_preguntas} aciertos</span>
                    </div>
                    <div className="text-right">
                      <span className="text-lg font-bold text-[#00A0E9]">+{est.puntos}</span>
                      <span className="text-xs text-gray-500 block">puntos</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Estaciones pendientes */}
        {estacionesPendientes.length > 0 && (
          <Card className="p-6 mb-6">
            <h3 className="text-lg font-bold text-[#0A0A0A] mb-4">
              📍 Estaciones pendientes
            </h3>
            <div className="space-y-3">
              {estacionesPendientes.map((est) => (
                <div 
                  key={est.id_estacion} 
                  className="bg-gray-50 rounded-lg p-4 border border-gray-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold text-[#0A0A0A] mb-1">{est.nombre}</h4>
                      <p className="text-sm text-gray-600">{est.descripcion}</p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-1 bg-gray-200 text-gray-600 rounded-full whitespace-nowrap ml-2">
                      Pendiente
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {/* Botones de acción */}
        <div className="space-y-3">
          <Button
            onClick={() => router.push('/trivia')}
            className="w-full bg-[#00A0E9] hover:bg-[#007FBA] text-white py-6 text-lg"
          >
            {estacionesPendientes.length > 0 ? 'Ir a Trivias' : '🎉 ¡Has completado todas las estaciones!'}
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