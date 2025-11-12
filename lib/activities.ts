import { prisma, reconnectPrisma } from "./prisma";

/**
 * Guarda o actualiza una actividad de Strava en la base de datos
 */
export async function saveActivity(activity: any, userId: string, stravaAccountId: string) {
  try {
    // Convertir el ID de Strava a BigInt para manejar números grandes
    const stravaActivityId = BigInt(activity.id);
    
    const activityData = {
      stravaActivityId,
      userId,
      stravaAccountId,
      name: activity.name || "Actividad sin nombre",
      type: activity.type || null,
      distance: activity.distance || 0,
      movingTime: activity.moving_time || 0,
      elapsedTime: activity.elapsed_time || 0,
      totalElevationGain: activity.total_elevation_gain || null,
      averageSpeed: activity.average_speed || null,
      maxSpeed: activity.max_speed || null,
      averageWatts: activity.average_watts || null,
      maxWatts: activity.max_watts || null,
      startDate: new Date(activity.start_date),
      startDateLocal: new Date(activity.start_date_local),
    };

    // Usar upsert para crear o actualizar la actividad
    await prisma.activity.upsert({
      where: {
        stravaActivityId,
      },
      update: activityData,
      create: activityData,
    });
  } catch (error: any) {
    // Detectar error de plan en caché de PostgreSQL
    const errorMessage = error?.message || '';
    const errorString = JSON.stringify(error || {});
    const isCachedPlanError = 
      errorMessage.includes('cached plan must not change result type') ||
      errorString.includes('cached plan must not change result type') ||
      error?.code === '0A000';
    
    if (isCachedPlanError) {
      console.warn(`Error de plan en caché para actividad ${activity.id}, forzando nueva conexión...`);
      try {
        // Desconectar completamente y reconectar
        await prisma.$disconnect();
        await prisma.$connect();
        
        // Ejecutar comando SQL para limpiar planes preparados
        await prisma.$executeRawUnsafe('DEALLOCATE ALL;');
        
        // Reintentar después de limpiar la caché
        await prisma.activity.upsert({
          where: { stravaActivityId },
          update: activityData,
          create: activityData,
        });
        console.log(`✓ Actividad ${activity.id} guardada después de limpiar caché`);
        return;
      } catch (retryError: any) {
        console.error(`Error al guardar actividad ${activity.id} después de limpiar caché:`, retryError);
        // Si aún falla, lanzar el error original
      }
    }
    console.error(`Error al guardar actividad ${activity.id}:`, error);
    throw error; // Re-lanzar el error para que se pueda manejar arriba
  }
}

/**
 * Guarda múltiples actividades en la base de datos
 */
export async function saveActivities(
  activities: any[],
  userId: string,
  stravaAccountId: string
) {
  if (!activities || activities.length === 0) {
    console.log("No hay actividades para guardar");
    return;
  }

  let savedCount = 0;
  let errorCount = 0;
  
  // Guardar actividades una por una para tener mejor control de errores
  for (const activity of activities) {
    try {
      if (!activity || !activity.id) {
        console.warn("Actividad inválida, saltando:", activity);
        continue;
      }
      await saveActivity(activity, userId, stravaAccountId);
      savedCount++;
    } catch (error: any) {
      errorCount++;
      console.error(`Error al guardar actividad ${activity?.id}:`, error?.message || error);
      // Continuar con la siguiente actividad en lugar de fallar completamente
    }
  }
  
  console.log(`Guardadas ${savedCount} actividades, ${errorCount} errores de ${activities.length} totales`);
}

/**
 * Limpia actividades antiguas, manteniendo solo los últimos 2 meses completos
 * Esta función calcula la fecha límite (2 meses atrás desde hoy) y elimina
 * todas las actividades más antiguas.
 */
export async function cleanOldActivities() {
  try {
    const now = new Date();
    // Calcular la fecha límite: 2 meses atrás desde hoy
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(now.getMonth() - 2);
    
    // Establecer la hora a las 00:00:00 para comparar solo fechas
    twoMonthsAgo.setHours(0, 0, 0, 0);

    const result = await prisma.activity.deleteMany({
      where: {
        startDateLocal: {
          lt: twoMonthsAgo,
        },
      },
    });

    console.log(`Limpieza completada: ${result.count} actividades eliminadas (anteriores a ${twoMonthsAgo.toISOString()})`);
    return result.count;
  } catch (error) {
    console.error("Error al limpiar actividades antiguas:", error);
    throw error;
  }
}

/**
 * Obtiene actividades desde la base de datos para un usuario específico
 */
export async function getActivitiesFromDB(
  userId: string,
  startDate?: Date,
  endDate?: Date
) {
  try {
    const where: any = {
      userId,
    };

    if (startDate || endDate) {
      where.startDateLocal = {};
      
      if (startDate) {
        where.startDateLocal.gte = startDate;
      }
      
      if (endDate) {
        where.startDateLocal.lte = endDate;
      }
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: {
        startDateLocal: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        stravaAccount: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    console.log(`Encontradas ${activities.length} actividades para el usuario ${userId}`);
    return activities;
  } catch (error) {
    console.error("Error al obtener actividades desde BD:", error);
    return [];
  }
}

/**
 * Obtiene todas las actividades desde la base de datos (para múltiples usuarios)
 */
export async function getAllActivitiesFromDB(startDate?: Date, endDate?: Date) {
  try {
    const where: any = {};

    if (startDate || endDate) {
      where.startDateLocal = {};
      
      if (startDate) {
        where.startDateLocal.gte = startDate;
      }
      
      if (endDate) {
        where.startDateLocal.lte = endDate;
      }
    }

    const activities = await prisma.activity.findMany({
      where,
      orderBy: {
        startDateLocal: "desc",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        stravaAccount: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    return activities;
  } catch (error) {
    console.error("Error al obtener todas las actividades desde BD:", error);
    return [];
  }
}

