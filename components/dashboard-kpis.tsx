"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface DashboardKPIsProps {
  maxSpeed: number;
  maxElevation: number;
  averagePower: number;
  averageDuration: number;
  averageSpeed: number;
  averageElevation: number;
  maxPower: number;
  maxDuration: number;
}

export function DashboardKPIs({
  maxSpeed,
  maxElevation,
  averagePower,
  averageDuration,
  averageSpeed,
  averageElevation,
  maxPower,
  maxDuration,
}: DashboardKPIsProps) {
  // Formatear duración de segundos a horas:minutos:segundos
  const formatDuration = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    }
    return `${secs}s`;
  };

  return (
    <div className="space-y-6 mb-6">
      {/* Sección de Máximas */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Máximas</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Velocidad Máxima</CardTitle>
              <CardDescription>
                La velocidad máxima alcanzada en todas las actividades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {(maxSpeed * 3.6).toFixed(2)}{" "}
                <span className="text-lg font-normal">km/h</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Altura Máxima</CardTitle>
              <CardDescription>
                El desnivel máximo acumulado en todas las actividades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {maxElevation.toFixed(0)}{" "}
                <span className="text-lg font-normal">m</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Potencia Máxima</CardTitle>
              <CardDescription>
                La potencia máxima alcanzada en todas las actividades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {maxPower > 0 ? maxPower.toFixed(0) : "N/A"}{" "}
                {maxPower > 0 && <span className="text-lg font-normal">W</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duración Máxima</CardTitle>
              <CardDescription>
                La duración máxima de todas las actividades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {maxDuration > 0 ? formatDuration(maxDuration) : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Sección de Medias */}
      <div>
        <h3 className="text-lg font-semibold mb-4">Medias</h3>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Velocidad Media</CardTitle>
              <CardDescription>
                La velocidad media en todas las actividades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {averageSpeed > 0 ? averageSpeed.toFixed(2) : "N/A"}{" "}
                {averageSpeed > 0 && <span className="text-lg font-normal">km/h</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Altura Media</CardTitle>
              <CardDescription>
                El desnivel medio en todas las actividades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {averageElevation > 0 ? averageElevation.toFixed(0) : "N/A"}{" "}
                {averageElevation > 0 && <span className="text-lg font-normal">m</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Potencia Media</CardTitle>
              <CardDescription>
                La potencia media en todas las actividades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {averagePower > 0 ? averagePower.toFixed(0) : "N/A"}{" "}
                {averagePower > 0 && <span className="text-lg font-normal">W</span>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Duración Media</CardTitle>
              <CardDescription>
                La duración media de todas las actividades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold">
                {averageDuration > 0 ? formatDuration(averageDuration) : "N/A"}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
