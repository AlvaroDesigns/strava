import { useQuery } from "@tanstack/react-query";

export interface StatsData {
  totalActivities: number;
  kilometersByUser: Array<{ name: string; kilometers: number }>;
  kilometersByUserAndDate?: {
    data: Array<{ date: string; [key: string]: string | number }>;
    users: Array<{ id: string; name: string; key: string }>;
  };
  averageSpeedByUser: Array<{ userId: string; name: string; averageSpeed: number }>;
  averageSpeedByUserAndDate?: {
    data: Array<{ date: string; [key: string]: string | number }>;
    users: Array<{ id: string; name: string; key: string }>;
  };
  averageElevationByUser: Array<{ userId: string; name: string; averageElevation: number }>;
  averageElevationByUserAndDate?: {
    data: Array<{ date: string; [key: string]: string | number }>;
    users: Array<{ id: string; name: string; key: string }>;
  };
  averagePower: number;
  averagePowerByDate?: Array<{ date: string; power: number }>;
  maxPower: number;
  averageDuration: number;
  maxDuration: number;
  averageSpeed: number;
  maxSpeed: number;
  averageElevation: number;
  maxElevation: number;
}

interface UseActivitiesStatsParams {
  period?: "week" | "month";
  userId?: string | null;
  activityType?: "Ride" | "Run" | "Swim";
  enabled?: boolean;
}

/**
 * Hook personalizado para obtener estadísticas de actividades con cache
 */
export function useActivitiesStats({
  period = "month",
  userId = null,
  activityType = "Ride",
  enabled = true,
}: UseActivitiesStatsParams = {}) {
  return useQuery<StatsData>({
    queryKey: ["activities-stats", period, userId, activityType],
    queryFn: async () => {
      const params = new URLSearchParams({
        period,
        activityType,
        ...(userId && { userId }),
      });

      const response = await fetch(`/api/activities/stats?${params}`);
      
      if (!response.ok) {
        throw new Error("Error al obtener estadísticas");
      }

      return response.json();
    },
    // Cache por 2 minutos para estadísticas
    staleTime: 2 * 60 * 1000,
    // Mantener en cache por 5 minutos
    gcTime: 5 * 60 * 1000,
    // Solo ejecutar si está habilitado
    enabled,
  });
}

