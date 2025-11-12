"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

interface SpeedChartGradientProps {
  data: Array<{ date: string; [key: string]: string | number }>;
  users: Array<{ id: string; name: string; key: string }>;
}

export function SpeedChartGradient({ data, users }: SpeedChartGradientProps) {
  // Generar configuración de colores dinámicamente
  const chartConfig: ChartConfig = {};
  const chartColors = [
    "var(--chart-1)",
    "var(--chart-2)",
    "var(--chart-3)",
    "var(--chart-4)",
    "var(--chart-5)",
  ];

  users.forEach((user, index) => {
    chartConfig[user.key] = {
      label: user.name,
      color: chartColors[index % chartColors.length],
    };
  });

  if (!data || data.length === 0 || users.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Velocidad Media</CardTitle>
          <CardDescription>No hay datos disponibles</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calcular tendencia (comparar último mes con el anterior)
  const lastMonth = data.slice(-30);
  const previousMonth = data.slice(-60, -30);
  const lastMonthAvg = lastMonth.length > 0
    ? lastMonth.reduce((sum, d) => {
        const total = users.reduce((acc, u) => acc + (Number(d[u.key]) || 0), 0);
        return sum + total / users.length;
      }, 0) / lastMonth.length
    : 0;
  const previousMonthAvg = previousMonth.length > 0
    ? previousMonth.reduce((sum, d) => {
        const total = users.reduce((acc, u) => acc + (Number(d[u.key]) || 0), 0);
        return sum + total / users.length;
      }, 0) / previousMonth.length
    : 0;
  const trend = previousMonthAvg > 0
    ? ((lastMonthAvg - previousMonthAvg) / previousMonthAvg) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Velocidad Media</CardTitle>
        <CardDescription>
          Mostrando velocidad media por usuario en el tiempo
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig}>
          <AreaChart
            accessibilityLayer
            data={data}
            margin={{
              left: 12,
              right: 12,
            }}
          >
            <CartesianGrid vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tickMargin={8}
              tickFormatter={(value) => {
                const date = new Date(value);
                return date.toLocaleDateString("es-ES", {
                  month: "short",
                  day: "numeric",
                });
              }}
            />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  labelFormatter={(value) => {
                    return new Date(value).toLocaleDateString("es-ES", {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    });
                  }}
                  formatter={(value) => `${Number(value).toFixed(2)} km/h`}
                />
              }
            />
            <defs>
              {users.map((user, index) => {
                const color = chartColors[index % chartColors.length];
                return (
                  <linearGradient
                    key={user.key}
                    id={`fillSpeed${user.key}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor={color}
                      stopOpacity={0.8}
                    />
                    <stop
                      offset="95%"
                      stopColor={color}
                      stopOpacity={0.1}
                    />
                  </linearGradient>
                );
              })}
            </defs>
            {users.map((user, index) => {
              const color = chartColors[index % chartColors.length];
              return (
                <Area
                  key={user.key}
                  dataKey={user.key}
                  type="natural"
                  fill={`url(#fillSpeed${user.key})`}
                  fillOpacity={0.4}
                  stroke={color}
                  stackId="a"
                />
              );
            })}
          </AreaChart>
        </ChartContainer>
      </CardContent>
      <CardFooter>
        <div className="flex w-full items-start gap-2 text-sm">
          <div className="grid gap-2">
            <div className="flex items-center gap-2 leading-none font-medium">
              {trend > 0 ? "Tendencia al alza" : trend < 0 ? "Tendencia a la baja" : "Sin cambios"}{" "}
              {trend !== 0 && `${Math.abs(trend).toFixed(1)}%`}
              {trend > 0 && <TrendingUp className="h-4 w-4" />}
            </div>
            <div className="text-muted-foreground flex items-center gap-2 leading-none">
              {data.length > 0 && (
                <>
                  {new Date(data[0].date).toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  })}{" "}
                  -{" "}
                  {new Date(data[data.length - 1].date).toLocaleDateString("es-ES", {
                    month: "long",
                    year: "numeric",
                  })}
                </>
              )}
            </div>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

