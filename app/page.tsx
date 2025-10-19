'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LandingPage() {
  const [checking, setChecking] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userId = localStorage.getItem('midea_user_id');
    
    if (userId) {
      router.push('/dashboard');
    } else {
      setChecking(false);
    }
  }, [router]);

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] flex items-center justify-center">
        <div className="text-white text-xl animate-pulse">Verificando sesión...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00A0E9] to-[#007FBA] flex flex-col items-center justify-center p-6">
      <div className="max-w-md w-full space-y-8 text-center">
        
        {/* Logo */}
        <div className="mb-8 animate-fade-in">
          <div className="bg-white rounded-2xl p-8 inline-block shadow-2xl">
            <h1 className="text-5xl font-black text-[#007FBA]">MIDEA</h1>
            <p className="text-[#00A0E9] text-sm font-semibold mt-1">EXPERIENCE</p>
          </div>
        </div>

        {/* Texto de bienvenida */}
        <div className="space-y-4 text-white">
          <h2 className="text-4xl font-bold leading-tight">
            ¡Bienvenido!
          </h2>
          <p className="text-lg opacity-90 leading-relaxed">
            Participa en nuestra trivia interactiva y acumula puntos respondiendo preguntas en cada estación.
          </p>
        </div>

        {/* Botón principal */}
        <div className="pt-6">
          <button
            onClick={() => router.push('/auth-qr')}
            className="w-full bg-white text-[#007FBA] hover:bg-gray-50 font-bold py-8 text-xl rounded-xl shadow-2xl transition-all"
          >
            Comenzar →
          </button>
        </div>

        {/* Instrucciones */}
        <div className="bg-white/10 backdrop-blur-md rounded-xl p-6 text-white text-sm space-y-3 border border-white/20">
          <p className="font-bold text-base">¿Cómo funciona?</p>
          <div className="text-left space-y-2 opacity-90">
            <div className="flex items-start gap-3">
              <span className="text-xl">1️⃣</span>
              <span>Escanea el QR de tu tarjeta</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">2️⃣</span>
              <span>Crea tu contraseña personal</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">3️⃣</span>
              <span>Visita las estaciones y responde trivias</span>
            </div>
            <div className="flex items-start gap-3">
              <span className="text-xl">4️⃣</span>
              <span>Acumula puntos y compite</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}