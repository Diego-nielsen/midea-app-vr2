'use client'

export const dynamic = 'force-dynamic'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Scanner } from '@yudiel/react-qr-scanner'

interface Pregunta {
  id_pregunta: number
  texto_pregunta: string
  respuesta_correcta: string
}

interface ScanResult {
  rawValue: string
}

export default function TriviaPage() {
  const router = useRouter()
  const supabase = createClient()
  const [userId, setUserId] = useState<string | null>(null)
  const [scanning, setScanning] = useState(true)
  const [estacionId, setEstacionId] = useState<string | null>(null)
  const [estacionNombre, setEstacionNombre] = useState('')
  const [preguntas, setPreguntas] = useState<Pregunta[]>([])
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [userAnswer, setUserAnswer] = useState('')
  const [score, setScore] = useState(0)
  const [finished, setFinished] = useState(false)
  const [error, setError] = useState('')

  const checkAuth = useCallback(() => {
    const id = localStorage.getItem('midea_user')
    if (!id) {
      router.push('/auth-qr')
    } else {
      setUserId(id)
    }
  }, [router])

  useEffect(() => {
    checkAuth()
  }, [checkAuth])

  const handleScanEstacion = async (result: string) => {
    if (result && scanning && userId) {
      setScanning(false)
      const estId = result

      try {
        // Verificar que la estación existe
        const { data: estacion, error: estError } = await supabase
          .from('estaciones')
          .select('*')
          .eq('id_estacion', estId)
          .single()

        if (estError || !estacion) {
          setError('Código de estación no válido')
          setTimeout(() => {
            setScanning(true)
            setError('')
          }, 2000)
          return
        }

        // Verificar si ya completó esta estación
        const { data: respuestaPrevia } = await supabase
          .from('respuestas')
          .select('*')
          .eq('id_invitado', userId)
          .eq('id_estacion', estId)
          .single()

        if (respuestaPrevia) {
          setError('Ya completaste esta estación')
          setTimeout(() => {
            router.push('/dashboard')
          }, 2000)
          return
        }

        // Cargar preguntas de la estación
        const { data: preguntasData, error: pregError } = await supabase
          .from('preguntas')
          .select('*')
          .eq('id_estacion', estId)

        if (pregError || !preguntasData || preguntasData.length === 0) {
          setError('No hay preguntas para esta estación')
          setTimeout(() => {
            setScanning(true)
            setError('')
          }, 2000)
          return
        }

        setEstacionId(estId)
        setEstacionNombre(estacion.nombre)
        setPreguntas(preguntasData)
      } catch {
        setError('Error al cargar estación')
        setTimeout(() => {
          setScanning(true)
          setError('')
        }, 2000)
      }
    }
  }

  const handleSubmitAnswer = () => {
    if (!userAnswer.trim()) {
      setError('Por favor ingresa una respuesta')
      return
    }

    const preguntaActual = preguntas[currentQuestion]
    const esCorrecta = userAnswer.trim().toLowerCase() === preguntaActual.respuesta_correcta.toLowerCase()
    
    if (esCorrecta) {
      setScore(score + 10)
    }

    setError('')
    setUserAnswer('')

    // Si es la última pregunta, finalizar
    if (currentQuestion === preguntas.length - 1) {
      finalizarTrivia(score + (esCorrecta ? 10 : 0))
    } else {
      setCurrentQuestion(currentQuestion + 1)
    }
  }

  const finalizarTrivia = async (puntajeFinal: number) => {
    if (!userId || !estacionId) return

    try {
      // Guardar respuesta en la base de datos
      await supabase
        .from('respuestas')
        .insert({
          id_invitado: userId,
          id_estacion: estacionId,
          acierto: puntajeFinal > 0,
          puntaje_obtenido: puntajeFinal
        })

      // Actualizar puntaje del usuario
      const { data: userData } = await supabase
        .from('invitados')
        .select('puntaje')
        .eq('id_invitado', userId)
        .single()

      if (userData) {
        await supabase
          .from('invitados')
          .update({ puntaje: userData.puntaje + puntajeFinal })
          .eq('id_invitado', userId)
      }

      setFinished(true)
    } catch {
      setError('Error al guardar resultados')
    }
  }

  if (!userId) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] flex items-center justify-center">
        <div className="text-white text-xl">Verificando sesión...</div>
      </div>
    )
  }

  if (finished) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] flex items-center justify-center p-4">
        <Card className="p-8 max-w-md w-full text-center">
          <h2 className="text-3xl font-bold text-[#00A0E9] mb-4">
            ¡Felicidades!
          </h2>
          <p className="text-gray-600 mb-4">
            Has completado la estación: <strong>{estacionNombre}</strong>
          </p>
          <p className="text-5xl font-bold text-[#00A0E9] mb-6">
            +{score} puntos
          </p>
          <Button
            onClick={() => router.push('/dashboard')}
            className="w-full bg-[#00A0E9] hover:bg-[#007FBA] py-6 text-lg"
          >
            Volver al Dashboard
          </Button>
        </Card>
      </div>
    )
  }

  if (scanning) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
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

          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-center text-[#0A0A0A]">
              Escanea QR de la estación
            </h2>
            <div className="aspect-square w-full max-w-sm mx-auto rounded-lg overflow-hidden">
              <Scanner
                onScan={(result) => {
                  if (result && result[0]) {
                    handleScanEstacion(result[0].rawValue)
                  }
                }}
                styles={{
                  container: { width: '100%', height: '100%' }
                }}
              />
            </div>
            {error && (
              <p className="text-red-500 text-center mt-4 font-semibold">{error}</p>
            )}
            <Button
              onClick={() => router.push('/dashboard')}
              variant="outline"
              className="w-full mt-6"
            >
              Volver al Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Mostrar pregunta actual
  const preguntaActual = preguntas[currentQuestion]

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

        <Card className="p-6">
          <div className="mb-4">
            <p className="text-sm text-gray-500">
              Estación: {estacionNombre}
            </p>
            <p className="text-sm text-gray-500">
              Pregunta {currentQuestion + 1} de {preguntas.length}
            </p>
            <p className="text-sm font-bold text-[#00A0E9]">
              Puntaje actual: {score} puntos
            </p>
          </div>

          <h3 className="text-xl font-bold mb-6 text-[#0A0A0A]">
            {preguntaActual.texto_pregunta}
          </h3>

          <div className="space-y-4">
            <Input
              type="text"
              placeholder="Tu respuesta..."
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSubmitAnswer()}
              className="w-full text-lg"
            />

            {error && <p className="text-red-500 text-sm">{error}</p>}

            <Button
              onClick={handleSubmitAnswer}
              className="w-full bg-[#00A0E9] hover:bg-[#007FBA] py-6 text-lg"
            >
              {currentQuestion === preguntas.length - 1 ? 'Finalizar' : 'Siguiente'}
            </Button>
          </div>
        </Card>
      </div>
    </div>
  )
}