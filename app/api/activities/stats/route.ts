import {
  cleanOldActivities,
  getAllActivitiesFromDB,
  saveActivities,
} from "@/lib/activities";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
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
        // Las credenciales deben estar en la base de datos
        if (
          !stravaConfig ||
          !stravaConfig.clientId ||
          !stravaConfig.clientSecret
        ) {
          console.error(
            `Credenciales de Strava no configuradas para usuario ${stravaAccount.userId}`
          );
          return [];
        }

        const clientId = stravaConfig.clientId;
        const clientSecret = stravaConfig.clientSecret;

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

    // Construir URL con parámetros de fecha si se proporcionan
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

    // Obtener detalles completos de cada actividad (incluyendo potencia si está disponible)
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
      console.log(
        `Guardando ${mappedActivities.length} actividades en BD para usuario ${stravaAccount.userId}`
      );
      try {
        await saveActivities(
          mappedActivities,
          stravaAccount.userId,
          stravaAccount.id
        );
        console.log(`✓ Actividades guardadas correctamente en BD`);
      } catch (error) {
        console.error("Error al guardar actividades en BD:", error);
        // Continuar aunque haya error al guardar, para no romper la respuesta
      }
    } else {
      console.log("No hay actividades para guardar");
    }

    return mappedActivities;
  } catch (error) {
    console.error("Error al obtener actividades:", error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const period = searchParams.get("period") || "month"; // "week" o "month"
    const userId = searchParams.get("userId"); // Opcional: filtrar por usuario específico
    const activityType = searchParams.get("activityType") || "Ride"; // "Ride", "Run" o "Swim"

    // Calcular fechas según el período
    const now = new Date();
    let startDate: Date;

    if (period === "week") {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else {
      startDate = new Date(now);
      startDate.setMonth(now.getMonth() - 1);
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

    // PRIMERO: Obtener actividades desde la base de datos (fuente principal)
    console.log(
      `Obteniendo actividades desde BD para período ${period} (${startDate.toISOString()} - ${now.toISOString()})`
    );

    let dbActivities = await getAllActivitiesFromDB(startDate, now);

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
        distance: activity.distance,
        moving_time: activity.movingTime,
        elapsed_time: activity.elapsedTime,
        total_elevation_gain: activity.totalElevationGain || 0,
        average_speed: activity.averageSpeed ?? 0,
        max_speed: activity.maxSpeed ?? null,
        average_watts: activity.averageWatts || null,
        max_watts: activity.maxWatts || null,
        start_date: activity.startDate.toISOString(),
        start_date_local: activity.startDateLocal.toISOString(),
        userId: activity.userId,
        userName,
      };
    });

    console.log(
      `✓ ${allActivities.length} actividades encontradas en BD para el período seleccionado`
    );

    // SEGUNDO: Sincronizar desde la API de Strava si es necesario
    if (accountsToProcess.length > 0) {
      // Si no hay actividades en BD, sincronizar de forma síncrona
      // Si hay pocas, sincronizar en segundo plano
      if (allActivities.length === 0) {
        console.log(
          `No hay actividades en BD, sincronizando desde Strava (síncrono)...`
        );
        // Sincronización síncrona si no hay datos
        for (const stravaAccount of accountsToProcess) {
          const stravaConfig = await prisma.stravaConfig.findUnique({
            where: {
              userId: stravaAccount.userId,
            },
          });

          // Las credenciales deben estar en la base de datos
          if (
            !stravaConfig ||
            !stravaConfig.clientId ||
            !stravaConfig.clientSecret
          ) {
            console.error(
              `Credenciales de Strava no configuradas para usuario ${stravaAccount.userId}`
            );
            continue;
          }

          try {
            const syncedActivities = await getActivitiesForUser(
              { ...stravaAccount, user: stravaAccount.user },
              stravaConfig,
              startDate,
              now
            );

            // Agregar actividades sincronizadas a la lista
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
            console.log(
              `✓ ${mappedSynced.length} actividades sincronizadas para usuario ${stravaAccount.userId}`
            );
          } catch (error) {
            console.error(
              `Error al sincronizar actividades para usuario ${stravaAccount.userId}:`,
              error
            );
          }
        }
      } else if (allActivities.length < 10) {
        console.log(
          `Pocas actividades en BD (${allActivities.length}), sincronizando desde Strava en segundo plano...`
        );
        // Ejecutar sincronización en segundo plano sin bloquear
        Promise.all(
          accountsToProcess.map(async (stravaAccount) => {
            const stravaConfig = await prisma.stravaConfig.findUnique({
              where: {
                userId: stravaAccount.userId,
              },
            });

            // Las credenciales deben estar en la base de datos
            if (
              !stravaConfig ||
              !stravaConfig.clientId ||
              !stravaConfig.clientSecret
            ) {
              console.error(
                `Credenciales de Strava no configuradas para usuario ${stravaAccount.userId}`
              );
              return;
            }

            try {
              await getActivitiesForUser(
                { ...stravaAccount, user: stravaAccount.user },
                stravaConfig,
                startDate,
                now
              );
            } catch (error) {
              console.error(
                `Error al sincronizar actividades para usuario ${stravaAccount.userId}:`,
                error
              );
            }
          })
        ).catch((error) => {
          console.error("Error en sincronización en segundo plano:", error);
        });
      }
    }

    // Limpiar actividades antiguas (mantener solo últimos 2 meses)
    try {
      const deletedCount = await cleanOldActivities();
      if (deletedCount > 0) {
        console.log(
          `Limpieza completada: ${deletedCount} actividades antiguas eliminadas`
        );
      }
    } catch (error) {
      console.error("Error al limpiar actividades antiguas:", error);
      // Continuar aunque haya error en la limpieza
    }

    // Obtener tipos de actividades disponibles
    const availableTypes = new Set(
      allActivities.map((a) => a.type).filter((t) => t)
    );

    // Filtrar actividades por tipo
    const filteredActivities = allActivities.filter(
      (activity) => activity.type === activityType
    );

    console.log(
      `✓ ${
        filteredActivities.length
      } actividades del tipo "${activityType}" después del filtrado (tipos disponibles: ${Array.from(
        availableTypes
      ).join(", ")})`
    );

    // Calcular estadísticas
    const stats = {
      totalActivities: filteredActivities.length,
      totalActivitiesAllTypes: allActivities.length,
      availableActivityTypes: Array.from(availableTypes),
      activities: filteredActivities,
      // Kilómetros por usuario
      kilometersByUser: calculateKilometersByUser(filteredActivities),
      // Kilómetros por usuario y fecha (para gráfico interactivo)
      kilometersByUserAndDate:
        calculateKilometersByUserAndDate(filteredActivities),
      // Velocidad media por usuario
      averageSpeedByUser: calculateAverageSpeedByUser(filteredActivities),
      // Velocidad media por usuario y fecha
      averageSpeedByUserAndDate:
        calculateAverageSpeedByUserAndDate(filteredActivities),
      // Desnivel medio por usuario
      averageElevationByUser:
        calculateAverageElevationByUser(filteredActivities),
      // Desnivel medio por usuario y fecha
      averageElevationByUserAndDate:
        calculateAverageElevationByUserAndDate(filteredActivities),
      // Potencia media
      averagePower: calculateAveragePower(filteredActivities),
      // Potencia media por fecha
      averagePowerByDate: calculateAveragePowerByDate(filteredActivities),
      // Duración media
      averageDuration: calculateAverageDuration(filteredActivities),
      // Velocidad máxima - solo considerar valores numéricos válidos (no null)
      maxSpeed: (() => {
        const speeds = filteredActivities
          .map((a) => a.max_speed)
          .filter((s): s is number => s !== null && s !== undefined && s > 0);
        return speeds.length > 0 ? Math.max(...speeds) : 0;
      })(),
      // Velocidad media - usar TODAS las actividades
      averageSpeed: calculateAverageSpeed(allActivities),
      // Altura máxima
      maxElevation: Math.max(
        ...filteredActivities.map((a) => a.total_elevation_gain || 0),
        0
      ),
      // Altura media - usar TODAS las actividades
      averageElevation: calculateAverageElevation(allActivities),
      // Potencia máxima - usar TODAS las actividades
      maxPower: calculateMaxPower(allActivities),
      // Duración máxima - usar TODAS las actividades
      maxDuration: calculateMaxDuration(allActivities),
    };

    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error al obtener estadísticas:", error);
    return NextResponse.json(
      { error: "Error al obtener estadísticas" },
      { status: 500 }
    );
  }
}

