"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function SyncActivitiesButton() {
  const [message, setMessage] = useState<string | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();

  // Usar useMutation para manejar la sincronización
  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/activities/sync", {
        method: "POST",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al sincronizar actividades");
      }

      return response.json();
    },
    onSuccess: (data) => {
      setMessage(`✓ ${data.totalSynced || 0} actividades sincronizadas`);
      // Invalidar todas las queries de estadísticas para refrescar los datos
      queryClient.invalidateQueries({ queryKey: ["activities-stats"] });
      // Recargar la página después de un breve delay para mostrar el mensaje
      setTimeout(() => {
        router.refresh();
      }, 1500);
    },
    onError: (error: Error) => {
      console.error("Error al sincronizar:", error);
      setMessage(`Error: ${error.message || "Error al sincronizar actividades"}`);
    },
    onSettled: () => {
      // Limpiar el mensaje después de 3 segundos
      setTimeout(() => setMessage(null), 3000);
    },
  });

  const handleSync = () => {
    setMessage(null);
    syncMutation.mutate();
  };

  return (
    <div className="flex flex-col items-end gap-2">
      <Button
        onClick={handleSync}
        disabled={syncMutation.isPending}
        variant="outline"
        size="sm"
      >
        <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? "animate-spin" : ""}`} />
        {syncMutation.isPending ? "Sincronizando..." : "Sincronizar"}
      </Button>
      {message && (
        <p className={`text-xs ${message.startsWith("✓") ? "text-green-600" : "text-red-600"}`}>
          {message}
        </p>
      )}
    </div>
  );
}

