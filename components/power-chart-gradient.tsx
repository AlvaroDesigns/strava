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

interface PowerChartGradientProps {
  data: Array<{ date: string; power: number }>;
}

const chartConfig = {
  power: {
    label: "Potencia",
    color: "var(--chart-4)",
  },
} satisfies ChartConfig;

export function PowerChartGradient({ data }: PowerChartGradientProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Potencia Media</CardTitle>
          <CardDescription>No hay datos de potencia disponibles</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  // Calcular tendencia
  const lastMonth = data.slice(-30);
  const previousMonth = data.slice(-60, -30);
  const lastMonthAvg = lastMonth.length > 0
    ? lastMonth.reduce((sum, d) => sum + (d.power || 0), 0) / lastMonth.length
    : 0;
  const previousMonthAvg = previousMonth.length > 0
    ? previousMonth.reduce((sum, d) => sum + (d.power || 0), 0) / previousMonth.length
    : 0;
  const trend = previousMonthAvg > 0
    ? ((lastMonthAvg - previousMonthAvg) / previousMonthAvg) * 100
    : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Potencia Media</CardTitle>
        <CardDescription>
          Mostrando potencia media en watios en el tiempo
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
                  formatter={(value) => `${Number(value).toFixed(0)} W`}
                />
              }
            />
            <defs>
              <linearGradient id="fillPower" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-4)"
                  stopOpacity={0.8}
                />
                <stop
                  offset="95%"
                  stopColor="var(--chart-4)"
                  stopOpacity={0.1}
                />
              </linearGradient>
            </defs>
            <Area
              dataKey="power"
              type="natural"
              fill="url(#fillPower)"
              fillOpacity={0.4}
              stroke="var(--chart-4)"
              stackId="a"
            />
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

