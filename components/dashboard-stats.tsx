"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useActivitiesStats } from "@/lib/hooks/use-activities-stats";
import Link from "next/link";
import { useEffect, useState } from "react";
import { DashboardCharts } from "./dashboard-charts";
import { DashboardFilters } from "./dashboard-filters";
import { DashboardKPIs } from "./dashboard-kpis";

interface User {
  id: string;
  name: string;
}

interface DashboardStatsProps {
  users: User[];
  currentUserId: string;
  hasStravaAccount?: boolean; // Indica si el usuario actual tiene cuenta de Strava
}

export function DashboardStats({
  users,
  currentUserId,
  hasStravaAccount = false,
}: DashboardStatsProps) {
  const [period, setPeriod] = useState<"week" | "month">("month");
  // Inicializar con el usuario actual para mostrar solo sus datos por defecto
  const [selectedUserId, setSelectedUserId] = useState<string | null>(
    currentUserId
  );
  const [activityType, setActivityType] = useState<"Ride" | "Run" | "Swim">(
    "Ride"
  );

  // Actualizar selectedUserId cuando cambie el usuario actual
  useEffect(() => {
    setSelectedUserId(currentUserId);
  }, [currentUserId]);

  // Usar hook personalizado con useQuery para cachear las llamadas
  // Incluir currentUserId para que el caché se diferencie entre usuarios
  const {
    data: stats,
    isLoading: loading,
    error: queryError,
  } = useActivitiesStats({
    period,
    userId: selectedUserId,
    activityType,
    currentUserId, // Pasar el ID del usuario actual para diferenciar el caché
  });

  const error =
    queryError instanceof Error
      ? queryError.message
      : queryError
      ? "Error desconocido"
      : null;

  return (
    <div>
      {/* Mostrar mensaje prominente si el usuario no tiene cuenta de Strava */}
      {!hasStravaAccount && (
        <Card className="mb-6 border-[#009688]/50 bg-[#009688]/10 dark:bg-[#009688]/20">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2">
                  Conecta tu cuenta de Strava
                </h3>
                <p className="text-muted-foreground mb-4">
                  Para ver tus estadísticas y actividades, necesitas conectar tu
                  cuenta de Strava primero.
                </p>
                <Link href="/profile">
                  <Button>Conectar Strava</Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <DashboardFilters
        period={period}
        userId={selectedUserId}
        activityType={activityType}
        users={users}
        onPeriodChange={setPeriod}
        onUserIdChange={setSelectedUserId}
        onActivityTypeChange={setActivityType}
      />

      {loading && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              Cargando estadísticas...
            </div>
          </CardContent>
        </Card>
      )}

      {error && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-red-500">Error: {error}</div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (!stats || stats.totalActivities === 0) && (
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8">
              <p className="text-muted-foreground mb-2">
                No hay actividades disponibles para el período seleccionado
              </p>
              {stats?.totalActivitiesAllTypes !== undefined &&
                stats.totalActivitiesAllTypes > 0 && (
                  <div className="mt-4">
                    <p className="text-sm text-muted-foreground mb-2">
                      Hay {stats.totalActivitiesAllTypes} actividad(es) de otros
                      tipos en este período.
                    </p>
                    {stats.availableActivityTypes &&
                      stats.availableActivityTypes.length > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Tipos disponibles:{" "}
                          {stats.availableActivityTypes
                            .map((type: string) => {
                              const typeMap: Record<string, string> = {
                                Ride: "Bicicleta",
                                Run: "Correr",
                                Swim: "Nadar",
                              };
                              return typeMap[type] || type;
                            })
                            .join(", ")}
                        </p>
                      )}
                    <p className="text-sm text-muted-foreground mt-2">
                      Prueba cambiando el filtro de tipo de actividad arriba.
                    </p>
                  </div>
                )}
              {(!stats?.totalActivitiesAllTypes ||
                stats.totalActivitiesAllTypes === 0) && (
                <p className="text-sm text-muted-foreground mt-2">
                  Asegúrate de haber sincronizado tus actividades de Strava.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && stats && stats.totalActivities > 0 && (
        <>
          <DashboardKPIs
            maxSpeed={stats.maxSpeed}
            maxElevation={stats.maxElevation}
            averagePower={stats.averagePower}
            averageDuration={stats.averageDuration}
            averageSpeed={stats.averageSpeed}
            averageElevation={stats.averageElevation}
            maxPower={stats.maxPower}
            maxDuration={stats.maxDuration}
          />

          <DashboardCharts stats={stats} filteredByUser={!!selectedUserId} />
        </>
      )}
    </div>
  );
}
