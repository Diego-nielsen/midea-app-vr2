'use client'

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
  const [step, setStep] = useState<'input' | 'create'>('input')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      // Buscar invitado
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

      // Verificar si ya tiene perfil
      const { data: perfil } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id_invitado', idInvitado)
        .single()

      if (!perfil) {
        // Necesita crear cuenta
        setStep('create')
        setLoading(false)
        return
      }

      // Intentar login
      const email = `${idInvitado}@midea.app`
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      })

      if (signInError) {
        setError('Contraseña incorrecta')
        setLoading(false)
        return
      }

      router.push('/dashboard')
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: invitado } = await supabase
        .from('invitados')
        .select('*')
        .eq('id_invitado', idInvitado)
        .single()

      if (!invitado) {
        setError('Invitado no encontrado')
        setLoading(false)
        return
      }

      // Crear usuario
      const email = `${idInvitado}@midea.app`
      const { data: authData, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre: invitado.nombre,
            apellido: invitado.apellido,
            id_invitado: invitado.id_invitado
          }
        }
      })

      if (signUpError) throw signUpError

      // Crear perfil
      await supabase.from('perfiles').insert({
        id_usuario: authData.user?.id,
        id_invitado: invitado.id_invitado,
        nombre: invitado.nombre,
        apellido: invitado.apellido,
        puntos_totales: 0
      })

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
            Solo para desarrollo
          </p>
        </div>

        {step === 'input' ? (
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
                placeholder="TEST001"
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
          </form>
        ) : (
          <form onSubmit={handleCreate} className="space-y-4">
            <p className="text-center text-gray-700 mb-4">
              Usuario nuevo detectado. Crea tu contraseña:
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contraseña (mínimo 6 caracteres)
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-lg focus:border-[#00A0E9] focus:outline-none"
                placeholder="••••••"
                minLength={6}
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
              {loading ? 'Creando cuenta...' : 'Crear cuenta'}
            </button>

            <button
              type="button"
              onClick={() => setStep('input')}
              className="w-full border-2 border-gray-300 text-gray-700 font-semibold py-3 rounded-lg hover:bg-gray-50 transition"
            >
              Volver
            </button>
          </form>
        )}

        <button
          onClick={() => router.push('/')}
          className="w-full mt-4 text-sm text-gray-500 hover:text-gray-700"
        >
          ← Volver al inicio
        </button>
        
      </div>
    </div>
  )
}