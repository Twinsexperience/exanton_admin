import React, { useState } from "react";
import { IncidentItem } from "../../services/adminApi";

interface IncidentsPanelProps {
  incidents: IncidentItem[];
  onLocateVehicle: (vehicleId: string) => void;
  onUpdateIncident: (
    id: string,
    status: IncidentItem["status"],
    operatorNotes?: string
  ) => Promise<void>;
}

export const IncidentsPanel: React.FC<IncidentsPanelProps> = ({
  incidents,
  onLocateVehicle,
  onUpdateIncident,
}) => {
  const [incidentFilter, setIncidentFilter] = useState<string>("OPEN");

  const filtered = incidents.filter(
    (i) => incidentFilter === "ALL" || i.status === incidentFilter
  );

  return (
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
                  <button
                    type="button"
                    className="btn btn-glass btn-sm"
                    onClick={() => onLocateVehicle(inc.vehicleId!)}
                  >
                    Ver Mapa
                  </button>
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
  );
};