function calculateKilometersByUser(activities: any[]) {
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
  // Obtener todos los usuarios únicos
  const usersMap = new Map<string, string>();
  activities.forEach((activity) => {
    const userId = activity.userId || "unknown";
    const userName = activity.userName || "Usuario";
    if (!usersMap.has(userId)) {
      usersMap.set(userId, userName);
    }
  });

  // Agrupar por fecha
  const dateMap = new Map<string, Map<string, number>>();

  activities.forEach((activity) => {
    const date = new Date(activity.start_date_local || activity.start_date);
    const dateKey = date.toISOString().split("T")[0]; // YYYY-MM-DD
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
  });

  // Convertir a array de objetos con todas las fechas y usuarios
  const allDates = Array.from(dateMap.keys()).sort();
  const allUserIds = Array.from(usersMap.keys());

  const result = allDates.map((date) => {
    const dateData: any = { date };
    const userDateMap = dateMap.get(date) || new Map();

    allUserIds.forEach((userId) => {
      const userName = usersMap.get(userId) || "Usuario";
      // Usar el nombre del usuario como clave (sanitizado para evitar problemas)
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
  const userMap = new Map<
    string,
    { name: string; totalSpeed: number; count: number }
  >();

  activities.forEach((activity) => {
    if (activity.average_speed) {
      const userId = activity.userId || "unknown";
      const userName = activity.userName || "Usuario";
      const speedKmh = activity.average_speed * 3.6; // Convertir m/s a km/h

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
        existing.totalElevation += activity.total_elevation_gain;
        existing.count += 1;
      } else {
        userMap.set(userId, {
          name: userName,
          totalElevation: activity.total_elevation_gain,
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
  const activitiesWithPower = activities.filter((a) => a.average_watts);
  if (activitiesWithPower.length === 0) return 0;

  const totalPower = activitiesWithPower.reduce(
    (sum, a) => sum + (a.average_watts || 0),
    0
  );
  return totalPower / activitiesWithPower.length;
}

function calculateMaxPower(activities: any[]) {
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
  if (activities.length === 0) return 0;

  const totalDuration = activities.reduce(
    (sum, a) => sum + (a.moving_time || 0),
    0
  );
  return totalDuration / activities.length;
}

function calculateMaxDuration(activities: any[]) {
  if (activities.length === 0) return 0;

  return Math.max(
    ...activities.map((a) => a.moving_time || a.elapsed_time || 0),
    0
  );
}

function calculateAverageSpeed(activities: any[]) {
  const activitiesWithSpeed = activities.filter((a) => a.average_speed);
  if (activitiesWithSpeed.length === 0) return 0;

  const totalSpeed = activitiesWithSpeed.reduce(
    (sum, a) => sum + (a.average_speed || 0),
    0
  );
  return (totalSpeed / activitiesWithSpeed.length) * 3.6; // Convertir m/s a km/h
}

function calculateAverageElevation(activities: any[]) {
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
  // Obtener todos los usuarios únicos
  const usersMap = new Map<string, string>();
  activities.forEach((activity) => {
    const userId = activity.userId || "unknown";
    const userName = activity.userName || "Usuario";
    if (!usersMap.has(userId)) {
      usersMap.set(userId, userName);
    }
  });

  // Agrupar por fecha
  const dateMap = new Map<
    string,
    Map<string, { totalSpeed: number; count: number }>
  >();

  activities.forEach((activity) => {
    if (activity.average_speed) {
      const date = new Date(activity.start_date_local || activity.start_date);
      const dateKey = date.toISOString().split("T")[0];
      const userId = activity.userId || "unknown";
      const speedKmh = activity.average_speed * 3.6;

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
    }
  });

  // Convertir a array de objetos
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
  // Obtener todos los usuarios únicos
  const usersMap = new Map<string, string>();
  activities.forEach((activity) => {
    const userId = activity.userId || "unknown";
    const userName = activity.userName || "Usuario";
    if (!usersMap.has(userId)) {
      usersMap.set(userId, userName);
    }
  });

  // Agrupar por fecha
  const dateMap = new Map<
    string,
    Map<string, { totalElevation: number; count: number }>
  >();

  activities.forEach((activity) => {
    if (activity.total_elevation_gain) {
      const date = new Date(activity.start_date_local || activity.start_date);
      const dateKey = date.toISOString().split("T")[0];
      const userId = activity.userId || "unknown";

      if (!dateMap.has(dateKey)) {
        dateMap.set(dateKey, new Map());
      }

      const userDateMap = dateMap.get(dateKey)!;
      if (userDateMap.has(userId)) {
        const existing = userDateMap.get(userId)!;
        existing.totalElevation += activity.total_elevation_gain;
        existing.count += 1;
      } else {
        userDateMap.set(userId, {
          totalElevation: activity.total_elevation_gain,
          count: 1,
        });
      }
    }
  });

  // Convertir a array de objetos
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
  // Agrupar por fecha
  const dateMap = new Map<string, { totalPower: number; count: number }>();

  activities.forEach((activity) => {
    if (activity.average_watts) {
      const date = new Date(activity.start_date_local || activity.start_date);
      const dateKey = date.toISOString().split("T")[0];

      if (dateMap.has(dateKey)) {
        const existing = dateMap.get(dateKey)!;
        existing.totalPower += activity.average_watts;
        existing.count += 1;
      } else {
        dateMap.set(dateKey, {
          totalPower: activity.average_watts,
          count: 1,
        });
      }
    }
  });

  // Convertir a array de objetos
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
