'use client'

export const dynamic = 'force-dynamic'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Scanner } from '@yudiel/react-qr-scanner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Invitado {
  id_invitado: string
  nombre: string
  apellido: string
  password: string | null
  reclamado: boolean
}

export default function AuthQRPage() {
  const router = useRouter()
  const supabase = createClient()
  const [scanning, setScanning] = useState(true)
  const [invitado, setInvitado] = useState<Invitado | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleScan = async (result: string) => {
    if (result && scanning) {
      setScanning(false)
      const qrCode = result

      try {
        const { data, error: fetchError } = await supabase
          .from('invitados')
          .select('*')
          .eq('id_invitado', qrCode)
          .single()

        if (fetchError || !data) {
          setError('Código QR no válido')
          setTimeout(() => {
            setScanning(true)
            setError('')
          }, 2000)
          return
        }

        setInvitado(data)
      } catch {
        setError('Error al verificar código')
        setTimeout(() => {
          setScanning(true)
          setError('')
        }, 2000)
      }
    }
  }

  const handleAuth = async () => {
    if (!invitado) return
    setLoading(true)
    setError('')

    try {
      if (!invitado.password) {
        if (password.length < 4) {
          setError('La contraseña debe tener al menos 4 caracteres')
          setLoading(false)
          return
        }
        
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden')
          setLoading(false)
          return
        }

        const { error: updateError } = await supabase
          .from('invitados')
          .update({ 
            password: password,
            reclamado: true 
          })
          .eq('id_invitado', invitado.id_invitado)

        if (updateError) {
          setError('Error al crear contraseña')
          setLoading(false)
          return
        }

        localStorage.setItem('midea_user', invitado.id_invitado)
        router.push('/dashboard')
      } else {
        if (password !== invitado.password) {
          setError('Contraseña incorrecta')
          setLoading(false)
          return
        }

        localStorage.setItem('midea_user', invitado.id_invitado)
        router.push('/dashboard')
      }
    } catch {
      setError('Error en la autenticación')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md">
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

        {scanning && (
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold mb-6 text-center text-[#0A0A0A]">
              Escanea tu código QR
            </h2>
            <div className="aspect-square w-full max-w-sm mx-auto rounded-lg overflow-hidden">
              <Scanner
                onScan={(result) => {
                  if (result && result[0]) {
                    handleScan(result[0].rawValue)
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
              onClick={() => router.push('/')}
              variant="outline"
              className="w-full mt-6"
            >
              Volver al inicio
            </Button>
          </div>
        )}

        {invitado && !scanning && (
          <div className="bg-white rounded-2xl p-6 shadow-2xl">
            <h2 className="text-2xl font-bold mb-2 text-[#0A0A0A]">
              ¡Hola, {invitado.nombre}!
            </h2>
            <p className="text-gray-600 mb-6">
              {invitado.password ? 'Ingresa tu contraseña' : 'Crea tu contraseña para continuar'}
            </p>

            <div className="space-y-4">
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && !invitado.password ? null : handleAuth()}
                className="w-full"
              />

              {!invitado.password && (
                <Input
                  type="password"
                  placeholder="Confirmar contraseña"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAuth()}
                  className="w-full"
                />
              )}

              {error && <p className="text-red-500 text-sm font-semibold">{error}</p>}

              <Button
                onClick={handleAuth}
                disabled={loading}
                className="w-full bg-[#00A0E9] hover:bg-[#007FBA] py-6 text-lg"
              >
                {loading ? 'Procesando...' : invitado.password ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Button>

              <Button
                onClick={() => {
                  setInvitado(null)
                  setScanning(true)
                  setPassword('')
                  setConfirmPassword('')
                  setError('')
                }}
                variant="outline"
                className="w-full"
              >
                Escanear otro código
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}