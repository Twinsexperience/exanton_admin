import React from "react";
import { AdminDocument } from "../../services/adminApi";

interface DocumentsPanelProps {
  documents: AdminDocument[];
  statusFilter: string;
  onStatusFilterChange: (status: string) => void;
  onReview: (id: string, decision: "APPROVED" | "REJECTED") => Promise<void>;
}

export const DocumentsPanel: React.FC<DocumentsPanelProps> = ({
  documents,
  statusFilter,
  onStatusFilterChange,
  onReview,
}) => {
  return (
    <div className="glass-card">
      <div className="card-head">
        <h3>Documentación de Alta</h3>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value)}
          className="select-input"
        >
          <option value="ALL">Todos</option>
          <option value="PENDING">Pendientes</option>
          <option value="APPROVED">Aprobados</option>
          <option value="REJECTED">Rechazados</option>
        </select>
      </div>
      {documents.length === 0 ? (
        <p className="muted">No hay documentos en este filtro.</p>
      ) : (
        <div className="list-col">
          {documents.map((d) => (
            <div key={d.id} className="item-row">
              <div>
                <strong>{d.docType}</strong> &bull; {d.originalName}
                <div className="sub mono">
                  {d.user?.fullName} ({d.user?.email}) &bull;{" "}
                  <span className={`status-pill ${d.status.toLowerCase()}`}>
                    {d.status}
                  </span>
                </div>
              </div>
              <div className="row-actions">
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => void onReview(d.id, "APPROVED")}
                >
                  Aprobar
                </button>
                <button
                  type="button"
                  className="btn btn-ghost-danger btn-sm"
                  onClick={() => void onReview(d.id, "REJECTED")}
                >
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
