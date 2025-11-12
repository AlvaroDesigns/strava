"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Trash2, AlertTriangle } from "lucide-react";

export function DeleteAccountButton() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const response = await fetch("/api/account/delete", {
        method: "DELETE",
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Error al eliminar la cuenta");
      }

      // Redirigir al login después de eliminar la cuenta
      router.push("/login?deleted=true");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar la cuenta");
      setIsDeleting(false);
    }
  };

  if (showConfirm) {
    return (
      <div className="space-y-4">
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>¿Estás seguro?</AlertTitle>
          <AlertDescription>
            Esta acción no se puede deshacer. Se eliminarán permanentemente:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Tu cuenta de usuario</li>
              <li>Todas tus actividades sincronizadas</li>
              <li>Tu configuración de Strava</li>
              <li>Tu conexión con Strava</li>
            </ul>
          </AlertDescription>
        </Alert>
        {error && (
          <Alert variant="destructive">
            <AlertTitle>Error</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="flex-1"
          >
            {isDeleting ? "Eliminando..." : "Sí, eliminar mi cuenta"}
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setShowConfirm(false);
              setError(null);
            }}
            disabled={isDeleting}
            className="flex-1"
          >
            Cancelar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button
      variant="destructive"
      onClick={() => setShowConfirm(true)}
      className="w-full"
    >
      <Trash2 className="h-4 w-4 mr-2" />
      Eliminar Cuenta
    </Button>
  );
}

