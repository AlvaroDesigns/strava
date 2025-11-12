"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { useState, useEffect } from "react";

// Componente interno para manejar la invalidación del caché cuando cambia la sesión
function SessionCacheInvalidator() {
  const { data: session } = useSession();
  const queryClient = useQueryClient();
  const [previousUserId, setPreviousUserId] = useState<string | null>(null);

  useEffect(() => {
    const currentUserId = session?.user?.id || null;
    
    // Si el userId cambió (y no es la primera vez), invalidar el caché
    if (previousUserId !== null && previousUserId !== currentUserId) {
      console.log(`Usuario cambió de ${previousUserId} a ${currentUserId}, invalidando caché...`);
      // Invalidar todas las queries relacionadas con actividades
      queryClient.invalidateQueries({ queryKey: ["activities-stats"] });
      queryClient.clear(); // Limpiar todo el caché para asegurar que no queden datos del usuario anterior
    }
    
    setPreviousUserId(currentUserId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id]);

  return null;
}

export function Providers({ children }: { children: React.ReactNode }) {
  // Crear QueryClient con configuración de cache
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Cache por 5 minutos
            staleTime: 5 * 60 * 1000,
            // Mantener datos en cache por 10 minutos
            gcTime: 10 * 60 * 1000,
            // Reintentar 2 veces en caso de error
            retry: 2,
            // Refetch cuando la ventana recupera el foco
            refetchOnWindowFocus: false,
            // Refetch al reconectar
            refetchOnReconnect: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <SessionCacheInvalidator />
        {children}
      </SessionProvider>
    </QueryClientProvider>
  );
}

