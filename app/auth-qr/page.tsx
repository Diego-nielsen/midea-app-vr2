'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scanner } from '@yudiel/react-qr-scanner'

export default function AuthQRPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [step, setStep] = useState<'scan' | 'password'>('scan')
  const [invitadoData, setInvitadoData] = useState<any>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isNewUser, setIsNewUser] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleScan = async (result: any) => {
    if (!result?.[0]?.rawValue) return
    
    const qrCode = result[0].rawValue
    setLoading(true)
    setError('')

    try {
      // Buscar invitado en la base de datos
      const { data, error } = await supabase
        .from('invitados')
        .select('*')
        .eq('id_invitado', qrCode)
        .single()

      if (error || !data) {
        setError('Código QR no válido. Por favor intenta de nuevo.')
        setLoading(false)
        return
      }

      setInvitadoData(data)
      
      // Verificar si ya tiene usuario en auth.users vinculado
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id_invitado', qrCode)
        .single()

      setIsNewUser(!perfil)
      setStep('password')
      
    } catch (err) {
      setError('Error al verificar el código')
    } finally {
      setLoading(false)
    }
  }

  const handleAuth = async () => {
    setError('')
    
    if (isNewUser && password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }
    
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      if (isNewUser) {
        // Crear usuario nuevo con email generado
        const email = `${invitadoData.id_invitado}@midea.app`
        
        const { data: authData, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              nombre: invitadoData.nombre,
              apellido: invitadoData.apellido,
              id_invitado: invitadoData.id_invitado
            }
          }
        })

        if (signUpError) throw signUpError

        // Crear perfil vinculado
        const { error: perfilError } = await supabase
          .from('perfiles')
          .insert({
            id_usuario: authData.user?.id,
            id_invitado: invitadoData.id_invitado,
            nombre: invitadoData.nombre,
            apellido: invitadoData.apellido,
            puntos_totales: 0
          })

        if (perfilError) throw perfilError

        // Marcar invitado como reclamado
        await supabase
          .from('invitados')
          .update({ reclamado: true })
          .eq('id_invitado', invitadoData.id_invitado)

      } else {
        // Login con usuario existente
        const email = `${invitadoData.id_invitado}@midea.app`
        
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password
        })

        if (signInError) {
          setError('Contraseña incorrecta')
          setLoading(false)
          return
        }
      }

      // Redirigir al dashboard
      router.push('/dashboard')
      
    } catch (err: any) {
      setError(err.message || 'Error al procesar la autenticación')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] p-6">
      <div className="max-w-md mx-auto pt-8">
        
        {/* Botón volver */}
        <button
          onClick={() => router.push('/')}
          className="text-white mb-6 flex items-center gap-2 hover:gap-3 transition-all"
        >
          ← Volver
        </button>

        <div className="bg-white rounded-2xl shadow-2xl p-8 space-y-6">
          
          {step === 'scan' ? (
            <>
              <h2 className="text-2xl font-bold text-center text-[#0A0A0A]">
                Escanea tu código QR
              </h2>
              
              <div className="bg-black rounded-lg overflow-hidden">
                <Scanner
                  onScan={handleScan}
                  onError={(error) => setError('Error al acceder a la cámara')}
                  styles={{
                    container: { width: '100%' }
                  }}
                />
              </div>

              {loading && (
                <p className="text-center text-gray-600">Verificando código...</p>
              )}

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <p className="text-sm text-gray-600 text-center">
                Busca el código QR en tu tarjeta de invitado
              </p>
            </>
          ) : (
            <>
              {/* Paso de contraseña */}
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2 text-[#0A0A0A]">
                  ¡Hola, {invitadoData?.nombre}!
                </h2>
                <p className="text-gray-600">
                  {isNewUser ? 'Crea tu contraseña de acceso' : 'Ingresa tu contraseña'}
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Contraseña"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none transition-colors"
                />

                {isNewUser && (
                  <input
                    type="password"
                    placeholder="Confirmar contraseña"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none transition-colors"
                  />
                )}

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                    {error}
                  </div>
                )}

                <button
                  onClick={handleAuth}
                  disabled={loading}
                  className="w-full bg-[#00A0E9] hover:bg-[#007FBA] text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Procesando...' : isNewUser ? 'Crear cuenta' : 'Iniciar sesión'}
                </button>

                <button
                  onClick={() => {
                    setStep('scan')
                    setInvitadoData(null)
                    setPassword('')
                    setConfirmPassword('')
                    setError('')
                  }}
                  className="w-full bg-white border-2 border-[#00A0E9] text-[#00A0E9] hover:bg-[#00A0E9] hover:text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200"
                >
                  Escanear otro código
                </button>
              </div>
            </>
          )}
          
        </div>
      </div>
    </div>
  )
}