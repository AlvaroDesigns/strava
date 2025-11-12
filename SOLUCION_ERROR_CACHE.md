# Solución: Error "cached plan must not change result type"

## Problema

Este error ocurre cuando PostgreSQL tiene planes de consulta preparados en caché que esperan un tipo de dato diferente al que ahora se está usando. En este caso, cambiamos `stravaActivityId` de `Int` a `BigInt`.

## Solución Rápida (Recomendada)

**Reinicia el servidor de Next.js:**

```bash
# Detén el servidor (Ctrl+C o Cmd+C)
# Luego reinícialo:
npm run dev
```

Esto limpia automáticamente los planes en caché porque Prisma recarga el schema.

## Solución Automática

El código ahora detecta automáticamente este error y:
1. Desconecta y reconecta Prisma
2. Ejecuta `DEALLOCATE ALL;` para limpiar los planes preparados
3. Reintenta guardar la actividad

Si ves el error, debería resolverse automáticamente en el siguiente intento.

## Solución Manual (Si persiste)

Si el error persiste después de reiniciar, ejecuta este comando SQL en tu base de datos:

```sql
DEALLOCATE ALL;
```

Puedes hacerlo desde:
- Prisma Studio: `npm run db:studio` → Ejecutar SQL
- Tu cliente de PostgreSQL favorito
- La consola de tu proveedor de base de datos (Neon, Supabase, etc.)

## Verificación

Después de reiniciar, prueba de nuevo:

```bash
curl http://localhost:3000/api/activities/stats?period=month&activityType=Ride
```

Las actividades deberían guardarse correctamente sin errores.

