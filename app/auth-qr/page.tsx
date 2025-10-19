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
  const [scannedId, setScannedId] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleScan = async (result: any) => {
    if (!result?.[0]?.rawValue || loading) return
    
    const qrCode = result[0].rawValue
    setLoading(true)
    setError('')

    console.log('🔍 QR escaneado:', qrCode)

    try {
      const { data, error: dbError } = await supabase
        .from('invitados')
        .select('*')
        .eq('id_invitado', qrCode)
        .single()

      console.log('📊 Datos:', data)
      console.log('❌ Error:', dbError)

      if (dbError || !data) {
        setError('Código QR no válido. Por favor intenta de nuevo.')
        setLoading(false)
        return
      }

      setInvitadoData(data)
      setScannedId(qrCode)
      setStep('password')
      setLoading(false)
      
    } catch (err) {
      console.error('💥 Error:', err)
      setError('Error al verificar el código')
      setLoading(false)
    }
  }

  const handleAuth = async () => {
    setError('')
    
    if (password.length < 4) {
      setError('La contraseña debe tener al menos 4 caracteres')
      return
    }

    setLoading(true)

    console.log('🔐 Ya tiene contraseña:', !!invitadoData?.password)

    try {
      // Si ya tiene contraseña = login
      if (invitadoData?.password && invitadoData.password !== '') {
        console.log('✅ Login - verificando contraseña...')
        
        if (invitadoData.password !== password) {
          setError('Contraseña incorrecta')
          setLoading(false)
          return
        }

        // Login exitoso
        console.log('✅ Login exitoso')
        localStorage.setItem('midea_user_id', invitadoData.id_invitado)
        localStorage.setItem('midea_user_data', JSON.stringify(invitadoData))
        router.push('/dashboard')

      } else {
        // Crear contraseña nueva
        console.log('🆕 Registrando usuario...')
        
        const { data: updated, error: updateError } = await supabase
          .from('invitados')
          .update({
            password: password,
            reclamado: true
          })
          .eq('id_invitado', scannedId)
          .select()
          .single()

        console.log('✅ Update result:', updated)
        console.log('❌ Update error:', updateError)

        if (updateError) {
          setError(`Error: ${updateError.message}`)
          setLoading(false)
          return
        }

        // Registro exitoso
        console.log('✅ Registro exitoso')
        localStorage.setItem('midea_user_id', scannedId)
        localStorage.setItem('midea_user_data', JSON.stringify(updated))
        router.push('/dashboard')
      }
      
    } catch (err: any) {
      console.error('💥 Error:', err)
      setError(err.message || 'Error al procesar la autenticación')
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
                <p className="text-center text-gray-600 animate-pulse">Verificando código...</p>
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
                  {invitadoData?.password ? 'Ingresa tu contraseña' : 'Crea tu contraseña de acceso'}
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Contraseña (mínimo 4 caracteres)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none transition-colors"
                  autoFocus
                />

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
                  {loading ? 'Procesando...' : invitadoData?.password ? 'Iniciar sesión' : 'Crear contraseña'}
                </button>

                <button
                  onClick={() => {
                    setStep('scan')
                    setInvitadoData(null)
                    setPassword('')
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