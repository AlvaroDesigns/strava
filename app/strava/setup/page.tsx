"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, AlertCircle } from "lucide-react";

export default function StravaSetupPage() {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [clientSecret, setClientSecret] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await fetch("/api/strava/setup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          clientId,
          clientSecret,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Error al guardar las credenciales");
        return;
      }

      // Redirigir a conectar con Strava
      router.push("/strava/connect");
    } catch (error) {
      setError("Error al guardar las credenciales");
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Configurar Credenciales de Strava</CardTitle>
          <CardDescription>
            Ingresa las credenciales de tu aplicación de Strava
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>¿Dónde obtener las credenciales?</AlertTitle>
              <AlertDescription className="mt-2">
                Ve a{" "}
                <a
                  href="https://www.strava.com/settings/api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  https://www.strava.com/settings/api
                </a>{" "}
                y crea una nueva aplicación. Copia el Client ID y Client Secret.
              </AlertDescription>
            </Alert>

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-2">
              <Label htmlFor="clientId">Client ID</Label>
              <Input
                id="clientId"
                type="text"
                placeholder="12345"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                El Client ID es un número que identifica tu aplicación
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="clientSecret">Client Secret</Label>
              <Input
                id="clientSecret"
                type="password"
                placeholder="a1b2c3d4e5f6..."
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                required
              />
              <p className="text-xs text-muted-foreground">
                El Client Secret es una cadena secreta (solo se muestra una vez)
              </p>
            </div>

            <Alert>
              <AlertDescription className="text-xs">
                <strong>Importante:</strong> Asegúrate de configurar la URL de redirección en Strava como:{" "}
                <code className="bg-muted px-1 py-0.5 rounded">
                  {typeof window !== "undefined" 
                    ? `${window.location.origin}/api/strava/callback`
                    : "http://localhost:3000/api/strava/callback"}
                </code>
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Guardando..." : "Guardar y Continuar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => router.push("/dashboard")}
            >
              Cancelar
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
    </DashboardLayout>
  );
}

