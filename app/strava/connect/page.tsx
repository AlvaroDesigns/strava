"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function StravaConnectPage() {
  const router = useRouter();
  const [redirecting, setRedirecting] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("Verificando conexión existente...");

  useEffect(() => {
    const connectToStrava = async () => {
      try {
        // Primero, intentar refrescar el token si existe una cuenta
        setMessage("Verificando si ya tienes una cuenta conectada...");
        const refreshResponse = await fetch("/api/strava/refresh", {
          method: "POST",
        });
        const refreshData = await refreshResponse.json();

        // Si el refresh fue exitoso, redirigir al dashboard
        if (refreshResponse.ok && refreshData.success) {
          setMessage("¡Cuenta ya conectada! Redirigiendo...");
          setTimeout(() => {
            router.push("/dashboard?success=strava_connected");
          }, 1000);
          return;
        }

        // Si no hay cuenta o el refresh falló, proceder con la autorización
        setMessage("Redirigiendo a Strava para autorizar...");
        const response = await fetch("/api/strava/get-auth-url");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Error al obtener URL de autorización");
        }

        window.location.href = data.authUrl;
      } catch (error: any) {
        console.error("Error al conectar con Strava:", error);
        setError(error.message || "Error al conectar con Strava");
        setRedirecting(false);
      }
    };

    connectToStrava();
  }, [router]);

  if (!redirecting || error) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>Error de Conexión</CardTitle>
              <CardDescription>
                {error ||
                  "No se pudo redirigir a Strava. Por favor, verifica tus credenciales."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Button
                onClick={() => router.push("/strava/setup")}
                className="w-full"
              >
                Volver a Configuración
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="w-full"
              >
                Ir al Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Conectando con Strava</CardTitle>
            <CardDescription>
              {message || "Redirigiendo a Strava para autorizar el acceso..."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center p-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
