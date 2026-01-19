import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface DistributionChartProps {
  title: string;
  meta: string;
  data: Record<string, number>;
}

const COLORS = ["#fbbf24", "#22d3ee", "#fb7185", "#a78bfa", "#34d399"];

export function DistributionChart({ title, meta, data }: DistributionChartProps) {
  const chartData = Object.entries(data).map(([name, value]) => ({
    name,
    value,
  }));

  if (chartData.length === 0) {
    return (
      <div className="bg-surface border border-border-dim rounded-2xl p-6">
        <div className="flex items-center justify-between mb-6">
          <span className="font-semibold">{title}</span>
          <span className="text-xs text-zinc-500 font-mono">{meta}</span>
        </div>
        <div className="h-64 flex items-center justify-center text-zinc-600">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border-dim rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <span className="font-semibold">{title}</span>
        <span className="text-xs text-zinc-500 font-mono">{meta}</span>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "#18181b",
                border: "1px solid #27272a",
                borderRadius: "8px",
              }}
              labelStyle={{ color: "#fafafa" }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-wrap gap-3 mt-4 justify-center">
        {chartData.map((entry, index) => (
          <div key={entry.name} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: COLORS[index % COLORS.length] }}
            />
            <span className="text-zinc-400">{entry.name}</span>
            <span className="text-zinc-500">({entry.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
}
