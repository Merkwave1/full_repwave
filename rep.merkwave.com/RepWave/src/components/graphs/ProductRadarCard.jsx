import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

const safeLog = (v) => Math.log10(Number(v || 0) + 1);

const ProductRadarCard = ({ title, subtitle, metrics, color = "#22c55e" }) => {
  const rawValues = metrics.map((m) => Number(m.value || 0));
  const maxLog = Math.max(...rawValues.map(safeLog)) || 1;

  const data = metrics.map((m) => ({
    metric: m.label,
    raw: Number(m.value || 0),
    value: (safeLog(m.value) / maxLog) * 100,
  }));

  return (
    <div className="bg-[#f7f8fb] rounded-2xl p-3 md:p-6 flex flex-col sm:flex-row w-full gap-4 sm:gap-6 items-center">
      {/* Info panel */}
      <div className="bg-gray-100 rounded-2xl px-4 py-4 w-full sm:w-1/2 text-center shrink-0">
        <h3 className="text-sm sm:text-base font-bold mb-1">{title}</h3>
        <p className="text-gray-500 text-xs sm:text-sm mb-2 sm:mb-3">
          {subtitle}
        </p>
        {metrics.map((m) => (
          <p key={m.label} className="text-xs sm:text-sm font-medium">
            {m.label}: {Number(m.value).toLocaleString("ar-EG")}
          </p>
        ))}
      </div>

      {/* Radar */}
      <div className="w-full h-[190px] sm:h-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <defs>
              <filter id="glow">
                <feGaussianBlur stdDeviation="4" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <PolarGrid stroke="#e5e7eb" />

            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: "#374151", fontSize: 10 }}
            />

            <PolarRadiusAxis domain={[0, 100]} tick={false} />

            <Radar
              dataKey="value"
              stroke={color}
              fill={color}
              fillOpacity={0.5}
              style={{ filter: "url(#glow)" }}
              isAnimationActive
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (!payload?.raw) return null;
                return (
                  <>
                    <circle cx={cx} cy={cy} r={4} fill={color} />
                    <text
                      x={cx}
                      y={cy - 10}
                      textAnchor="middle"
                      fill="#0f172a"
                      fontSize={10}
                      fontWeight="600"
                    >
                      {payload.raw.toLocaleString("ar-EG")}
                    </text>
                  </>
                );
              }}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default ProductRadarCard;
