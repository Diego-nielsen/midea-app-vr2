'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scanner } from '@yudiel/react-qr-scanner'

type Pregunta = {
  id_pregunta: number
  enunciado: string
  opcion_correcta: string
  opciones: Array<{
    id_opcion: number
    etiqueta: string
    texto: string
  }>
}

export default function TriviaPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState<'scan' | 'quiz' | 'results'>('scan')
  const [estacion, setEstacion] = useState<any>(null)
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [respuestas, setRespuestas] = useState<Record<number, string>>({})
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [yaCompleto, setYaCompleto] = useState(false)

  const preguntaActual = preguntas[currentQuestion]
  const respuestaSeleccionada = respuestas[currentQuestion]

  useEffect(() => {
    const id = localStorage.getItem('midea_user')
    if (!id) {
      router.push('/auth-qr')
    } else {
      setUserId(id)
      console.log('🔑 UserID cargado:', id)
    }
  }, [router])

  const handleScanEstacion = async (result: any) => {
    if (!result?.[0]?.rawValue || !userId) return
    
    const estacionId = result[0].rawValue
    console.log('📍 Escaneando estación:', estacionId)
    setLoading(true)
    setError('')

    try {
      const { data: estacionData, error: estacionError } = await supabase
        .from('estaciones')
        .select('*')
        .eq('id_estacion', estacionId)
        .single()

      if (estacionError || !estacionData) {
        setError('Código de estación no válido')
        console.error('❌ Error estación:', estacionError)
        setLoading(false)
        return
      }

      console.log('✅ Estación encontrada:', estacionData)

      const { data: yaHecho } = await supabase
        .from('resultados_estacion')
        .select('*')
        .eq('id_invitado', userId)
        .eq('id_estacion', estacionId)
        .single()

      if (yaHecho) {
        console.log('⚠️ Ya completó esta estación')
        setYaCompleto(true)
        setEstacion(estacionData)
        setLoading(false)
        return
      }

      const { data: preguntasData, error: preguntasError } = await supabase
        .from('preguntas')
        .select(`
          id_pregunta,
          enunciado,
          opcion_correcta,
          opciones_pregunta (
            id_opcion,
            etiqueta,
            texto
          )
        `)
        .eq('id_estacion', estacionId)
        .limit(5)

      if (preguntasError || !preguntasData || preguntasData.length === 0) {
        setError('No hay preguntas disponibles para esta estación')
        console.error('❌ Error preguntas:', preguntasError)
        setLoading(false)
        return
      }

      const preguntasFormateadas = preguntasData.map((p: any) => ({
        id_pregunta: p.id_pregunta,
        enunciado: p.enunciado,
        opcion_correcta: p.opcion_correcta,
        opciones: p.opciones_pregunta
      }))

      console.log('✅ Preguntas cargadas:', preguntasFormateadas.length)
      setEstacion(estacionData)
      setPreguntas(preguntasFormateadas)
      setStep('quiz')
      
    } catch (err) {
      console.error('❌ Error general:', err)
      setError('Error al cargar la estación')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAnswer = (etiqueta: string) => {
    setRespuestas({
      ...respuestas,
      [currentQuestion]: etiqueta
    })
    console.log(`📝 Respuesta ${currentQuestion + 1}:`, etiqueta)
  }

  const handleNextQuestion = () => {
    if (currentQuestion < preguntas.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      handleSubmitQuiz()
    }
  }

  const handleSubmitQuiz = async () => {
    if (!userId || !estacion) {
      console.error('❌ Faltan datos:', { userId, estacion })
      return
    }
    
    console.log('💾 Iniciando guardado de resultados...')
    console.log('UserID:', userId)
    console.log('Estación:', estacion.id_estacion)
    console.log('Respuestas:', respuestas)
    
    setLoading(true)

    try {
      let correctas = 0
      
      // Guardar cada respuesta
      console.log('📤 Guardando respuestas individuales...')
      for (let i = 0; i < preguntas.length; i++) {
        const pregunta = preguntas[i]
        const respuestaUsuario = respuestas[i]
        const esCorrecta = respuestaUsuario === pregunta.opcion_correcta
        
        if (esCorrecta) correctas++

        const dataRespuesta = {
          id_invitado: userId,
          id_estacion: estacion.id_estacion,
          id_pregunta: pregunta.id_pregunta,
          opcion_elegida: respuestaUsuario || '',
          es_correcta: esCorrecta
        }

        console.log(`  Guardando respuesta ${i + 1}:`, dataRespuesta)

        const { data: respuestaGuardada, error: errorRespuesta } = await supabase
          .from('respuestas')
          .insert(dataRespuesta)
          .select()

        if (errorRespuesta) {
          console.error(`❌ Error guardando respuesta ${i + 1}:`, errorRespuesta)
          throw errorRespuesta
        }

        console.log(`✅ Respuesta ${i + 1} guardada:`, respuestaGuardada)
      }

      console.log(`✅ Total correctas: ${correctas}/${preguntas.length}`)

      // Guardar resultado de estación
      const dataResultado = {
        id_invitado: userId,
        id_estacion: estacion.id_estacion,
        correctas: correctas,
        puntos: correctas
      }

      console.log('📤 Guardando resultado de estación:', dataResultado)

      const { data: resultadoGuardado, error: errorResultado } = await supabase
        .from('resultados_estacion')
        .insert(dataResultado)
        .select()

      if (errorResultado) {
        console.error('❌ Error guardando resultado:', errorResultado)
        throw errorResultado
      }

      console.log('✅ Resultado guardado:', resultadoGuardado)

      // Actualizar puntaje total
      console.log('📤 Actualizando puntaje total del invitado...')
      
      const { data: invitadoActual, error: errorInvitado } = await supabase
        .from('invitados')
        .select('puntaje')
        .eq('id_invitado', userId)
        .single()

      if (errorInvitado) {
        console.error('❌ Error leyendo invitado:', errorInvitado)
        throw errorInvitado
      }

      const puntajeActual = invitadoActual?.puntaje || 0
      const nuevosPuntos = puntajeActual + correctas

      console.log(`  Puntaje actual: ${puntajeActual}`)
      console.log(`  Nuevos puntos: +${correctas}`)
      console.log(`  Total: ${nuevosPuntos}`)

      const { error: errorUpdate } = await supabase
        .from('invitados')
        .update({ puntaje: nuevosPuntos })
        .eq('id_invitado', userId)

      if (errorUpdate) {
        console.error('❌ Error actualizando puntaje:', errorUpdate)
        throw errorUpdate
      }

      console.log('✅ Puntaje actualizado correctamente')
      console.log('🎉 TODO GUARDADO EXITOSAMENTE')

      setStep('results')
      
    } catch (err: any) {
      console.error('❌❌❌ ERROR CRÍTICO:', err)
      console.error('Detalles:', err.message, err.details, err.hint)
      setError('Error al guardar los resultados: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const calcularResultados = () => {
    let correctas = 0
    preguntas.forEach((p, i) => {
      if (respuestas[i] === p.opcion_correcta) correctas++
    })
    return { correctas, total: preguntas.length }
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] flex items-center justify-center">
        <p className="text-white text-xl">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] p-4">
      <div className="max-w-2xl mx-auto pt-8">
        
        {/* PASO 1: Escanear QR de estación */}
        {step === 'scan' && (
          <div className="space-y-6">
            <h1 className="text-3xl font-bold text-white text-center mb-8">
              Escanea la estación
            </h1>

            <div className="bg-white rounded-2xl p-6 shadow-2xl">
              <div className="aspect-square w-full max-w-sm mx-auto rounded-lg overflow-hidden mb-4">
                <Scanner
                  onScan={(result) => {
                    if (result && result[0]) {
                      handleScanEstacion(result)
                    }
                  }}
                  styles={{
                    container: { width: '100%', height: '100%' }
                  }}
                />
              </div>

              {error && (
                <p className="text-red-500 text-center font-semibold mb-4">{error}</p>
              )}

              {yaCompleto && (
                <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4 text-center">
                  <p className="text-yellow-800 font-bold mb-2">⚠️ Ya completaste esta estación</p>
                  <p className="text-sm text-yellow-700">Busca otra estación para continuar</p>
                  <button
                    onClick={() => setYaCompleto(false)}
                    className="mt-3 text-sm text-[#00A0E9] font-semibold hover:underline"
                  >
                    Escanear otra estación
                  </button>
                </div>
              )}

              <p className="text-sm text-gray-600 text-center">
                Busca el código QR de la estación física
              </p>
            </div>

            <button
              onClick={() => router.push('/dashboard')}
              className="w-full bg-white text-[#00A0E9] font-bold py-4 rounded-xl"
            >
              ← Volver al dashboard
            </button>
          </div>
        )}

        {/* PASO 2: Responder preguntas */}
        {step === 'quiz' && preguntaActual && (
          <div className="space-y-6">
            
            {/* Progreso */}
            <div className="bg-white rounded-xl shadow-lg p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-semibold text-gray-600">
                  Pregunta {currentQuestion + 1} de {preguntas.length}
                </span>
                <span className="text-sm font-semibold text-[#00A0E9]">
                  {estacion?.nombre}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-[#00A0E9] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentQuestion + 1) / preguntas.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Pregunta */}
            <div className="bg-white rounded-2xl shadow-lg p-8">
              <h3 className="text-xl font-bold text-[#0A0A0A] mb-6">
                {preguntaActual.enunciado}
              </h3>

              <div className="space-y-3">
                {preguntaActual.opciones.map((opcion) => (
                  <button
                    key={opcion.id_opcion}
                    onClick={() => handleSelectAnswer(opcion.etiqueta)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                      respuestaSeleccionada === opcion.etiqueta
                        ? 'border-[#00A0E9] bg-blue-50'
                        : 'border-gray-200 hover:border-[#00A0E9] hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-semibold text-[#00A0E9] mr-3">
                      {opcion.etiqueta}.
                    </span>
                    <span className="text-[#0A0A0A]">{opcion.texto}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Botón siguiente */}
            <button
              onClick={handleNextQuestion}
              disabled={!respuestaSeleccionada}
              className="w-full bg-[#00A0E9] hover:bg-[#007FBA] text-white font-bold py-4 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {currentQuestion < preguntas.length - 1 ? 'Siguiente pregunta' : 'Finalizar trivia'}
            </button>
          </div>
        )}

        {/* PASO 3: Resultados */}
        {step === 'results' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center space-y-6">
            <div className="text-6xl mb-4">
              {calcularResultados().correctas === 5 ? '🎉' : calcularResultados().correctas >= 3 ? '👏' : '💪'}
            </div>
            
            <h2 className="text-2xl font-bold text-[#0A0A0A]">
              ¡Trivia completada!
            </h2>

            <div className="bg-gradient-to-br from-[#00A0E9] to-[#007FBA] text-white rounded-xl p-6">
              <p className="text-sm opacity-90 mb-2">Obtuviste</p>
              <p className="text-5xl font-bold mb-2">
                {calcularResultados().correctas}/{preguntas.length}
              </p>
              <p className="text-sm opacity-90">aciertos</p>
            </div>

            <div className="space-y-3 pt-4">
              <button
                onClick={() => {
                  setStep('scan')
                  setCurrentQuestion(0)
                  setRespuestas({})
                  setPreguntas([])
                  setEstacion(null)
                }}
                className="w-full bg-[#00A0E9] hover:bg-[#007FBA] text-white font-bold py-4 rounded-xl transition-all"
              >
                Hacer otra trivia
              </button>

              <button
                onClick={() => router.push('/dashboard')}
                className="w-full border-2 border-[#00A0E9] text-[#00A0E9] hover:bg-[#00A0E9] hover:text-white font-bold py-4 rounded-xl transition-all"
              >
                Volver al dashboard
              </button>
            </div>
          </div>
        )}
        
      </div>
    </div>
  )
}
