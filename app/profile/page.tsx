import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { CheckCircle2, XCircle } from "lucide-react";
import { DeleteAccountButton } from "@/components/delete-account-button";

export default async function ProfilePage(props: {
  searchParams: Promise<{ success?: string; error?: string; skipAutoConnect?: string }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const stravaAccount = await prisma.stravaAccount.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  // Verificar si el usuario tiene credenciales de Strava configuradas
  const stravaConfig = await prisma.stravaConfig.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  // Si no tiene credenciales configuradas, redirigir a la página de configuración
  // Solo permitir ver la página si explícitamente se pasa skipAutoConnect
  if (!stravaConfig) {
    if (!searchParams?.skipAutoConnect) {
      redirect("/strava/setup");
    }
  } else {
    // Si tiene credenciales pero no está conectado, redirigir a conectar
    // Solo permitir ver la página si explícitamente se pasa skipAutoConnect
    if (!stravaAccount && !searchParams?.skipAutoConnect) {
      redirect("/strava/connect");
    }
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mi Perfil</h1>
          <p className="text-muted-foreground">
            Gestiona tu información y conexiones
          </p>
        </div>

        {/* Mensajes de éxito/error */}
        {searchParams?.success === "strava_connected" && (
          <Alert variant="success" className="mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <AlertTitle>¡Conexión exitosa!</AlertTitle>
            <AlertDescription>
              Tu cuenta de Strava se ha vinculado correctamente. Ya puedes ver tus actividades.
            </AlertDescription>
          </Alert>
        )}

        {searchParams?.error && (
          <Alert variant="destructive" className="mb-6">
            <XCircle className="h-4 w-4" />
            <AlertTitle>Error de conexión</AlertTitle>
            <AlertDescription>
              {searchParams.error === "strava_connection_failed" &&
                "No se pudo conectar con Strava. Por favor, intenta de nuevo."}
              {searchParams.error === "no_code" &&
                "No se recibió el código de autorización de Strava."}
            </AlertDescription>
          </Alert>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Conexión con Strava</CardTitle>
              <CardDescription>
                Vincula tu cuenta de Strava para sincronizar tus actividades
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stravaAccount ? (
                <div className="space-y-4">
                  <Alert variant="success">
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertTitle>Conectado a Strava</AlertTitle>
                    <AlertDescription>
                      {stravaAccount.firstName && stravaAccount.lastName
                        ? `Conectado como ${stravaAccount.firstName} ${stravaAccount.lastName}`
                        : "Tu cuenta de Strava está conectada"}
                    </AlertDescription>
                  </Alert>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="font-medium">ID de Strava:</p>
                      <p className="text-muted-foreground">{stravaAccount.stravaId}</p>
                    </div>
                    <div>
                      <p className="font-medium">Conectado el:</p>
                      <p className="text-muted-foreground">
                        {new Date(stravaAccount.createdAt).toLocaleDateString("es-ES", {
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                        })}
                      </p>
                    </div>
                  </div>
                  <Link href="/strava/activities">
                    <Button className="w-full">Ver Actividades</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  <Alert>
                    <AlertTitle>Configuración requerida</AlertTitle>
                    <AlertDescription>
                      {stravaConfig 
                        ? "Tus credenciales están configuradas. Haz clic para conectar con Strava."
                        : "Primero necesitas configurar tus credenciales de Strava."}
                    </AlertDescription>
                  </Alert>
                  {stravaConfig ? (
                    <Link href="/strava/connect">
                      <Button className="w-full">Conectar con Strava</Button>
                    </Link>
                  ) : (
                    <Link href="/strava/setup">
                      <Button className="w-full">Configurar Credenciales</Button>
                    </Link>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Información de la Cuenta</CardTitle>
              <CardDescription>Detalles de tu perfil</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <p className="text-sm text-muted-foreground">{session.user.email}</p>
                </div>
                {session.user.name && (
                  <div>
                    <p className="text-sm font-medium">Nombre</p>
                    <p className="text-sm text-muted-foreground">{session.user.name}</p>
                  </div>
                )}
              </div>
              <div className="pt-4 border-t">
                <CardDescription className="mb-3">
                  Zona de peligro: Elimina permanentemente tu cuenta y todos tus datos
                </CardDescription>
                <DeleteAccountButton />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

