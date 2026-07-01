import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

const safeLog = (v) => Math.log10(Number(v || 0) + 1);

import { BRAND, DASHBOARD } from "../../constants/brandColors.js";

const ProductRadarCard = ({ title, subtitle, metrics, color = "#8B5FD6" }) => {
  const rawValues = metrics.map((m) => Number(m.value || 0));
  const maxLog = Math.max(...rawValues.map(safeLog)) || 1;

  const data = metrics.map((m) => ({
    metric: m.label,
    raw: Number(m.value || 0),
    value: (safeLog(m.value) / maxLog) * 100,
  }));

  return (
    <div
      className="rounded-2xl p-3 md:p-6 flex flex-col sm:flex-row w-full gap-4 sm:gap-6 items-center border"
      style={{
        background: `linear-gradient(135deg, ${color}08 0%, #FAFAFE 55%, white 100%)`,
        borderColor: `${color}30`,
      }}
    >
      <div
        className="rounded-2xl px-4 py-4 w-full sm:w-1/2 text-center shrink-0"
        style={{ backgroundColor: `${color}12` }}
      >
        <h3 className="text-sm sm:text-base font-bold mb-1 text-[#2D1B69]">{title}</h3>
        <p className="text-xs sm:text-sm mb-2 sm:mb-3" style={{ color }}>
          {subtitle}
        </p>
        {metrics.map((m) => (
          <p key={m.label} className="text-xs sm:text-sm font-medium text-[#2D1B69]">
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

            <PolarGrid stroke={`${color}25`} />

            <PolarAngleAxis
              dataKey="metric"
              tick={{ fill: color, fontSize: 10 }}
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
                      fill={BRAND.primaryDark}
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
