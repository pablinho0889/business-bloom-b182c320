import { useEffect, useState } from 'react';

interface LoadingScreenProps {
  onLoadingComplete: () => void;
  minDisplayTime?: number; // Tiempo mínimo en ms
}

export default function LoadingScreen({ onLoadingComplete, minDisplayTime = 2000 }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Esperar el tiempo mínimo antes de ocultar
    const timer = setTimeout(() => {
      setIsVisible(false);
      // Dar tiempo a la animación de salida
      setTimeout(onLoadingComplete, 500);
    }, minDisplayTime);

    return () => clearTimeout(timer);
  }, [minDisplayTime, onLoadingComplete]);

  if (!isVisible) {
    return (
      <div className="fixed inset-0 bg-gradient-to-b from-primary to-primary/80 z-50 flex items-center justify-center transition-opacity duration-500 opacity-0 pointer-events-none">
        {/* Fade out */}
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-primary to-primary/80 z-50 flex flex-col items-center justify-center transition-opacity duration-500 animate-in fade-in">
      {/* Logo/GIF animado */}
      <div className="mb-6 animate-in zoom-in duration-700">
        <img 
          src="/loading-animation.gif" 
          alt="Cargando Mi Puntico" 
          className="w-32 h-32 md:w-40 md:h-40 object-contain"
        />
      </div>

      {/* Nombre de la app */}
      <h1 className="text-white text-3xl md:text-4xl font-bold mb-4 animate-in slide-in-from-bottom duration-700 delay-200">
        Mi Puntico
      </h1>

      {/* Loading dots animados */}
      <div className="flex gap-2 animate-in slide-in-from-bottom duration-700 delay-300">
        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
        <div className="w-3 h-3 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
      </div>

      {/* Texto opcional */}
      <p className="text-white/80 text-sm mt-6 animate-in fade-in duration-700 delay-500">
        Cargando tu negocio...
      </p>
    </div>
  );
}
