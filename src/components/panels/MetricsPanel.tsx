import React from "react";
import { BarMetricsChart, DonutChart } from "../Charts";

interface MetricsPanelProps {
  totalUsers: number;
  activeUsers: number;
  pendingUsers: number;
  suspendedUsers: number;
  cutEvents: number;
  sosEvents: number;
  docEvents: number;
  totalAuditLogs: number;
}

export const MetricsPanel: React.FC<MetricsPanelProps> = ({
  totalUsers,
  activeUsers,
  pendingUsers,
  suspendedUsers,
  cutEvents,
  sosEvents,
  docEvents,
  totalAuditLogs,
}) => {
  return (
    <div className="dash-panels-2">
      <section className="glass-card">
        <h3>Distribución de Cuentas</h3>
        <DonutChart
          centerLabel="Cuentas"
          centerValue={totalUsers}
          segments={[
            { label: "Activas", value: activeUsers, color: "#10b981" },
            { label: "Pendientes Docs", value: pendingUsers, color: "#f59e0b" },
            { label: "Suspendidas", value: suspendedUsers, color: "#ff1e3c" },
          ]}
        />
      </section>

      <section className="glass-card">
        <h3>Actividad Operativa</h3>
        <BarMetricsChart
          items={[
            { label: "Cortes / ACK Motor", value: cutEvents, color: "#ff1e3c" },
            { label: "Alertas SOS / Ancla", value: sosEvents, color: "#f59e0b" },
            { label: "Docs & Didit KYC", value: docEvents, color: "#8b5cf6" },
            {
              label: "Total Eventos Auditados",
              value: totalAuditLogs,
              color: "#38bdf8",
            },
          ]}
        />
      </section>
    </div>
  );
};
