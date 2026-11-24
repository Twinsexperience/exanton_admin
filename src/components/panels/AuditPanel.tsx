import React, { useState } from "react";
import { AuditLogItem, downloadAuditExport } from "../../services/adminApi";

interface AuditPanelProps {
  logs: AuditLogItem[];
  onError: (msg: string) => void;
}

export const AuditPanel: React.FC<AuditPanelProps> = ({ logs, onError }) => {
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const handleExport = async (format: "csv" | "json") => {
    try {
      await downloadAuditExport(
        format,
        fromDate ? new Date(fromDate).toISOString() : undefined,
        toDate ? new Date(toDate).toISOString() : undefined
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : "Error exportando");
    }
  };

  return (
    <div className="glass-card table-wrap">
      <div className="card-head" style={{ flexWrap: "wrap", gap: 10 }}>
        <h3>Bitácora Global Inmutable</h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="date"
            className="select-input"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            aria-label="Desde"
          />
          <input
            type="date"
            className="select-input"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            aria-label="Hasta"
          />
          <button
            type="button"
            className="btn btn-glass btn-sm"
            onClick={() => void handleExport("csv")}
          >
            Exportar CSV
          </button>
          <button
            type="button"
            className="btn btn-glass btn-sm"
            onClick={() => void handleExport("json")}
          >
            Exportar JSON
          </button>
        </div>
      </div>

      <table className="data-table">
        <thead>
          <tr>
            <th>Fecha</th>
            <th>Acción</th>
            <th>Origen</th>
            <th>IMEI</th>
            <th>IP</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((l) => (
            <tr key={l.id}>
              <td className="mono">{new Date(l.createdAt).toLocaleString()}</td>
              <td className="mono">
                <strong>{l.action}</strong>
              </td>
              <td className="mono">{l.actorScope}</td>
              <td className="mono">{l.imei || "-"}</td>
              <td className="mono">{l.ipAddress || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
