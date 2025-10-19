'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export default function DashboardPage() {
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [estaciones, setEstaciones] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const userId = localStorage.getItem('midea_user_id');
    
    if (!userId) {
      router.push('/');
      return;
    }

    try {
      const { data, error } = await supabase
        .from('invitados')
        .select('*')
        .eq('id_invitado', userId)
        .single();

      if (error || !data) {
        localStorage.clear();
        router.push('/');
        return;
      }

      setUserData(data);
      localStorage.setItem('midea_user_data', JSON.stringify(data));

      const { data: resp } = await supabase
        .from('respuestas')
        .select('id_estacion')
        .eq('id_invitado', userId);

      const uniqueEstaciones = [...new Set(resp?.map(r => r.id_estacion) || [])];
      setEstaciones(uniqueEstaciones as string[]);
      
      setLoading(false);
    } catch (err) {
      console.error('Error:', err);
      router.push('/');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F6F8FA] flex items-center justify-center">
        <div className="text-[#007FBA] text-xl animate-pulse">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F6F8FA] pb-8">
      
      {/* Header */}
      <div className="bg-gradient-to-r from-[#00A0E9] to-[#007FBA] text-white p-6 rounded-b-3xl shadow-lg">
        <div className="max-w-md mx-auto">
          
          {/* Encabezado con nombre y botón salir */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                ¡Hola, {userData?.nombre}!
              </h1>
              <p className="text-blue-100 text-sm mt-1">
                {userData?.apellido}
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
                {userData?.puntaje || 0}
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
                {estaciones.length}
              </span>
            </div>
            
            {estaciones.length > 0 && (
              <div className="pt-3 border-t border-gray-100">
                <div className="space-y-2">
                  {estaciones.map((est, idx) => (
                    <div 
                      key={idx}
                      className="flex items-center justify-between bg-green-50 p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-green-600 text-xl">✓</span>
                        <div>
                          <p className="font-semibold text-[#0A0A0A]">
                            Estación {est}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {estaciones.length === 0 && (
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
                Dirígete a una estación física, escanea su código QR y responde las preguntas. 
                ¡Acumula puntos por cada respuesta correcta!
              </p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}