import {
  cleanOldActivities,
  getAllActivitiesFromDB,
  saveActivities,
} from "@/lib/activities";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTestStravaCredentials } from "@/lib/strava-auth";
import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface Activity {
  id: number;
  name: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  average_speed: number;
  max_speed: number;
  average_watts?: number;
  max_watts?: number;
  start_date: string;
  start_date_local: string;
  athlete: {
    id: number;
  };
}

async function getActivitiesForUser(
  stravaAccount: any,
  stravaConfig: any,
  startDate?: Date,
  endDate?: Date
) {
  try {
    let accessToken = stravaAccount.accessToken;

    // Verificar si el token ha expirado
    if (new Date() >= stravaAccount.expiresAt) {
      try {
        const testCredentials = getTestStravaCredentials();
        const clientId = stravaConfig?.clientId || testCredentials.clientId;
        const clientSecret =
          stravaConfig?.clientSecret || testCredentials.clientSecret;

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
        return [];
      }
    }

    // Construir URL con parámetros de fecha
    let url = "https://www.strava.com/api/v3/athlete/activities?per_page=200";

    if (startDate) {
      const after = Math.floor(startDate.getTime() / 1000);
      url += `&after=${after}`;
    }

    if (endDate) {
      const before = Math.floor(endDate.getTime() / 1000);
      url += `&before=${before}`;
    }

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      next: { revalidate: 60 },
    });

    if (!response.ok) {
      return [];
    }

    const activities: Activity[] = await response.json();

    // Obtener detalles completos de cada actividad
    const detailedActivities = await Promise.all(
      activities.map(async (activity) => {
        try {
          const detailResponse = await fetch(
            `https://www.strava.com/api/v3/activities/${activity.id}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
              next: { revalidate: 300 },
            }
          );

          if (detailResponse.ok) {
            return await detailResponse.json();
          }
          return activity;
        } catch {
          return activity;
        }
      })
    );

    const mappedActivities = detailedActivities.map((activity: any) => ({
      ...activity,
      userId: stravaAccount.userId,
      userName:
        stravaAccount.firstName ||
        stravaAccount.user?.name ||
        stravaAccount.user?.email ||
        "Usuario",
    }));

    // Guardar actividades en la base de datos
    if (mappedActivities.length > 0) {
      try {
        await saveActivities(
          mappedActivities,
          stravaAccount.userId,
          stravaAccount.id
        );
      } catch (error) {
        console.error("Error al guardar actividades en BD:", error);
      }
    }

    return mappedActivities;
  } catch (error) {
    console.error("Error al obtener actividades:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;

    // Parámetros de rango de tiempo
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    // Parámetros opcionales
    const userId = searchParams.get("userId");
    const activityType = searchParams.get("activityType") || "Ride";

    // Parsear fechas con validación
    let startDate: Date;
    let endDate: Date = new Date();

    if (startDateParam) {
      try {
        const parsed = new Date(startDateParam);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json(
            {
              error:
                "Formato de fecha de inicio inválido. Use ISO 8601 (ej: 2024-01-01T00:00:00Z)",
            },
            { status: 400 }
          );
        }
        startDate = parsed;
      } catch (error) {
        return NextResponse.json(
          { error: "Error al parsear fecha de inicio" },
          { status: 400 }
        );
      }
    } else {
      // Por defecto: último mes
      startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 1);
    }

    if (endDateParam) {
      try {
        const parsed = new Date(endDateParam);
        if (isNaN(parsed.getTime())) {
          return NextResponse.json(
            {
              error:
                "Formato de fecha de fin inválido. Use ISO 8601 (ej: 2024-01-31T23:59:59Z)",
            },
            { status: 400 }
          );
        }
        endDate = parsed;
      } catch (error) {
        return NextResponse.json(
          { error: "Error al parsear fecha de fin" },
          { status: 400 }
        );
      }
    }

    // Validar que startDate sea anterior a endDate
    if (startDate >= endDate) {
      return NextResponse.json(
        { error: "La fecha de inicio debe ser anterior a la fecha de fin" },
        { status: 400 }
      );
    }

    // Obtener todas las cuentas de Strava conectadas
    const stravaAccounts = await prisma.stravaAccount.findMany({
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });

    // Filtrar por usuario si se especifica
    const accountsToProcess = userId
      ? stravaAccounts.filter((account) => account.userId === userId)
      : stravaAccounts;

    // Obtener actividades desde la base de datos
    let dbActivities = await getAllActivitiesFromDB(startDate, endDate);

    // Filtrar por usuario si se especifica
    if (userId) {
      dbActivities = dbActivities.filter(
        (activity) => activity.userId === userId
      );
    }

    // Convertir actividades de BD al formato esperado
    let allActivities: any[] = dbActivities.map((activity) => {
      const userName =
        activity.stravaAccount?.firstName ||
        activity.user?.name ||
        activity.user?.email ||
        "Usuario";

      return {
        id: Number(activity.stravaActivityId),
        name: activity.name,
        type: activity.type || null,
        distance: activity.distance || 0,
        moving_time: activity.movingTime || 0,
        elapsed_time: activity.elapsedTime || 0,
        total_elevation_gain: activity.totalElevationGain || 0,
        average_speed: activity.averageSpeed || 0,
        max_speed: activity.maxSpeed || 0,
        average_watts: activity.averageWatts || null,
        max_watts: activity.maxWatts || null,
        start_date: activity.startDate.toISOString(),
        start_date_local: activity.startDateLocal.toISOString(),
        userId: activity.userId,
        userName,
      };
    });

    // Sincronizar desde la API de Strava si no hay actividades en BD
    if (accountsToProcess.length > 0 && allActivities.length === 0) {
      for (const stravaAccount of accountsToProcess) {
        try {
          const stravaConfig = await prisma.stravaConfig.findUnique({
            where: {
              userId: stravaAccount.userId,
            },
          });

          const testCredentials = getTestStravaCredentials();
          const configToUse = stravaConfig || {
            clientId: testCredentials.clientId,
            clientSecret: testCredentials.clientSecret,
          };

          const syncedActivities = await getActivitiesForUser(
            { ...stravaAccount, user: stravaAccount.user },
            configToUse,
            startDate,
            endDate
          );

          const mappedSynced = syncedActivities.map((activity: any) => ({
            ...activity,
            userId: stravaAccount.userId,
            userName:
              stravaAccount.firstName ||
              stravaAccount.user?.name ||
              stravaAccount.user?.email ||
              "Usuario",
          }));

          allActivities.push(...mappedSynced);
        } catch (error) {
          console.error(
            `Error al sincronizar actividades para usuario ${stravaAccount.userId}:`,
            error
          );
        }
      }
    }

    // Limpiar actividades antiguas (en segundo plano, no bloquear)
    cleanOldActivities().catch((error) => {
      console.error("Error al limpiar actividades antiguas:", error);
    });

    // Obtener tipos de actividades disponibles
    const availableTypes = Array.from(
      new Set(allActivities.map((a) => a.type).filter((t) => t))
    );

    // Filtrar actividades por tipo
    const filteredActivities = allActivities.filter(
      (activity) => activity.type === activityType
    );

    // Calcular todas las estadísticas del dashboard
    const dashboardData = {
      // Metadatos
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      },
      filters: {
        userId: userId || null,
        activityType,
      },
      totalActivities: filteredActivities.length,
      totalActivitiesAllTypes: allActivities.length,
      availableActivityTypes: availableTypes,

      // Actividades
      activities: filteredActivities,

      // KPIs - Máximas
      maxSpeed:
        filteredActivities.length > 0
          ? Math.max(...filteredActivities.map((a) => a.max_speed || 0), 0)
          : 0,
      maxElevation:
        filteredActivities.length > 0
          ? Math.max(
              ...filteredActivities.map((a) => a.total_elevation_gain || 0),
              0
            )
          : 0,
      maxPower: calculateMaxPower(allActivities),
      maxDuration: calculateMaxDuration(allActivities),

      // KPIs - Medias
      averageSpeed: calculateAverageSpeed(allActivities),
      averageElevation: calculateAverageElevation(allActivities),
      averagePower: calculateAveragePower(filteredActivities),
      averageDuration: calculateAverageDuration(filteredActivities),

      // Estadísticas por usuario
      kilometersByUser: calculateKilometersByUser(filteredActivities),
      kilometersByUserAndDate:
        calculateKilometersByUserAndDate(filteredActivities),
      averageSpeedByUser: calculateAverageSpeedByUser(filteredActivities),
      averageSpeedByUserAndDate:
        calculateAverageSpeedByUserAndDate(filteredActivities),
      averageElevationByUser:
        calculateAverageElevationByUser(filteredActivities),
      averageElevationByUserAndDate:
        calculateAverageElevationByUserAndDate(filteredActivities),

      // Estadísticas por fecha
      averagePowerByDate: calculateAveragePowerByDate(filteredActivities),
    };

    return NextResponse.json(dashboardData);
  } catch (error) {
    console.error("Error al obtener datos del dashboard:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Error desconocido";
    return NextResponse.json(
      { error: "Error al obtener datos del dashboard", details: errorMessage },
      { status: 500 }
    );
  }
}

// Funciones de cálculo (reutilizadas del endpoint de stats)
function calculateKilometersByUser(activities: any[]) {
  if (!activities || activities.length === 0) {
    return [];
  }

  const userMap = new Map<string, { name: string; kilometers: number }>();

  activities.forEach((activity) => {
    const userId = activity.userId || "unknown";
    const userName = activity.userName || "Usuario";
    const kilometers = (activity.distance || 0) / 1000;

    if (userMap.has(userId)) {
      const existing = userMap.get(userId)!;
      existing.kilometers += kilometers;
    } else {
      userMap.set(userId, { name: userName, kilometers });
    }
  });

  return Array.from(userMap.values()).sort(
    (a, b) => b.kilometers - a.kilometers
  );
}

function calculateKilometersByUserAndDate(activities: any[]) {
  if (!activities || activities.length === 0) {
    return { data: [], users: [] };
  }

  const usersMap = new Map<string, string>();
  activities.forEach((activity) => {
    const userId = activity.userId || "unknown";
    const userName = activity.userName || "Usuario";
    if (!usersMap.has(userId)) {
      usersMap.set(userId, userName);
    }
  });

  const dateMap = new Map<string, Map<string, number>>();

  activities.forEach((activity) => {
    try {
      const date = new Date(activity.start_date_local || activity.start_date);
      if (isNaN(date.getTime())) return;

      const dateKey = date.toISOString().split("T")[0];
      const userId = activity.userId || "unknown";
      const kilometers = (activity.distance || 0) / 1000;

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, new Map<string, number>());
      }

      const userDateMap = dateMap.get(dateKey)!;
      if (userDateMap.has(userId)) {
        userDateMap.set(userId, userDateMap.get(userId)! + kilometers);
      } else {
        userDateMap.set(userId, kilometers);
      }
    } catch (error) {
      console.error("Error al procesar fecha de actividad:", error);
    }
  });

  const allDates = Array.from(dateMap.keys()).sort();
  const allUserIds = Array.from(usersMap.keys());

  const result = allDates.map((date) => {
    const dateData: any = { date };
    const userDateMap = dateMap.get(date) || new Map();

    allUserIds.forEach((userId) => {
      const userName = usersMap.get(userId) || "Usuario";
      const key = userName.replace(/\s+/g, "_").toLowerCase();
      dateData[key] = userDateMap.get(userId) || 0;
    });

    return dateData;
  });

  return {
    data: result,
    users: Array.from(usersMap.entries()).map(([userId, userName]) => ({
      id: userId,
      name: userName,
      key: userName.replace(/\s+/g, "_").toLowerCase(),
    })),
  };
}

function calculateAverageSpeedByUser(activities: any[]) {
  if (!activities || activities.length === 0) {
    return [];
  }

  const userMap = new Map<
    string,
    { name: string; totalSpeed: number; count: number }
  >();

  activities.forEach((activity) => {
    if (activity.average_speed) {
      const userId = activity.userId || "unknown";
      const userName = activity.userName || "Usuario";
      const speedKmh = (activity.average_speed || 0) * 3.6;

      if (userMap.has(userId)) {
        const existing = userMap.get(userId)!;
        existing.totalSpeed += speedKmh;
        existing.count += 1;
      } else {
        userMap.set(userId, { name: userName, totalSpeed: speedKmh, count: 1 });
      }
    }
  });

  return Array.from(userMap.entries()).map(([userId, data]) => ({
    userId,
    name: data.name,
    averageSpeed: data.count > 0 ? data.totalSpeed / data.count : 0,
  }));
}

function calculateAverageElevationByUser(activities: any[]) {
  if (!activities || activities.length === 0) {
    return [];
  }

  const userMap = new Map<
    string,
    { name: string; totalElevation: number; count: number }
  >();

  activities.forEach((activity) => {
    if (activity.total_elevation_gain) {
      const userId = activity.userId || "unknown";
      const userName = activity.userName || "Usuario";

      if (userMap.has(userId)) {
        const existing = userMap.get(userId)!;
        existing.totalElevation += activity.total_elevation_gain || 0;
        existing.count += 1;
      } else {
        userMap.set(userId, {
          name: userName,
          totalElevation: activity.total_elevation_gain || 0,
          count: 1,
        });
      }
    }
  });

  return Array.from(userMap.entries()).map(([userId, data]) => ({
    userId,
    name: data.name,
    averageElevation: data.count > 0 ? data.totalElevation / data.count : 0,
  }));
}

function calculateAveragePower(activities: any[]) {
  if (!activities || activities.length === 0) {
    return 0;
  }

  const activitiesWithPower = activities.filter((a) => a.average_watts);
  if (activitiesWithPower.length === 0) return 0;

  const totalPower = activitiesWithPower.reduce(
    (sum, a) => sum + (a.average_watts || 0),
    0
  );
  return totalPower / activitiesWithPower.length;
}

function calculateMaxPower(activities: any[]) {
  if (!activities || activities.length === 0) {
    return 0;
  }

  const activitiesWithPower = activities.filter(
    (a) => a.max_watts || a.average_watts
  );
  if (activitiesWithPower.length === 0) return 0;

  return Math.max(
    ...activitiesWithPower.map((a) => a.max_watts || a.average_watts || 0),
    0
  );
}

function calculateAverageDuration(activities: any[]) {
  if (!activities || activities.length === 0) {
    return 0;
  }

  const totalDuration = activities.reduce(
    (sum, a) => sum + (a.moving_time || 0),
    0
  );
  return totalDuration / activities.length;
}

function calculateMaxDuration(activities: any[]) {
  if (!activities || activities.length === 0) {
    return 0;
  }

  return Math.max(
    ...activities.map((a) => a.moving_time || a.elapsed_time || 0),
    0
  );
}

function calculateAverageSpeed(activities: any[]) {
  if (!activities || activities.length === 0) {
    return 0;
  }

  const activitiesWithSpeed = activities.filter((a) => a.average_speed);
  if (activitiesWithSpeed.length === 0) return 0;

  const totalSpeed = activitiesWithSpeed.reduce(
    (sum, a) => sum + (a.average_speed || 0),
    0
  );
  return (totalSpeed / activitiesWithSpeed.length) * 3.6;
}

function calculateAverageElevation(activities: any[]) {
  if (!activities || activities.length === 0) {
    return 0;
  }

  const activitiesWithElevation = activities.filter(
    (a) => a.total_elevation_gain
  );
  if (activitiesWithElevation.length === 0) return 0;

  const totalElevation = activitiesWithElevation.reduce(
    (sum, a) => sum + (a.total_elevation_gain || 0),
    0
  );
  return totalElevation / activitiesWithElevation.length;
}

function calculateAverageSpeedByUserAndDate(activities: any[]) {
  if (!activities || activities.length === 0) {
    return { data: [], users: [] };
  }

  const usersMap = new Map<string, string>();
  activities.forEach((activity) => {
    const userId = activity.userId || "unknown";
    const userName = activity.userName || "Usuario";
    if (!usersMap.has(userId)) {
      usersMap.set(userId, userName);
    }
  });

  const dateMap = new Map<
    string,
    Map<string, { totalSpeed: number; count: number }>
  >();

  activities.forEach((activity) => {
    if (activity.average_speed) {
      try {
        const date = new Date(activity.start_date_local || activity.start_date);
        if (isNaN(date.getTime())) return;

        const dateKey = date.toISOString().split("T")[0];
        const userId = activity.userId || "unknown";
        const speedKmh = (activity.average_speed || 0) * 3.6;

        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, new Map());
        }

        const userDateMap = dateMap.get(dateKey)!;
        if (userDateMap.has(userId)) {
          const existing = userDateMap.get(userId)!;
          existing.totalSpeed += speedKmh;
          existing.count += 1;
        } else {
          userDateMap.set(userId, { totalSpeed: speedKmh, count: 1 });
        }
      } catch (error) {
        console.error("Error al procesar fecha de actividad:", error);
      }
    }
  });

  const allDates = Array.from(dateMap.keys()).sort();
  const allUserIds = Array.from(usersMap.keys());

  const result = allDates.map((date) => {
    const dateData: any = { date };
    const userDateMap = dateMap.get(date) || new Map();

    allUserIds.forEach((userId) => {
      const userName = usersMap.get(userId) || "Usuario";
      const key = userName.replace(/\s+/g, "_").toLowerCase();
      const userData = userDateMap.get(userId);
      dateData[key] =
        userData && userData.count > 0
          ? userData.totalSpeed / userData.count
          : 0;
    });

    return dateData;
  });

  return {
    data: result,
    users: Array.from(usersMap.entries()).map(([userId, userName]) => ({
      id: userId,
      name: userName,
      key: userName.replace(/\s+/g, "_").toLowerCase(),
    })),
  };
}

function calculateAverageElevationByUserAndDate(activities: any[]) {
  if (!activities || activities.length === 0) {
    return { data: [], users: [] };
  }

  const usersMap = new Map<string, string>();
  activities.forEach((activity) => {
    const userId = activity.userId || "unknown";
    const userName = activity.userName || "Usuario";
    if (!usersMap.has(userId)) {
      usersMap.set(userId, userName);
    }
  });

  const dateMap = new Map<
    string,
    Map<string, { totalElevation: number; count: number }>
  >();

  activities.forEach((activity) => {
    if (activity.total_elevation_gain) {
      try {
        const date = new Date(activity.start_date_local || activity.start_date);
        if (isNaN(date.getTime())) return;

        const dateKey = date.toISOString().split("T")[0];
        const userId = activity.userId || "unknown";

        if (!dateMap.has(dateKey)) {
          dateMap.set(dateKey, new Map());
        }

        const userDateMap = dateMap.get(dateKey)!;
        if (userDateMap.has(userId)) {
          const existing = userDateMap.get(userId)!;
          existing.totalElevation += activity.total_elevation_gain || 0;
          existing.count += 1;
        } else {
          userDateMap.set(userId, {
            totalElevation: activity.total_elevation_gain || 0,
            count: 1,
          });
        }
      } catch (error) {
        console.error("Error al procesar fecha de actividad:", error);
      }
    }
  });

  const allDates = Array.from(dateMap.keys()).sort();
  const allUserIds = Array.from(usersMap.keys());

  const result = allDates.map((date) => {
    const dateData: any = { date };
    const userDateMap = dateMap.get(date) || new Map();

    allUserIds.forEach((userId) => {
      const userName = usersMap.get(userId) || "Usuario";
      const key = userName.replace(/\s+/g, "_").toLowerCase();
      const userData = userDateMap.get(userId);
      dateData[key] =
        userData && userData.count > 0
          ? userData.totalElevation / userData.count
          : 0;
    });

    return dateData;
  });

  return {
    data: result,
    users: Array.from(usersMap.entries()).map(([userId, userName]) => ({
      id: userId,
      name: userName,
      key: userName.replace(/\s+/g, "_").toLowerCase(),
    })),
  };
}

function calculateAveragePowerByDate(activities: any[]) {
  if (!activities || activities.length === 0) {
    return [];
  }

  const dateMap = new Map<string, { totalPower: number; count: number }>();

  activities.forEach((activity) => {
    if (activity.average_watts) {
      try {
        const date = new Date(activity.start_date_local || activity.start_date);
        if (isNaN(date.getTime())) return;

        const dateKey = date.toISOString().split("T")[0];

        if (dateMap.has(dateKey)) {
          const existing = dateMap.get(dateKey)!;
          existing.totalPower += activity.average_watts || 0;
          existing.count += 1;
        } else {
          dateMap.set(dateKey, {
            totalPower: activity.average_watts || 0,
            count: 1,
          });
        }
      } catch (error) {
        console.error("Error al procesar fecha de actividad:", error);
      }
    }
  });

  const allDates = Array.from(dateMap.keys()).sort();

  const result = allDates.map((date) => {
    const dateData = dateMap.get(date)!;
    return {
      date,
      power: dateData.count > 0 ? dateData.totalPower / dateData.count : 0,
    };
  });

  return result;
}
