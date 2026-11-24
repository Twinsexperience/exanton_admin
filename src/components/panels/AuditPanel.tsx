import React from "react";
import { AuditLogItem } from "../../services/adminApi";

interface AuditPanelProps {
  logs: AuditLogItem[];
}

export const AuditPanel: React.FC<AuditPanelProps> = ({ logs }) => {
  return (
    <div className="glass-card table-wrap">
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
              <td className="mono">
                {new Date(l.createdAt).toLocaleString()}
              </td>
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
