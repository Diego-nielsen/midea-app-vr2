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
  const [error, setError] = useState('')

  const loadUserData = useCallback(async () => {
    const userId = localStorage.getItem('midea_user')
    
    if (!userId) {
      router.push('/auth-qr')
      return
    }

    console.log('🔑 UserID:', userId)

    try {
      // Cargar datos del usuario
      console.log('📤 Cargando datos del invitado...')
      const { data: invitado, error: invitadoError } = await supabase
        .from('invitados')
        .select('nombre, apellido, puntaje')
        .eq('id_invitado', userId)
        .single()

      if (invitadoError) {
        console.error('❌ Error invitado:', invitadoError)
        throw invitadoError
      }

      console.log('✅ Invitado:', invitado)
      if (invitado) setUserData(invitado)

      // Cargar todas las estaciones
      console.log('📤 Cargando estaciones...')
      const { data: todasEstaciones, error: estacionesError } = await supabase
        .from('estaciones')
        .select('*')
        .order('nombre')

      if (estacionesError) {
        console.error('❌ Error estaciones:', estacionesError)
        setError('Error al cargar estaciones: ' + estacionesError.message)
        // Continuar aunque falle, para mostrar al menos el puntaje
        setLoading(false)
        return
      }

      console.log('✅ Estaciones:', todasEstaciones?.length)

      // Cargar resultados del usuario
      console.log('📤 Cargando resultados...')
      const { data: resultados, error: resultadosError } = await supabase
        .from('resultados_estacion')
        .select('id_estacion, correctas')
        .eq('id_invitado', userId)

      if (resultadosError) {
        console.error('❌ Error resultados:', resultadosError)
      }

      console.log('✅ Resultados:', resultados?.length)

      // Mapear estaciones con sus resultados
      const estacionesProcesadas: Estacion[] = (todasEstaciones || []).map(est => {
        const resultado = resultados?.find(r => r.id_estacion === est.id_estacion)
        return {
          id_estacion: est.id_estacion,
          nombre: est.nombre || 'Sin nombre',
          descripcion: est.descripcion || est.description || '',
          completada: !!resultado,
          correctas: resultado?.correctas || 0,
          total_preguntas: 5
        }
      })

      console.log('🔄 Estaciones procesadas:', estacionesProcesadas)
      setEstaciones(estacionesProcesadas)

    } catch (error: any) {
      console.error('❌ Error general:', error)
      setError('Error al cargar datos: ' + error.message)
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
    <div className="min-h-screen bg-gradient-to-br from-[#00A0E9] via-[#007FBA] to-[#005A8F]">
      {/* Header compacto */}
      <div className="backdrop-blur-md bg-white/10 border-b border-white/20">
        <div className="max-w-4xl mx-auto px-4 py-2">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <img 
                src="/midea-logo.png" 
                alt="Midea Logo" 
                className="h-8 w-auto brightness-0 invert"
              />
              <div className="h-6 w-px bg-white/30"></div>
              <img 
                src="/begas-control.png" 
                alt="Begas Control" 
                className="h-6 w-auto brightness-0 invert"
              />
            </div>
            <Button
              onClick={handleLogout}
              variant="ghost"
              size="sm"
              className="text-white hover:bg-white/20 border border-white/30 text-xs px-3 py-1"
            >
              Cerrar Sesión
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        
        {/* Bienvenida compacta */}
        <div className="text-center text-white">
          <p className="text-sm opacity-90">Bienvenido,</p>
          <h1 className="text-2xl font-bold">{userData?.nombre}</h1>
        </div>

        {/* Card de estadísticas - diseño tecnológico */}
        <div className="backdrop-blur-xl bg-white/95 rounded-xl p-4 shadow-xl border border-white/50">
          <div className="grid grid-cols-2 gap-3">
            {/* Total de Aciertos - Principal */}
            <div className="col-span-2 bg-gradient-to-br from-[#00A0E9] to-[#007FBA] rounded-lg p-4 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs opacity-90 mb-1">Total de Aciertos</p>
                  <p className="text-4xl font-black">{userData?.puntaje || 0}</p>
                  <p className="text-xs opacity-75 mt-1">respuestas correctas</p>
                </div>
                <div className="text-5xl opacity-20">🎯</div>
              </div>
            </div>

            {/* Estaciones Completadas */}
            <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-3 text-white">
              <p className="text-xs opacity-90 mb-1">Completadas</p>
              <p className="text-3xl font-bold">
                {estaciones.filter(e => e.completada).length}/{estaciones.length}
              </p>
              <p className="text-xs opacity-75">estaciones</p>
            </div>

            {/* Porcentaje de Éxito */}
            <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-3 text-white">
              <p className="text-xs opacity-90 mb-1">Precisión</p>
              <p className="text-3xl font-bold">
                {estaciones.filter(e => e.completada).length > 0
                  ? Math.round((userData?.puntaje || 0) / (estaciones.filter(e => e.completada).length * 5) * 100)
                  : 0}%
              </p>
              <p className="text-xs opacity-75">de aciertos</p>
            </div>
          </div>
        </div>

        {/* Error message si existe */}
        {error && (
          <div className="backdrop-blur-xl bg-red-100 rounded-xl p-3 shadow-xl border border-red-300">
            <h3 className="font-bold text-red-800 text-sm mb-1">⚠️ Error</h3>
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        {/* Tabla de estaciones compacta */}
        <div className="backdrop-blur-xl bg-white/95 rounded-xl p-4 shadow-xl border border-white/50">
          <h2 className="text-lg font-bold text-[#0A0A0A] mb-3 flex items-center gap-2">
            📍 Progreso por Estación
          </h2>

          {estaciones.length === 0 ? (
            <div className="text-center py-6">
              <p className="text-gray-400 text-sm mb-2">No hay estaciones disponibles</p>
              <p className="text-xs text-gray-500">
                Revisa que RLS esté desactivado o que haya estaciones creadas.
              </p>
            </div>
          ) : (
            <div className="overflow-hidden rounded-lg border border-gray-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gradient-to-r from-[#00A0E9] to-[#007FBA] text-white">
                    <th className="text-left px-3 py-2 font-bold">Estación</th>
                    <th className="text-center px-3 py-2 font-bold">Aciertos</th>
                  </tr>
                </thead>
                <tbody>
                  {estaciones.map((estacion, index) => (
                    <tr 
                      key={estacion.id_estacion}
                      className={`border-b border-gray-200 ${
                        index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                      }`}
                    >
                      <td className="px-3 py-2">
                        <p className="font-semibold text-[#0A0A0A] text-sm">{estacion.nombre}</p>
                        {estacion.descripcion && (
                          <p className="text-xs text-gray-500">{estacion.descripcion}</p>
                        )}
                      </td>
                      <td className="px-3 py-2 text-center">
                        {estacion.completada ? (
                          <span className="inline-flex items-center justify-center px-3 py-1 bg-green-100 text-green-700 rounded-lg font-bold text-sm border-2 border-green-300">
                            {estacion.correctas}/5
                          </span>
                        ) : (
                          <span className="inline-flex items-center justify-center px-3 py-1 bg-gray-100 text-gray-400 rounded-lg font-bold text-sm border-2 border-gray-300">
                            - / -
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Botón para ir a trivias */}
        <div className="pb-4">
          <Button
            onClick={() => router.push('/trivia')}
            className="w-full bg-gradient-to-r from-[#00A0E9] to-[#007FBA] hover:from-[#007FBA] hover:to-[#005A8F] text-white py-4 text-lg font-bold rounded-xl shadow-lg"
          >
            🚀 Ir a Trivias
          </Button>
        </div>

      </div>
    </div>
  )
}
