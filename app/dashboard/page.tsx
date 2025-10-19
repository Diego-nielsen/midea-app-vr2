'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [perfil, setPerfil] = useState<any>(null)
  const [estacionesCompletadas, setEstacionesCompletadas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadUserData()
  }, [])

  const loadUserData = async () => {
    try {
      // Verificar sesión
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/')
        return
      }

      // Cargar perfil del usuario
      const { data: perfilData } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id_usuario', session.user.id)
        .single()

      setPerfil(perfilData)

      // Cargar resultados de estaciones completadas
      const { data: resultados } = await supabase
        .from('resultados_estacion')
        .select(`
          *,
          estaciones (
            id_estacion,
            nombre
          )
        `)
        .eq('id_usuario', session.user.id)
        .order('creado_en', { ascending: false })

      setEstacionesCompletadas(resultados || [])
      
    } catch (error) {
      console.error('Error:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
        <div className="text-[#00A0E9] text-xl font-semibold">Cargando...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00A0E9] to-[#007FBA] text-white p-6 rounded-b-3xl shadow-lg">
        <div className="max-w-md mx-auto">
          
          {/* Encabezado con nombre y botón salir */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                ¡Hola, {perfil?.nombre}!
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                {perfil?.apellido}
              </p>
            </div>
            <button
              onClick={handleLogout}
              className="text-sm bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg transition backdrop-blur"
            >
              Salir
            </button>
          </div>

          {/* Tarjeta de puntaje */}
          <div className="bg-white/10 backdrop-blur rounded-xl p-6">
            <div className="text-center">
              <div className="text-6xl font-bold mb-2">
                {perfil?.puntos_totales || 0}
              </div>
              <div className="text-blue-100 text-sm uppercase tracking-wide">
                Puntos acumulados
              </div>
            </div>
          </div>
          
        </div>
      </div>

      {/* Contenido principal */}
      <div className="max-w-md mx-auto px-6 mt-8 space-y-6">
        
        {/* Tarjeta de progreso */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="font-bold text-lg mb-4 text-[#0A0A0A]">
            Tu progreso
          </h3>
          
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Estaciones completadas</span>
              <span className="font-bold text-[#00A0E9] text-xl">
                {estacionesCompletadas.length}
              </span>
            </div>
            
            {estacionesCompletadas.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <div className="space-y-2">
                  {estacionesCompletadas.map((resultado) => (
                    <div 
                      key={resultado.id_resultado}
                      className="flex items-center justify-between bg-green-50 p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-green-600 text-xl">✓</span>
                        <div>
                          <p className="font-semibold text-[#0A0A0A]">
                            {resultado.estaciones?.nombre || resultado.id_estacion}
                          </p>
                          <p className="text-sm text-gray-600">
                            {resultado.correctas}/5 correctas
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#00A0E9]">
                          +{resultado.puntos}
                        </p>
                        <p className="text-xs text-gray-500">puntos</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {estacionesCompletadas.length === 0 && (
              <div className="text-center py-6 text-gray-500">
                <p className="text-4xl mb-2">🎯</p>
                <p>Aún no has completado ninguna estación</p>
              </div>
            )}
          </div>
        </div>

        {/* Botón principal - Ir a trivias */}
        <button
          onClick={() => router.push('/trivia')}
          className="w-full bg-[#00A0E9] hover:bg-[#007FBA] text-white font-bold text-lg py-5 px-6 rounded-xl transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          🎯 Ir a las Trivias
        </button>

        {/* Tarjeta informativa */}
        <div className="bg-blue-50 border-2 border-[#00A0E9] rounded-xl p-5">
          <div className="flex items-start gap-3">
            <div className="text-3xl">💡</div>
            <div>
              <h4 className="font-semibold text-[#007FBA] mb-2">
                ¿Cómo funciona?
              </h4>
              <p className="text-sm text-gray-700 leading-relaxed">
                Dirígete a una estación física, escanea su código QR y responde las 5 preguntas. 
                Ganarás <strong>100 puntos</strong> por cada respuesta correcta, 
                más un <strong>bonus de 200 puntos</strong> si las respondes todas bien.
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}