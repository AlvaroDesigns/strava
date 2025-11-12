-- Script para limpiar los planes en caché de PostgreSQL
-- Esto resuelve el error "cached plan must not change result type"
-- Ejecutar este script en la base de datos si persiste el error

-- Desconectar todas las conexiones activas (cuidado en producción)
-- SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = current_database() AND pid <> pg_backend_pid();

-- Alternativamente, simplemente reiniciar el servidor de Next.js debería ser suficiente
-- El error se resuelve automáticamente al reiniciar porque Prisma recarga el schema

