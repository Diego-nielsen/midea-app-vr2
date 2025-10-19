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
  total_preguntas?: number
  puntos?: number
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

      // Cargar resultados completados
      const { data: resultados } = await supabase
        .from('resultados_estacion')
        .select('id_estacion, correctas, puntos')
        .eq('id_invitado', userId)

      // Combinar datos
      const estacionesProcesadas: Estacion[] = (todasEstaciones || []).map(est => {
        const resultado = resultados?.find(r => r.id_estacion === est.id_estacion)
        return {
          ...est,
          completada: !!resultado,
          correctas: resultado?.correctas,
          total_preguntas: 5,
          puntos: resultado?.puntos
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

  const completadas = estaciones.filter(e => e.completada).length
  const totalEstaciones = estaciones.length
  const porcentajeCompletado = totalEstaciones > 0 ? Math.round((completadas / totalEstaciones) * 100) : 0

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-[#00A0E9] via-[#007FBA] to-[#005A8F] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-xl font-semibold">Cargando experiencia...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#00A0E9] via-[#007FBA] to-[#005A8F]">
      {/* Header con efecto glass */}
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
              Salir →
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-6">
        
        {/* Bienvenida */}
        <div className="text-center text-white mb-8">
          <p className="text-lg opacity-90 mb-2">Bienvenido de vuelta,</p>
          <h1 className="text-4xl font-bold">{userData?.nombre}</h1>
        </div>

        {/* Stats principales - Cards en grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* Puntaje total */}
          <div className="backdrop-blur-xl bg-white/95 rounded-2xl p-6 shadow-2xl border border-white/50 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Puntaje Total</span>
              <span className="text-3xl">🏆</span>
            </div>
            <p className="text-5xl font-black text-[#00A0E9] mb-2">{userData?.puntaje || 0}</p>
            <p className="text-xs text-gray-500">puntos acumulados</p>
          </div>

          {/* Estaciones completadas */}
          <div className="backdrop-blur-xl bg-white/95 rounded-2xl p-6 shadow-2xl border border-white/50 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Progreso</span>
              <span className="text-3xl">📍</span>
            </div>
            <p className="text-5xl font-black text-[#00A0E9] mb-2">{completadas}/{totalEstaciones}</p>
            <p className="text-xs text-gray-500">estaciones completadas</p>
          </div>

          {/* Porcentaje */}
          <div className="backdrop-blur-xl bg-white/95 rounded-2xl p-6 shadow-2xl border border-white/50 hover:scale-105 transition-transform">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Completado</span>
              <span className="text-3xl">⚡</span>
            </div>
            <p className="text-5xl font-black text-[#00A0E9] mb-2">{porcentajeCompletado}%</p>
            <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
              <div 
                className="bg-gradient-to-r from-[#00A0E9] to-[#007FBA] h-2 rounded-full transition-all duration-500"
                style={{ width: `${porcentajeCompletado}%` }}
              ></div>
            </div>
          </div>
        </div>

        {/* Estaciones - Grid moderno */}
        <div className="backdrop-blur-xl bg-white/95 rounded-2xl p-6 shadow-2xl border border-white/50">
          <h2 className="text-2xl font-bold text-[#0A0A0A] mb-6 flex items-center gap-3">
            <span className="text-3xl">🎯</span>
            Estaciones Midea
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {estaciones.map((estacion) => (
              <div
                key={estacion.id_estacion}
                className={`relative rounded-xl p-5 border-2 transition-all duration-300 ${
                  estacion.completada
                    ? 'bg-gradient-to-br from-green-50 to-blue-50 border-green-300 shadow-lg'
                    : 'bg-gray-50 border-gray-200 hover:border-[#00A0E9] hover:shadow-md'
                }`}
              >
                {/* Badge estado */}
                <div className="absolute top-3 right-3">
                  {estacion.completada ? (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-green-500 text-white">
                      ✓ Completada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold bg-gray-300 text-gray-700">
                      Pendiente
                    </span>
                  )}
                </div>

                {/* Contenido */}
                <div className="pr-20">
                  <h3 className="text-lg font-bold text-[#0A0A0A] mb-2">{estacion.nombre}</h3>
                  <p className="text-sm text-gray-600 mb-4">{estacion.descripcion}</p>

                  {estacion.completada ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-gray-200">
                        <span className="text-sm font-semibold text-gray-600">Aciertos</span>
                        <span className="text-lg font-black text-[#00A0E9]">
                          {estacion.correctas}/{estacion.total_preguntas}
                        </span>
                      </div>
                      <div className="flex items-center justify-between bg-white rounded-lg px-4 py-2 border border-gray-200">
                        <span className="text-sm font-semibold text-gray-600">Puntos</span>
                        <span className="text-lg font-black text-green-600">
                          +{estacion.puntos}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white rounded-lg px-4 py-3 border-2 border-dashed border-gray-300 text-center">
                      <p className="text-sm text-gray-500 font-semibold">Aún no completada</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {estaciones.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-lg">No hay estaciones disponibles</p>
            </div>
          )}
        </div>

        {/* Botón CTA grande */}
        <div className="sticky bottom-6 z-10">
          <Button
            onClick={() => router.push('/trivia')}
            disabled={completadas === totalEstaciones}
            className="w-full bg-gradient-to-r from-[#00A0E9] to-[#007FBA] hover:from-[#007FBA] hover:to-[#005A8F] text-white py-8 text-xl font-bold rounded-2xl shadow-2xl border-2 border-white/30 backdrop-blur-sm disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all"
          >
            {completadas === totalEstaciones ? (
              <>🎉 ¡Felicidades! Completaste todas las estaciones</>
            ) : (
              <>🚀 Continuar Experiencia Midea</>
            )}
          </Button>
        </div>

      </div>
    </div>
  )
}