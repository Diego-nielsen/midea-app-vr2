'use client'

export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function TestLoginPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [idInvitado, setIdInvitado] = useState('TEST001')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Buscar invitado en tabla invitados
      const { data: invitado, error: invitadoError } = await supabase
        .from('invitados')
        .select('*')
        .eq('id_invitado', idInvitado)
        .single()

      if (invitadoError || !invitado) {
        setError('Invitado no encontrado')
        setLoading(false)
        return
      }

      // Verificar contraseña
      if (!invitado.password) {
        setError('Este invitado no tiene contraseña configurada. Usa el flujo QR normal.')
        setLoading(false)
        return
      }

      // Comparar contraseña (en producción deberías usar hash)
      if (invitado.password !== password) {
        setError('Contraseña incorrecta')
        setLoading(false)
        return
      }

      // Guardar sesión en localStorage
      localStorage.setItem('midea_user', invitado.id_invitado)
      
      // Marcar como reclamado
      await supabase
        .from('invitados')
        .update({ reclamado: true })
        .eq('id_invitado', idInvitado)

      router.push('/dashboard')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] p-6 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-8">
        
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-[#0A0A0A]">
            Login de Prueba
          </h1>
          <p className="text-gray-600 text-sm mt-2">
            Solo para desarrollo - sin Supabase Auth
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              ID Invitado
            </label>
            <input
              type="text"
              value={idInvitado}
              onChange={(e) => setIdInvitado(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none"
              placeholder="U001, U002, etc."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none"
              placeholder="••••••"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#00A0E9] hover:bg-[#007FBA] text-white font-semibold py-3 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Verificando...' : 'Ingresar'}
          </button>

          <div className="text-center mt-4">
            <button
              type="button"
              onClick={() => router.push('/')}
              className="text-sm text-gray-600 hover:text-[#00A0E9]"
            >
              ← Volver al inicio
            </button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-xs text-yellow-800">
            <strong>Nota:</strong> Este login es solo para desarrollo. 
            En producción, usa el flujo QR normal desde la pantalla de inicio.
          </p>
        </div>
      </div>
    </div>
  )
}
