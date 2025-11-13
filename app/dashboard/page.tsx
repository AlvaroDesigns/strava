import { DashboardLayout } from "@/components/dashboard-layout";
import { DashboardStats } from "@/components/dashboard-stats";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  cleanOldActivities,
  getActivitiesFromDB,
  saveActivities,
} from "@/lib/activities";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getTestStravaCredentials } from "@/lib/strava-auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    redirect("/login");
  }

  const stravaAccount = await prisma.stravaAccount.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  const recentActivities = stravaAccount
    ? await getRecentActivities(stravaAccount)
    : null;

  // Obtener todos los usuarios con cuentas de Strava para el filtro
  const stravaAccounts = await prisma.stravaAccount.findMany({
    include: {
      user: true,
    },
  });

  const users = stravaAccounts.map((account) => ({
    id: account.userId,
    name:
      account.firstName || account.user.name || account.user.email || "Usuario",
  }));

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Bienvenido, {session.user.name || session.user.email}
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle>Mis Actividades</CardTitle>
              <CardDescription>
                {stravaAccount
                  ? "Ver tus actividades de Strava"
                  : "Conecta Strava para ver tus actividades"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stravaAccount ? (
                <Link href="/strava/activities">
                  <Button className="w-full">Ver Actividades</Button>
                </Link>
              ) : (
                <Link href="/profile">
                  <Button variant="outline" className="w-full">
                    Conectar Strava
                  </Button>
                </Link>
              )}
            </CardContent>
          </Card>

          {recentActivities && recentActivities.length > 0 && (
            <Card className="md:col-span-2 lg:col-span-3">
              <CardHeader>
                <CardTitle>Actividades Recientes</CardTitle>
                <CardDescription>
                  Tus últimas actividades sincronizadas
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {recentActivities.slice(0, 3).map((activity: any) => (
                    <div
                      key={activity.id}
                      className="flex justify-between items-center p-3 border rounded-md hover:bg-accent transition-colors"
                    >
                      <div>
                        <p className="font-medium">{activity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {activity.type} • {formatDistance(activity.distance)}{" "}
                          • {formatDate(activity.start_date_local)}
                        </p>
                      </div>
                    </div>
                  ))}
                  <Link href="/strava/activities">
                    <Button variant="outline" className="w-full mt-4">
                      Ver Todas las Actividades
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sección de Estadísticas y Gráficos */}
        <div className="mt-8">
          <h2 className="text-2xl font-bold mb-4">Estadísticas y Análisis</h2>
          <DashboardStats 
            users={users} 
            currentUserId={session.user.id}
            hasStravaAccount={!!stravaAccount}
          />
        </div>
      </div>
    </DashboardLayout>
  );
}

async function getRecentActivities(stravaAccount: any) {
  try {
    const stravaConfig = await prisma.stravaConfig.findUnique({
      where: {
        userId: stravaAccount.userId,
      },
    });

    // Usar credenciales de prueba si no hay configuración
    const testCredentials = getTestStravaCredentials();
    const clientId = stravaConfig?.clientId || testCredentials.clientId;
    const clientSecret = stravaConfig?.clientSecret || testCredentials.clientSecret;

    // Verificar si el token ha expirado
    let accessToken = stravaAccount.accessToken;
    if (new Date() >= stravaAccount.expiresAt) {
      // Refrescar token
      try {
        const refreshResponse = await fetch(
          "https://www.strava.com/oauth/token",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              client_id: clientId,
              client_secret: clientSecret,
              refresh_token: stravaAccount.refreshToken,
              grant_type: "refresh_token",
            }),
          }
        );

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          accessToken = refreshData.access_token;

          const expiresAt = new Date();
          expiresAt.setHours(expiresAt.getHours() + 6);

          await prisma.stravaAccount.update({
            where: { id: stravaAccount.id },
            data: {
              accessToken: refreshData.access_token,
              refreshToken: refreshData.refresh_token,
              expiresAt,
            },
          });
        }
      } catch (error) {
        console.error("Error al refrescar token:", error);
        return null;
      }
    }

    // Obtener actividades desde la API de Strava
    const response = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=5",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 60 },
      }
    );

    if (!response.ok) {
      return null;
    }

    const activitiesFromAPI = await response.json();

    // Guardar actividades en la base de datos
    if (activitiesFromAPI.length > 0) {
      await saveActivities(
        activitiesFromAPI,
        stravaAccount.userId,
        stravaAccount.id
      );
      // Limpiar actividades antiguas
      await cleanOldActivities();
    }

    // Obtener actividades desde la base de datos
    const now = new Date();
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(now.getMonth() - 2);

    const activities = await getActivitiesFromDB(
      stravaAccount.userId,
      twoMonthsAgo,
      now
    );

    // Transformar actividades de BD al formato esperado
    return activities.slice(0, 5).map((activity) => ({
      id: Number(activity.stravaActivityId), // Convertir BigInt a Number para el frontend
      name: activity.name,
      type: activity.type || "",
      distance: activity.distance,
      moving_time: activity.movingTime,
      elapsed_time: activity.elapsedTime,
      total_elevation_gain: activity.totalElevationGain || 0,
      start_date: activity.startDate.toISOString(),
      start_date_local: activity.startDateLocal.toISOString(),
    }));
  } catch (error) {
    console.error("Error al obtener actividades:", error);
    return null;
  }
}

function formatDistance(meters: number): string {
  if (meters >= 1000) {
    return `${(meters / 1000).toFixed(2)} km`;
  }
  return `${meters.toFixed(0)} m`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("es-ES", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
