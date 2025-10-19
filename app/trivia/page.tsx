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

  useEffect(() => {
    const id = localStorage.getItem('midea_user')
    if (!id) {
      router.push('/auth-qr')
    } else {
      setUserId(id)
    }
  }, [router])

  const handleScanEstacion = async (result: any) => {
    if (!result?.[0]?.rawValue || !userId) return
    
    const estacionId = result[0].rawValue
    setLoading(true)
    setError('')

    try {
      // Verificar si la estación existe
      const { data: estacionData, error: estacionError } = await supabase
        .from('estaciones')
        .select('*')
        .eq('id_estacion', estacionId)
        .single()

      if (estacionError || !estacionData) {
        setError('Código de estación no válido')
        setLoading(false)
        return
      }

      // Verificar si ya completó esta estación
      const { data: yaHecho } = await supabase
        .from('resultados_estacion')
        .select('*')
        .eq('id_invitado', userId)
        .eq('id_estacion', estacionId)
        .single()

      if (yaHecho) {
        setYaCompleto(true)
        setEstacion(estacionData)
        setLoading(false)
        return
      }

      // Cargar preguntas de la estación
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
        setLoading(false)
        return
      }

      // Formatear preguntas
      const preguntasFormateadas = preguntasData.map((p: any) => ({
        id_pregunta: p.id_pregunta,
        enunciado: p.enunciado,
        opcion_correcta: p.opcion_correcta,
        opciones: p.opciones_pregunta
      }))

      setEstacion(estacionData)
      setPreguntas(preguntasFormateadas)
      setStep('quiz')
      
    } catch (err) {
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
  }

  const handleNextQuestion = () => {
    if (currentQuestion < preguntas.length - 1) {
      setCurrentQuestion(currentQuestion + 1)
    } else {
      handleSubmitQuiz()
    }
  }

  const handleSubmitQuiz = async () => {
    if (!userId || !estacion) return
    
    setLoading(true)

    try {
      let correctas = 0
      
      // Guardar cada respuesta
      for (let i = 0; i < preguntas.length; i++) {
        const pregunta = preguntas[i]
        const respuestaUsuario = respuestas[i]
        const esCorrecta = respuestaUsuario === pregunta.opcion_correcta
        
        if (esCorrecta) correctas++

        await supabase.from('respuestas').insert({
          id_invitado: userId,
          id_estacion: estacion.id_estacion,
          id_pregunta: pregunta.id_pregunta,
          opcion_elegida: respuestaUsuario || '',
          es_correcta: esCorrecta
        })
      }

      // Calcular aciertos (1 acierto = 1 punto, sin bonificaciones)
      const aciertos = correctas

      // Guardar resultado de estación
      await supabase.from('resultados_estacion').insert({
        id_invitado: userId,
        id_estacion: estacion.id_estacion,
        correctas: correctas,
        puntos: aciertos
      })

      // Actualizar aciertos totales en invitados
      const { data: invitadoActual } = await supabase
        .from('invitados')
        .select('puntaje')
        .eq('id_invitado', userId)
        .single()

      const nuevosAciertos = (invitadoActual?.puntaje || 0) + aciertos

      await supabase
        .from('invitados')
        .update({ puntaje: nuevosAciertos })
        .eq('id_invitado', userId)

      // Mostrar resultados
      setStep('results')
      
    } catch (err) {
      setError('Error al guardar los resultados')
    } finally {
      setLoading(false)
    }
  }

  const calcularResultados = () => {
    let correctas = 0
    preguntas.forEach((p, i) => {
      if (respuestas[i] === p.opcion_correcta) correctas++
    })
    
    // 1 acierto = 1 punto (sin bonificaciones)
    const aciertos = correctas
    
    return { correctas, aciertos }
  }

  const preguntaActual = preguntas[currentQuestion]
  const respuestaSeleccionada = respuestas[currentQuestion]

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-20">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00A0E9] to-[#007FBA] text-white p-6">
        <div className="max-w-md mx-auto">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex items-center gap-2 mb-4 hover:gap-3 transition-all"
          >
            ← Volver al dashboard
          </button>
          <h1 className="text-2xl font-bold">Trivias Midea</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto px-6 mt-8">
        
        {/* PASO 1: Escanear estación */}
        {step === 'scan' && (
          <div className="bg-white rounded-2xl shadow-lg p-8 space-y-6">
            <h2 className="text-2xl font-bold text-center text-[#0A0A0A]">
              Escanea la estación
            </h2>
            
            <div className="bg-black rounded-lg overflow-hidden">
              <Scanner
                onScan={handleScanEstacion}
                onError={() => setError('Error al acceder a la cámara')}
                styles={{ container: { width: '100%' } }}
              />
            </div>

            {loading && (
              <p className="text-center text-gray-600">Cargando preguntas...</p>
            )}

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {yaCompleto && (
              <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                <p className="font-semibold mb-2">Ya completaste esta estación</p>
                <p className="text-sm">Busca otra estación para seguir sumando puntos</p>
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

            {/* Aciertos destacados */}
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