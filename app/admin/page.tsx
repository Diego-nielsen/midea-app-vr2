'use client'

export const dynamic = 'force-dynamic'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type InvitadoStats = {
  id_invitado: string
  nombre: string
  apellido: string
  reclamado: boolean
  puntos_totales: number
  estaciones_completadas: number
}

type EstacionStats = {
  id_estacion: string
  nombre: string
  total_completados: number
  promedio_correctas: number
}

type Pregunta = {
  id_pregunta: number
  id_estacion: string
  enunciado: string
  opcion_correcta: string
  opciones: Array<{
    id_opcion: number
    etiqueta: string
    texto: string
  }>
}

export default function AdminPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [tab, setTab] = useState<'invitados' | 'estaciones' | 'general' | 'preguntas'>('general')
  const [invitados, setInvitados] = useState<InvitadoStats[]>([])
  const [estaciones, setEstaciones] = useState<EstacionStats[]>([])
  const [todasEstaciones, setTodasEstaciones] = useState<any[]>([])
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [estacionSeleccionada, setEstacionSeleccionada] = useState<string>('')
  const [showModal, setShowModal] = useState(false)
  const [editingPregunta, setEditingPregunta] = useState<Pregunta | null>(null)
  const [stats, setStats] = useState({
    totalInvitados: 0,
    totalReclamados: 0,
    totalEstaciones: 0,
    totalTriviasCompletadas: 0,
    puntosPromedioGeneral: 0
  })
  const [loading, setLoading] = useState(true)

  // Estado para nueva pregunta
  const [nuevaPregunta, setNuevaPregunta] = useState({
    enunciado: '',
    opcion_correcta: 'A',
    opcionA: '',
    opcionB: '',
    opcionC: '',
    opcionD: ''
  })

  useEffect(() => {
    loadAdminData()
  }, [])

  useEffect(() => {
    if (estacionSeleccionada) {
      loadPreguntas(estacionSeleccionada)
    }
  }, [estacionSeleccionada])

  const loadAdminData = async () => {
    try {
      // Cargar todas las estaciones
      const { data: estacionesData } = await supabase
        .from('estaciones')
        .select('*')
        .order('nombre')

      setTodasEstaciones(estacionesData || [])

      // Cargar invitados con sus stats
      const { data: invitadosData } = await supabase
        .from('invitados')
        .select(`
          id_invitado,
          nombre,
          apellido,
          reclamado,
          perfiles (
            puntos_totales
          )
        `)
        .order('nombre')

      const invitadosStats: InvitadoStats[] = []
      
      for (const inv of invitadosData || []) {
        const { data: resultados } = await supabase
          .from('resultados_estacion')
          .select('id_estacion')
          .eq('id_invitado', inv.id_invitado)

        invitadosStats.push({
          id_invitado: inv.id_invitado,
          nombre: inv.nombre,
          apellido: inv.apellido,
          reclamado: inv.reclamado,
          puntos_totales: inv.perfiles?.[0]?.puntos_totales || 0,
          estaciones_completadas: resultados?.length || 0
        })
      }

      setInvitados(invitadosStats)

      // Estadísticas de estaciones
      const estacionesStats: EstacionStats[] = []

      for (const est of estacionesData || []) {
        const { data: resultados } = await supabase
          .from('resultados_estacion')
          .select('correctas')
          .eq('id_estacion', est.id_estacion)

        const totalCompletados = resultados?.length || 0
        const promedioCorrectas = totalCompletados > 0
          ? resultados!.reduce((sum, r) => sum + r.correctas, 0) / totalCompletados
          : 0

        estacionesStats.push({
          id_estacion: est.id_estacion,
          nombre: est.nombre,
          total_completados: totalCompletados,
          promedio_correctas: promedioCorrectas
        })
      }

      setEstaciones(estacionesStats)

      // Estadísticas generales
      const { count: totalTriviasCompletadas } = await supabase
        .from('resultados_estacion')
        .select('*', { count: 'exact', head: true })

      const puntosPromedio = invitadosStats.length > 0
        ? invitadosStats.reduce((sum, inv) => sum + inv.puntos_totales, 0) / invitadosStats.length
        : 0

      setStats({
        totalInvitados: invitadosData?.length || 0,
        totalReclamados: invitadosData?.filter(i => i.reclamado).length || 0,
        totalEstaciones: estacionesData?.length || 0,
        totalTriviasCompletadas: totalTriviasCompletadas || 0,
        puntosPromedioGeneral: Math.round(puntosPromedio)
      })

    } catch (error) {
      console.error('Error cargando datos admin:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadPreguntas = async (idEstacion: string) => {
    try {
      const { data, error } = await supabase
        .from('preguntas')
        .select(`
          id_pregunta,
          id_estacion,
          enunciado,
          opcion_correcta,
          opciones_pregunta (
            id_opcion,
            etiqueta,
            texto
          )
        `)
        .eq('id_estacion', idEstacion)
        .order('id_pregunta')

      if (error) throw error

      const preguntasFormateadas = data.map((p: any) => ({
        id_pregunta: p.id_pregunta,
        id_estacion: p.id_estacion,
        enunciado: p.enunciado,
        opcion_correcta: p.opcion_correcta,
        opciones: p.opciones_pregunta
      }))

      setPreguntas(preguntasFormateadas)
    } catch (error) {
      console.error('Error cargando preguntas:', error)
    }
  }

  const handleCrearPregunta = async () => {
    if (!estacionSeleccionada || !nuevaPregunta.enunciado || 
        !nuevaPregunta.opcionA || !nuevaPregunta.opcionB) {
      alert('Por favor completa al menos el enunciado y las opciones A y B')
      return
    }

    try {
      // Insertar pregunta
      const { data: preguntaData, error: preguntaError } = await supabase
        .from('preguntas')
        .insert({
          id_estacion: estacionSeleccionada,
          enunciado: nuevaPregunta.enunciado,
          opcion_correcta: nuevaPregunta.opcion_correcta
        })
        .select()
        .single()

      if (preguntaError) throw preguntaError

      // Insertar opciones
      const opciones = [
        { etiqueta: 'A', texto: nuevaPregunta.opcionA },
        { etiqueta: 'B', texto: nuevaPregunta.opcionB },
        { etiqueta: 'C', texto: nuevaPregunta.opcionC },
        { etiqueta: 'D', texto: nuevaPregunta.opcionD }
      ].filter(op => op.texto.trim() !== '')

      for (const opcion of opciones) {
        await supabase.from('opciones_pregunta').insert({
          id_pregunta: preguntaData.id_pregunta,
          etiqueta: opcion.etiqueta,
          texto: opcion.texto
        })
      }

      // Limpiar formulario
      setNuevaPregunta({
        enunciado: '',
        opcion_correcta: 'A',
        opcionA: '',
        opcionB: '',
        opcionC: '',
        opcionD: ''
      })

      setShowModal(false)
      loadPreguntas(estacionSeleccionada)
      alert('Pregunta creada exitosamente')
    } catch (error: any) {
      alert('Error al crear pregunta: ' + error.message)
    }
  }

  const handleEliminarPregunta = async (idPregunta: number) => {
    if (!confirm('¿Estás seguro de eliminar esta pregunta?')) return

    try {
      const { error } = await supabase
        .from('preguntas')
        .delete()
        .eq('id_pregunta', idPregunta)

      if (error) throw error

      loadPreguntas(estacionSeleccionada)
      alert('Pregunta eliminada')
    } catch (error: any) {
      alert('Error al eliminar: ' + error.message)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
        <div className="text-[#00A0E9] text-xl font-semibold">Cargando panel admin...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00A0E9] to-[#007FBA] text-white p-6">
        <div className="max-w-6xl mx-auto">
          <button
            onClick={() => router.push('/')}
            className="flex items-center gap-2 mb-4 hover:gap-3 transition-all"
          >
            ← Volver al inicio
          </button>
          <h1 className="text-3xl font-bold">Panel Administrativo</h1>
          <p className="text-blue-100 mt-2">Midea Experience - Gestión del evento</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 mt-8">
        
        {/* Tarjetas de estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-[#00A0E9] mb-2">{stats.totalInvitados}</div>
            <div className="text-sm text-gray-600">Total Invitados</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-green-600 mb-2">{stats.totalReclamados}</div>
            <div className="text-sm text-gray-600">Cuentas Activas</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-purple-600 mb-2">{stats.totalEstaciones}</div>
            <div className="text-sm text-gray-600">Estaciones</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-orange-600 mb-2">{stats.totalTriviasCompletadas}</div>
            <div className="text-sm text-gray-600">Trivias Completadas</div>
          </div>
          <div className="bg-white rounded-xl shadow-lg p-6 text-center">
            <div className="text-4xl font-bold text-[#007FBA] mb-2">{stats.puntosPromedioGeneral}</div>
            <div className="text-sm text-gray-600">Puntos Promedio</div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl shadow-lg mb-6">
          <div className="flex border-b border-gray-200 overflow-x-auto">
            <button
              onClick={() => setTab('general')}
              className={`py-4 px-6 font-semibold whitespace-nowrap transition ${
                tab === 'general' ? 'text-[#00A0E9] border-b-2 border-[#00A0E9]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Vista General
            </button>
            <button
              onClick={() => setTab('invitados')}
              className={`py-4 px-6 font-semibold whitespace-nowrap transition ${
                tab === 'invitados' ? 'text-[#00A0E9] border-b-2 border-[#00A0E9]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Invitados ({invitados.length})
            </button>
            <button
              onClick={() => setTab('estaciones')}
              className={`py-4 px-6 font-semibold whitespace-nowrap transition ${
                tab === 'estaciones' ? 'text-[#00A0E9] border-b-2 border-[#00A0E9]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Estaciones ({estaciones.length})
            </button>
            <button
              onClick={() => setTab('preguntas')}
              className={`py-4 px-6 font-semibold whitespace-nowrap transition ${
                tab === 'preguntas' ? 'text-[#00A0E9] border-b-2 border-[#00A0E9]' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📝 Gestión de Preguntas
            </button>
          </div>
        </div>

        {/* Vista General */}
        {tab === 'general' && (
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-xl font-bold text-[#0A0A0A] mb-4">🏆 Top 10 - Mayor Puntaje</h3>
            <div className="space-y-2">
              {invitados.sort((a, b) => b.puntos_totales - a.puntos_totales).slice(0, 10).map((inv, index) => (
                <div key={inv.id_invitado} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className={`text-2xl font-bold ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-orange-600' : 'text-gray-400'}`}>
                      {index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-[#0A0A0A]">{inv.nombre} {inv.apellido}</p>
                      <p className="text-sm text-gray-500">{inv.estaciones_completadas} estaciones completadas</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-[#00A0E9]">{inv.puntos_totales}</p>
                    <p className="text-xs text-gray-500">puntos</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invitados */}
        {tab === 'invitados' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Estado</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Estaciones</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Puntos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {invitados.map((inv) => (
                    <tr key={inv.id_invitado} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">{inv.id_invitado}</td>
                      <td className="px-6 py-4 font-semibold text-[#0A0A0A]">{inv.nombre} {inv.apellido}</td>
                      <td className="px-6 py-4 text-center">
                        {inv.reclamado ? (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">Activo</span>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-600">Pendiente</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center font-semibold text-[#00A0E9]">{inv.estaciones_completadas}</td>
                      <td className="px-6 py-4 text-right font-bold text-[#00A0E9]">{inv.puntos_totales}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Estaciones */}
        {tab === 'estaciones' && (
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Nombre</th>
                    <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Completadas</th>
                    <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Promedio Correctas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {estaciones.map((est) => (
                    <tr key={est.id_estacion} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm font-mono text-gray-600">{est.id_estacion}</td>
                      <td className="px-6 py-4 font-semibold text-[#0A0A0A]">{est.nombre}</td>
                      <td className="px-6 py-4 text-center font-semibold text-[#00A0E9]">{est.total_completados}</td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-bold text-[#00A0E9]">{est.promedio_correctas.toFixed(1)}</span>
                        <span className="text-sm text-gray-500"> / 5</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Gestión de Preguntas */}
        {tab === 'preguntas' && (
          <div className="space-y-6">
            
            {/* Selector de estación */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Selecciona una estación
              </label>
              <select
                value={estacionSeleccionada}
                onChange={(e) => setEstacionSeleccionada(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none"
              >
                <option value="">-- Seleccionar estación --</option>
                {todasEstaciones.map((est) => (
                  <option key={est.id_estacion} value={est.id_estacion}>
                    {est.nombre} ({est.id_estacion})
                  </option>
                ))}
              </select>
            </div>

            {estacionSeleccionada && (
              <>
                {/* Botón crear pregunta */}
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold text-[#0A0A0A]">
                    Preguntas de {todasEstaciones.find(e => e.id_estacion === estacionSeleccionada)?.nombre}
                  </h3>
                  <button
                    onClick={() => setShowModal(true)}
                    className="bg-[#00A0E9] hover:bg-[#007FBA] text-white font-semibold px-6 py-3 rounded-lg transition"
                  >
                    + Nueva Pregunta
                  </button>
                </div>

                {/* Lista de preguntas */}
                <div className="space-y-4">
                  {preguntas.length === 0 ? (
                    <div className="bg-white rounded-xl shadow-lg p-8 text-center text-gray-500">
                      No hay preguntas creadas para esta estación
                    </div>
                  ) : (
                    preguntas.map((pregunta, index) => (
                      <div key={pregunta.id_pregunta} className="bg-white rounded-xl shadow-lg p-6">
                        <div className="flex justify-between items-start mb-4">
                          <h4 className="font-bold text-lg text-[#0A0A0A]">
                            Pregunta {index + 1}
                          </h4>
                          <button
                            onClick={() => handleEliminarPregunta(pregunta.id_pregunta)}
                            className="text-red-600 hover:text-red-800 text-sm font-semibold"
                          >
                            Eliminar
                          </button>
                        </div>
                        <p className="text-gray-700 mb-4">{pregunta.enunciado}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          {pregunta.opciones.map((opcion) => (
                            <div
                              key={opcion.id_opcion}
                              className={`p-3 rounded-lg border-2 ${
                                opcion.etiqueta === pregunta.opcion_correcta
                                  ? 'border-green-500 bg-green-50'
                                  : 'border-gray-200'
                              }`}
                            >
                              <span className="font-semibold text-[#00A0E9] mr-2">{opcion.etiqueta}.</span>
                              <span className="text-gray-700">{opcion.texto}</span>
                              {opcion.etiqueta === pregunta.opcion_correcta && (
                                <span className="ml-2 text-green-600 font-semibold">✓ Correcta</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </>
            )}
          </div>
        )}

      </div>

      {/* Modal Crear Pregunta */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-6 z-50">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-8">
            <h3 className="text-2xl font-bold text-[#0A0A0A] mb-6">Nueva Pregunta</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Enunciado de la pregunta *
                </label>
                <textarea
                  value={nuevaPregunta.enunciado}
                  onChange={(e) => setNuevaPregunta({...nuevaPregunta, enunciado: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none"
                  rows={3}
                  placeholder="¿Cuál es tu pregunta?"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opción A *
                </label>
                <input
                  type="text"
                  value={nuevaPregunta.opcionA}
                  onChange={(e) => setNuevaPregunta({...nuevaPregunta, opcionA: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none"
                  placeholder="Primera opción"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opción B *
                </label>
                <input
                  type="text"
                  value={nuevaPregunta.opcionB}
                  onChange={(e) => setNuevaPregunta({...nuevaPregunta, opcionB: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none"
                  placeholder="Segunda opción"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opción C (opcional)
                </label>
                <input
                  type="text"
                  value={nuevaPregunta.opcionC}
                  onChange={(e) => setNuevaPregunta({...nuevaPregunta, opcionC: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none"
                  placeholder="Tercera opción"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Opción D (opcional)
                </label>
                <input
                  type="text"
                  value={nuevaPregunta.opcionD}
                  onChange={(e) => setNuevaPregunta({...nuevaPregunta, opcionD: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none"
                  placeholder="Cuarta opción"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Respuesta correcta *
                </label>
                <select
                  value={nuevaPregunta.opcion_correcta}
                  onChange={(e) => setNuevaPregunta({...nuevaPregunta, opcion_correcta: e.target.value})}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none"
                >
                  <option value="A">Opción A</option>
                  <option value="B">Opción B</option>
                  {nuevaPregunta.opcionC && <option value="C">Opción C</option>}
                  {nuevaPregunta.opcionD && <option value="D">Opción D</option>}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={handleCrearPregunta}
                className="flex-1 bg-[#00A0E9] hover:bg-[#007FBA] text-white font-semibold py-3 rounded-lg transition"
              >
                Crear Pregunta
              </button>
              <button
                onClick={() => {
                  setShowModal(false)
                  setNuevaPregunta({
                    enunciado: '',
                    opcion_correcta: 'A',
                    opcionA: '',
                    opcionB: '',
                    opcionC: '',
                    opcionD: ''
                  })
                }}
                className="flex-1 border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}