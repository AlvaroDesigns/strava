"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { useEffect, useState } from "react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { ElevationChartGradient } from "./elevation-chart-gradient";
import { KilometersChartInteractive } from "./kilometers-chart-interactive";
import { SpeedChartGradient } from "./speed-chart-gradient";

interface StatsData {
  kilometersByUser: Array<{ name: string; kilometers: number }>;
  kilometersByUserAndDate?: {
    data: Array<{ date: string; [key: string]: string | number }>;
    users: Array<{ id: string; name: string; key: string }>;
  };
  averageSpeedByUser: Array<{
    userId: string;
    name: string;
    averageSpeed: number;
  }>;
  averageSpeedByUserAndDate?: {
    data: Array<{ date: string; [key: string]: string | number }>;
    users: Array<{ id: string; name: string; key: string }>;
  };
  averageElevationByUser: Array<{
    userId: string;
    name: string;
    averageElevation: number;
  }>;
  averageElevationByUserAndDate?: {
    data: Array<{ date: string; [key: string]: string | number }>;
    users: Array<{ id: string; name: string; key: string }>;
  };
  averagePower: number;
  averagePowerByDate?: Array<{ date: string; power: number }>;
  averageDuration: number;
  maxSpeed: number;
  maxElevation: number;
}

interface DashboardChartsProps {
  stats: StatsData;
  filteredByUser: boolean;
}

const chartConfig = {
  kilometers: {
    label: "Kilómetros",
    color: "hsl(var(--chart-1))",
  },
  speed: {
    label: "Velocidad",
    color: "hsl(var(--chart-2))",
  },
  elevation: {
    label: "Desnivel",
    color: "hsl(var(--chart-3))",
  },
  power: {
    label: "Potencia",
    color: "hsl(var(--chart-4))",
  },
  duration: {
    label: "Duración",
    color: "hsl(var(--chart-5))",
  },
} satisfies ChartConfig;

export function DashboardCharts({
  stats,
  filteredByUser,
}: DashboardChartsProps) {
  const [isMounted, setIsMounted] = useState(false);

  // Asegurar que el componente esté montado antes de renderizar gráficos
  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  // Generar una key única basada en los datos para forzar re-render cuando cambien
  const chartKey = stats.kilometersByUserAndDate
    ? `km-${stats.kilometersByUserAndDate.data.length}-${stats.kilometersByUserAndDate.users.length}`
    : `km-fallback-${stats.kilometersByUser.length}`;

  if (!isMounted) {
    return (
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <div className="text-center py-8 text-muted-foreground">
              Cargando gráficos...
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2" key={chartKey}>
      {/* Gráfico de Kilómetros por Usuario - Interactivo */}
      {stats.kilometersByUserAndDate &&
      stats.kilometersByUserAndDate.data &&
      stats.kilometersByUserAndDate.data.length > 0 &&
      stats.kilometersByUserAndDate.users &&
      stats.kilometersByUserAndDate.users.length > 0 ? (
        <div className="md:col-span-2" key={`km-interactive-${chartKey}`}>
          <KilometersChartInteractive
            key={`km-chart-${
              stats.kilometersByUserAndDate.data.length
            }-${stats.kilometersByUserAndDate.users
              .map((u) => u.id)
              .join("-")}`}
            data={stats.kilometersByUserAndDate.data}
            users={stats.kilometersByUserAndDate.users}
          />
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Kilómetros por Usuario</CardTitle>
            <CardDescription>
              Total de kilómetros recorridos por cada usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.kilometersByUser && stats.kilometersByUser.length > 0 ? (
              <ChartContainer
                config={chartConfig}
                key={`km-chart-${stats.kilometersByUser.length}`}
              >
                <AreaChart
                  data={stats.kilometersByUser}
                  margin={{ top: 10, right: 10, left: 10, bottom: 10 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip
                    content={
                      <ChartTooltipContent
                        formatter={(value: any) => {
                          const numValue =
                            typeof value === "number" ? value : Number(value);
                          return `${numValue.toFixed(2)} km`;
                        }}
                      />
                    }
                  />
                  <ChartLegend content={<ChartLegendContent />} />
                  <Area
                    type="monotone"
                    dataKey="kilometers"
                    stroke="hsl(var(--chart-1))"
                    fill="hsl(var(--chart-1))"
                    fillOpacity={0.6}
                  />
                </AreaChart>
              </ChartContainer>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay datos disponibles
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Gráfico de Velocidad Media */}
      {stats.averageSpeedByUserAndDate &&
      stats.averageSpeedByUserAndDate.data &&
      stats.averageSpeedByUserAndDate.data.length > 0 &&
      stats.averageSpeedByUserAndDate.users &&
      stats.averageSpeedByUserAndDate.users.length > 0 ? (
        <SpeedChartGradient
          key={`speed-${stats.averageSpeedByUserAndDate.data.length}-${stats.averageSpeedByUserAndDate.users.length}`}
          data={stats.averageSpeedByUserAndDate.data}
          users={stats.averageSpeedByUserAndDate.users}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Velocidad Media</CardTitle>
            <CardDescription>No hay datos disponibles</CardDescription>
          </CardHeader>
        </Card>
      )}

      {/* Gráfico de Desnivel Medio */}
      {stats.averageElevationByUserAndDate &&
      stats.averageElevationByUserAndDate.data &&
      stats.averageElevationByUserAndDate.data.length > 0 &&
      stats.averageElevationByUserAndDate.users &&
      stats.averageElevationByUserAndDate.users.length > 0 ? (
        <ElevationChartGradient
          key={`elevation-${stats.averageElevationByUserAndDate.data.length}-${stats.averageElevationByUserAndDate.users.length}`}
          data={stats.averageElevationByUserAndDate.data}
          users={stats.averageElevationByUserAndDate.users}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Desnivel Medio</CardTitle>
            <CardDescription>No hay datos disponibles</CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}
