"use client";

interface Activity {
  id: number;
  name: string;
  type: string;
  distance: number;
  moving_time: number;
  elapsed_time: number;
  total_elevation_gain: number;
  start_date: string;
  start_date_local: string;
}

interface ActivitiesListProps {
  activities: Activity[];
}

export function ActivitiesList({ activities }: ActivitiesListProps) {
  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay actividades disponibles
      </div>
    );
  }

  const formatDistance = (meters: number) => {
    if (meters >= 1000) {
      return `${(meters / 1000).toFixed(2)} km`;
    }
    return `${meters.toFixed(0)} m`;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-4">
      {activities.map((activity) => (
        <div
          key={activity.id}
          className="border rounded-lg p-4 hover:bg-accent transition-colors"
        >
          <div className="flex justify-between items-start mb-2">
            <h3 className="font-semibold text-lg">{activity.name}</h3>
            <span className="text-sm text-muted-foreground bg-secondary px-2 py-1 rounded">
              {activity.type}
            </span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Distancia</p>
              <p className="font-medium">{formatDistance(activity.distance)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tiempo</p>
              <p className="font-medium">{formatTime(activity.moving_time)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Elevación</p>
              <p className="font-medium">
                {activity.total_elevation_gain.toFixed(0)} m
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Fecha</p>
              <p className="font-medium">{formatDate(activity.start_date_local)}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

