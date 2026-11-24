import React, { useState } from "react";
import {
  IncidentItem,
  PoliceRecoveryKit,
  generatePoliceKit,
} from "../../services/adminApi";

interface IncidentsPanelProps {
  incidents: IncidentItem[];
  onLocateVehicle: (vehicleId: string) => void;
  onUpdateIncident: (
    id: string,
    status: IncidentItem["status"],
    operatorNotes?: string
  ) => Promise<void>;
  onNotify: (msg: string) => void;
  onError: (msg: string) => void;
}

const WEB_APP_URL =
  (import.meta as unknown as { env?: { VITE_WEB_URL?: string } }).env
    ?.VITE_WEB_URL ?? "https://warden.exanton.com";

export const IncidentsPanel: React.FC<IncidentsPanelProps> = ({
  incidents,
  onLocateVehicle,
  onUpdateIncident,
  onNotify,
  onError,
}) => {
  const [incidentFilter, setIncidentFilter] = useState<string>("OPEN");
  const [kit, setKit] = useState<PoliceRecoveryKit | null>(null);
  const [loadingKit, setLoadingKit] = useState(false);

  const filtered = incidents.filter(
    (i) => incidentFilter === "ALL" || i.status === incidentFilter
  );

  const handleOpenPoliceKit = async (incidentId: string) => {
    setLoadingKit(true);
    try {
      const data = await generatePoliceKit(incidentId);
      setKit(data);
    } catch (err) {
      onError(
        err instanceof Error ? err.message : "Error generando Kit Policial"
      );
    } finally {
      setLoadingKit(false);
    }
  };

  const shareUrl = kit
    ? `${WEB_APP_URL.replace(/\/+$/, "")}/?track=${encodeURIComponent(
        kit.shareToken
      )}`
    : "";

  const copySummary = async () => {
    if (!kit) return;
    const text = [
      `EXANTON WARDEN - KIT DE RECUPERACIÓN POLICIAL`,
      `Incidente: ${kit.incident.title} (${kit.incident.severity})`,
      `Vehículo: ${kit.vehicle.alias} | Patente: ${kit.vehicle.plate} | IMEI: ${kit.vehicle.imei}`,
      `Titular: ${kit.owner?.fullName ?? "-"} | Tel: ${kit.owner?.phone ?? "-"} | Email: ${kit.owner?.email ?? "-"}`,
      `Última Ubicación: ${kit.address ?? `${kit.vehicle.lastLat}, ${kit.vehicle.lastLon}`}`,
      `Enlace en Vivo (24h): ${shareUrl}`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      onNotify("Resumen policial copiado al portapapeles.");
    } catch {
      onError("No se pudo copiar automáticamente.");
    }
  };

  return (
    <>
      <div className="glass-card">
        <div className="card-head">
          <h3>Triage de Incidentes &amp; Detección de Jammer</h3>
          <select
            value={incidentFilter}
            onChange={(e) => setIncidentFilter(e.target.value)}
            className="select-input"
          >
            <option value="ALL">Todos</option>
            <option value="OPEN">Abiertos</option>
            <option value="IN_PROGRESS">En Atención</option>
            <option value="RESOLVED">Resueltos</option>
          </select>
        </div>
        {filtered.length === 0 ? (
          <p className="muted">Sin incidentes en este estado.</p>
        ) : (
          <div className="list-col">
            {filtered.map((inc) => (
              <div key={inc.id} className="item-row">
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "8px",
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      className={`status-pill ${
                        inc.severity === "CRITICAL"
                          ? "rejected"
                          : inc.severity === "HIGH"
                          ? "pending"
                          : "active"
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <strong>{inc.title}</strong>
                    <span className="status-pill pending">{inc.status}</span>
                  </div>
                  <div className="sub">{inc.description}</div>
                  <div className="sub mono">
                    {inc.type} &bull; {inc.imei || "-"} &bull;{" "}
                    {new Date(inc.createdAt).toLocaleString()}
                    {inc.operatorNotes ? ` • Nota: ${inc.operatorNotes}` : ""}
                  </div>
                </div>
                <div className="row-actions">
                  {inc.vehicleId && (
                    <>
                      <button
                        type="button"
                        className="btn btn-glass btn-sm"
                        onClick={() => onLocateVehicle(inc.vehicleId!)}
                      >
                        Ver Mapa
                      </button>
                      <button
                        type="button"
                        className="btn btn-ghost-danger btn-sm"
                        disabled={loadingKit}
                        onClick={() => void handleOpenPoliceKit(inc.id)}
                      >
                        Kit Policial
                      </button>
                    </>
                  )}
                  {inc.status === "OPEN" && (
                    <button
                      type="button"
                      className="btn btn-glass btn-sm"
                      onClick={() => void onUpdateIncident(inc.id, "IN_PROGRESS")}
                    >
                      Atender
                    </button>
                  )}
                  {inc.status !== "RESOLVED" && (
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => {
                        const note = window.prompt(
                          "Nota de cierre (opcional):",
                          inc.operatorNotes || ""
                        );
                        void onUpdateIncident(
                          inc.id,
                          "RESOLVED",
                          note ?? undefined
                        );
                      }}
                    >
                      Resolver
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {kit && (
        <div
          className="modal-backdrop"
          role="dialog"
          aria-modal="true"
          onClick={() => setKit(null)}
        >
          <div
            className="login-card"
            style={{ maxWidth: 560, maxHeight: "88dvh", overflowY: "auto" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ marginBottom: 8 }}>
              Kit de Recuperación Policial (24h)
            </h3>
            <p className="sub" style={{ marginBottom: 12 }}>
              {kit.vehicle.alias} ({kit.vehicle.plate}) &bull; IMEI{" "}
              <span className="mono">{kit.vehicle.imei}</span>
            </p>
            <div className="dock-telemetry mono" style={{ flexDirection: "column", alignItems: "flex-start", gap: 6, marginBottom: 12 }}>
              <span>Titular: {kit.owner?.fullName ?? "-"}</span>
              <span>Teléfono: {kit.owner?.phone ?? "-"} | {kit.owner?.email ?? "-"}</span>
              <span>
                Última dirección: {kit.address ?? `${kit.vehicle.lastLat}, ${kit.vehicle.lastLon}`}
              </span>
              <span style={{ wordBreak: "break-all" }}>
                Enlace en vivo: {shareUrl}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => void copySummary()}
              >
                Copiar Parte Policial
              </button>
              <a
                href={shareUrl}
                target="_blank"
                rel="noreferrer"
                className="btn btn-glass btn-sm"
              >
                Abrir Mapa Público
              </a>
              <button
                type="button"
                className="btn btn-glass btn-sm"
                onClick={() => setKit(null)}
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
