"use client";

import { Label } from "@/components/ui/label";

interface DashboardFiltersProps {
  period: "week" | "month";
  userId: string | null;
  activityType: "Ride" | "Run" | "Swim";
  users: Array<{ id: string; name: string }>;
  onPeriodChange: (period: "week" | "month") => void;
  onUserIdChange: (userId: string | null) => void;
  onActivityTypeChange: (activityType: "Ride" | "Run" | "Swim") => void;
}

export function DashboardFilters({
  period,
  userId,
  activityType,
  users,
  onPeriodChange,
  onUserIdChange,
  onActivityTypeChange,
}: DashboardFiltersProps) {
  return (
    <div className="flex flex-wrap gap-4 items-end mb-6">
      <div className="flex flex-col gap-2">
        <Label htmlFor="period">Período</Label>
        <select
          id="period"
          value={period}
          onChange={(e) => onPeriodChange(e.target.value as "week" | "month")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="week">Última Semana</option>
          <option value="month">Último Mes</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="activityType">Tipo de Actividad</Label>
        <select
          id="activityType"
          value={activityType}
          onChange={(e) => onActivityTypeChange(e.target.value as "Ride" | "Run" | "Swim")}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <option value="Ride">Bicicleta</option>
          <option value="Run">Correr</option>
          <option value="Swim">Nadar</option>
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="user">Usuario</Label>
        <select
          id="user"
          value={userId || ""}
          onChange={(e) => onUserIdChange(e.target.value || null)}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-w-[200px]"
        >
          <option value="">Todos los usuarios</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
