"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function AuthErrorPage() {
  const searchParams = useSearchParams();
  const error = searchParams?.get("error");

  const getErrorMessage = (error: string | null) => {
    switch (error) {
      case "Configuration":
        return {
          title: "Error de Configuración",
          description:
            "Hay un problema con la configuración del servidor. Por favor, verifica que todas las variables de entorno estén configuradas correctamente en Vercel:",
          details: [
            "NEXTAUTH_SECRET debe estar configurada",
            "NEXTAUTH_URL debe coincidir con tu dominio",
            "DATABASE_URL debe estar configurada correctamente",
          ],
        };
      case "AccessDenied":
        return {
          title: "Acceso Denegado",
          description: "No tienes permiso para acceder a esta página.",
        };
      case "Verification":
        return {
          title: "Error de Verificación",
          description: "El token de verificación ha expirado o es inválido.",
        };
      default:
        return {
          title: "Error de Autenticación",
          description:
            "Ha ocurrido un error durante la autenticación. Por favor, intenta de nuevo.",
        };
    }
  };

  const errorInfo = getErrorMessage(error);

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            {errorInfo.title}
          </CardTitle>
          <CardDescription>{errorInfo.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {error === "Configuration" && errorInfo.details && (
            <Alert>
              <AlertTitle>Variables de Entorno Requeridas</AlertTitle>
              <AlertDescription>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  {errorInfo.details.map((detail, index) => (
                    <li key={index} className="text-sm">
                      {detail}
                    </li>
                  ))}
                </ul>
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-semibold mb-1">
                    Para generar NEXTAUTH_SECRET:
                  </p>
                  <code className="text-xs bg-background p-1 rounded">
                    openssl rand -base64 32
                  </code>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-2">
            <Link href="/login">
              <Button className="w-full">Volver al Login</Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Ir al Inicio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
