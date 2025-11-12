import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardLayout } from "@/components/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ActivitiesList } from "@/components/activities-list";
import { SyncActivitiesButton } from "@/components/sync-activities-button";
import { saveActivities, cleanOldActivities, getActivitiesFromDB } from "@/lib/activities";
import { getTestStravaCredentials } from "@/lib/strava-auth";

async function getStravaActivities(accessToken: string) {
  try {
    // Obtener más actividades para tener un mejor historial
    const response = await fetch(
      "https://www.strava.com/api/v3/athlete/activities?per_page=200",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        next: { revalidate: 60 }, // Cache por 60 segundos
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error al obtener actividades de Strava:", response.status, errorText);
      throw new Error(`Error al obtener actividades: ${response.status}`);
    }

    const activities = await response.json();
    console.log(`Obtenidas ${activities.length} actividades de la API de Strava`);
    return activities;
  } catch (error) {
    console.error("Error al obtener actividades:", error);
    return [];
  }
}

export default async function ActivitiesPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  const stravaAccount = await prisma.stravaAccount.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  if (!stravaAccount) {
    redirect("/dashboard");
  }

  // Obtener las credenciales de Strava del usuario
  const stravaConfig = await prisma.stravaConfig.findUnique({
    where: {
      userId: session.user.id,
    },
  });

  // Usar credenciales de prueba si no hay configuración
  const testCredentials = getTestStravaCredentials();
  const clientId = stravaConfig?.clientId || testCredentials.clientId;
  const clientSecret = stravaConfig?.clientSecret || testCredentials.clientSecret;

  // Verificar si el token ha expirado y refrescarlo si es necesario
  let accessToken = stravaAccount.accessToken;
  if (new Date() >= stravaAccount.expiresAt) {
    // Refrescar token
    try {
      const refreshResponse = await fetch("https://www.strava.com/oauth/token", {
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
      });

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
    }
  }

  // Primero, intentar obtener actividades desde la base de datos
  const now = new Date();
  const twoMonthsAgo = new Date(now);
  twoMonthsAgo.setMonth(now.getMonth() - 2);
  
  let activities = await getActivitiesFromDB(session.user.id, twoMonthsAgo, now);
  console.log(`Se encontraron ${activities.length} actividades en la base de datos`);

  // Si no hay actividades en la BD, intentar obtenerlas de la API
  if (activities.length === 0) {
    console.log("No hay actividades en BD, obteniendo desde la API de Strava...");
    try {
      const activitiesFromAPI = await getStravaActivities(accessToken);
      console.log(`Obtenidas ${activitiesFromAPI.length} actividades de la API`);

      // Guardar actividades en la base de datos
      if (activitiesFromAPI.length > 0) {
        console.log(`Guardando ${activitiesFromAPI.length} actividades en la base de datos...`);
        await saveActivities(activitiesFromAPI, session.user.id, stravaAccount.id);
        console.log("Actividades guardadas correctamente");
        // Limpiar actividades antiguas
        await cleanOldActivities();
        
        // Volver a obtener desde la BD
        activities = await getActivitiesFromDB(session.user.id, twoMonthsAgo, now);
        console.log(`Después de guardar, se encontraron ${activities.length} actividades en la BD`);
      } else {
        console.log("No se obtuvieron actividades de la API de Strava");
      }
    } catch (error) {
      console.error("Error al obtener actividades de la API:", error);
    }
  }

  // Transformar actividades de BD al formato esperado por el componente
  const formattedActivities = activities.map((activity) => ({
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

  return (
    <DashboardLayout>
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Mis Actividades de Strava</h1>
          <p className="text-muted-foreground">
            Actividades sincronizadas desde tu cuenta de Strava
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle>Actividades Recientes</CardTitle>
                <CardDescription>
                  {formattedActivities.length > 0 
                    ? `${formattedActivities.length} actividades sincronizadas`
                    : "Sincroniza tus actividades desde Strava"}
                </CardDescription>
              </div>
              <SyncActivitiesButton />
            </div>
          </CardHeader>
          <CardContent>
            {formattedActivities.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">
                  No hay actividades disponibles en este momento.
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  Haz clic en &quot;Sincronizar Actividades&quot; para obtener tus actividades desde Strava.
                </p>
              </div>
            ) : (
              <ActivitiesList activities={formattedActivities} />
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

