'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'

interface UserData {
  nombre: string
  apellido: string
  puntaje: number
}

interface Estacion {
  id_estacion: string
  nombre: string
  descripcion: string
  completada: boolean
  correctas?: number
  total_preguntas: number
}

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userData, setUserData] = useState<UserData | null>(null)
  const [estaciones, setEstaciones] = useState<Estacion[]>([])
  const [loading, setLoading] = useState(true)

  const loadUserData = useCallback(async () => {
    const userId = localStorage.getItem('midea_user')
    
    if (!userId) {
      router.push('/auth-qr')
      return
    }

    try {
      const { data: invitado } = await supabase
        .from('invitados')
        .select('nombre, apellido, puntaje')
        .eq('id_invitado', userId)
        .single()

      if (invitado) setUserData(invitado)

      const { data: todasEstaciones } = await supabase
        .from('estaciones')
        .select('id_estacion, nombre, descripcion')
        .order('nombre')

      const { data: resultados } = await supabase
        .from('resultados_estacion')
        .select('id_estacion, correctas')
        .eq('id_invitado', userId)

      const estacionesProcesadas: Estacion[] = (todasEstaciones || []).map(est => {
        const resultado = resultados?.find(r => r.id_estacion === est.id_estacion)
        return {
          ...est,
          completada: !!resultado,
          correctas: resultado?.correctas,
          total_preguntas: 5
        }
      })

      setEstaciones(estacionesProcesadas)

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
      <div className="min-h-screen bg-gradient-to-br from-[#00A0E9] via-[#007FBA] to-[#005A8F] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00A0E9] via-[#007FBA] to-[#005A8F] pb-8">
      {/* Header */}
      <div className="backdrop-blur-md bg-white/10 border-b border-white/20">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img 
                src="/midea-logo.png" 
                alt="Midea Logo" 
                className="h-10 w-auto brightness-0 invert"
              />
              <div className="h-8 w-px bg-white/30"></div>
              <img 
                src="/begas-control.png" 
                alt="Begas Control" 
                className="h-8 w-auto brightness-0 invert"
              />
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-white hover:bg-white/20 border border-white/30"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        
        {/* Bienvenida */}
        <div className="text-center text-white mb-6">
          <p className="text-lg opacity-90 mb-2">Bienvenido,</p>
          <h1 className="text-4xl font-bold">{userData?.nombre}</h1>
        </div>

        {/* Card de aciertos totales */}
        <div className="backdrop-blur-xl bg-white/95 rounded-2xl p-8 shadow-2xl border border-white/50">
          <div className="text-center">
            <p className="text-gray-600 text-lg mb-3 font-semibold">Total de Aciertos</p>
            <p className="text-7xl font-black text-[#00A0E9] mb-2">{userData?.puntaje || 0}</p>
            <p className="text-sm text-gray-500">respuestas correctas</p>
          </div>
        </div>

        {/* Tabla de estaciones */}
        <div className="backdrop-blur-xl bg-white/95 rounded-2xl p-8 shadow-2xl border border-white/50">
          <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6">
            📍 Progreso por Estación
          </h2>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <table className="w-full">
              <thead>
                <tr className="bg-gradient-to-r from-[#00A0E9] to-[#007FBA] text-white">
                  <th className="text-left px-6 py-4 font-bold">Estación</th>
                  <th className="text-center px-6 py-4 font-bold">Aciertos</th>
                </tr>
              </thead>
              <tbody>
                {estaciones.map((estacion, index) => (
                  <tr 
                    key={estacion.id_estacion}
                    className={`border-b border-gray-200 ${
                      index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    } hover:bg-blue-50 transition-colors`}
                  >
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-[#0A0A0A]">{estacion.nombre}</p>
                        <p className="text-sm text-gray-500">{estacion.descripcion}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      {estacion.completada ? (
                        <span className="inline-flex items-center justify-center min-w-[80px] px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold text-lg border-2 border-green-300">
                          {estacion.correctas}/{estacion.total_preguntas}
                        </span>
                      ) : (
                        <span className="inline-flex items-center justify-center min-w-[80px] px-4 py-2 bg-gray-100 text-gray-400 rounded-lg font-bold text-lg border-2 border-gray-300">
                          - / -
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {estaciones.length === 0 && (
              <div className="text-center py-12 text-gray-400">
                <p>No hay estaciones disponibles</p>
              </div>
            )}
          </div>
        </div>

        {/* Botón para ir a trivias */}
        <div className="flex justify-center pt-4">
          <Button
            onClick={() => router.push('/trivia')}
            className="w-full max-w-md bg-gradient-to-r from-[#00A0E9] to-[#007FBA] hover:from-[#007FBA] hover:to-[#005A8F] text-white py-6 text-xl font-bold rounded-xl shadow-lg"
          >
            🚀 Ir a Trivias
          </Button>
        </div>

      </div>
    </div>
  )
}