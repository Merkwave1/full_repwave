import React, { useId, useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from "recharts";

/* -------------------- Helpers -------------------- */

const defaultTheme = {
  cardBg: "bg-white",
  titleColor: "text-[#0f172a]",
  gridColor: "#e2e8f0",
  axisColor: "#64748b",
  tooltipBg: "#020617",
  tooltipText: "#ffffff",
  countColor: "#0a2fbf",
  valueColor: "#38bdf8",
};

const formatK = (v) => (v >= 1000 ? `${(v / 1000).toFixed(1)}K` : v);

const useDebouncedResize = (delay = 1024) => {
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let t;
    const handler = () => {
      clearTimeout(t);
      t = setTimeout(() => setTick((n) => n + 1), delay);
    };
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, [delay]);

  return tick;
};

/* Stable mobile breakpoint */
const useIsMobile = () => {
  const [mobile, setMobile] = useState(
    window.matchMedia("(max-width: 639px)").matches,
  );

  useEffect(() => {
    const media = window.matchMedia("(max-width: 639px)");
    const handler = (e) => setMobile(e.matches);
    media.addEventListener("change", handler);
    return () => media.removeEventListener("change", handler);
  }, []);

  return mobile;
};

const BarValueLabel = ({ x, y, width, value }) => {
  if (!value) return null;
  return (
    <text
      x={x + width / 2}
      y={y - 6}
      textAnchor="middle"
      fill="#0f172a"
      fontSize="11"
      fontWeight="600"
    >
      {formatK(value)}
    </text>
  );
};

/* -------------------- Component -------------------- */

const MetricBarChart = ({
  title,
  icon: Icon,
  data = [],
  formatCount,
  formatAmount,
  showLabels = true,
  theme = {},
}) => {
  const mergedTheme = { ...defaultTheme, ...theme };
  const gradientId = useId();

  const isMobile = useIsMobile();
  const resizeTick = useDebouncedResize();

  return (
    <div
      className={`${mergedTheme.cardBg} rounded-xl shadow-lg p-3 md:p-6 flex flex-col`}
    >
      {/* Header */}
      <div className="flex items-center mb-4">
        {Icon && (
          <Icon
            className="h-6 w-6 ml-2"
            style={{ color: mergedTheme.valueColor }}
          />
        )}
        <h2 className={`text-lg font-semibold ${mergedTheme.titleColor}`}>
          {title}
        </h2>
      </div>

      {/* Chart */}
      <div className="flex-1 min-h-[220px] sm:min-h-[340px] w-full">
        <ResponsiveContainer key={resizeTick} width="100%" height="100%">
          <BarChart
            data={data}
            barGap={isMobile ? 3 : 8}
            barCategoryGap={isMobile ? "8%" : "20%"}
            margin={{ top: 26, right: 0, left: 0, bottom: 12 }}
          >
            <defs>
              <linearGradient
                id={`${gradientId}-count`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={mergedTheme.countColor} />
                <stop
                  offset="100%"
                  stopColor={mergedTheme.countColor}
                  stopOpacity={0.65}
                />
              </linearGradient>

              <linearGradient
                id={`${gradientId}-value`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="0%" stopColor={mergedTheme.valueColor} />
                <stop
                  offset="100%"
                  stopColor={mergedTheme.valueColor}
                  stopOpacity={0.65}
                />
              </linearGradient>
            </defs>

            <CartesianGrid
              strokeDasharray="4 4"
              stroke={mergedTheme.gridColor}
              vertical={false}
            />

            <XAxis
              dataKey="label"
              tick={{
                fill: mergedTheme.axisColor,
                fontSize: isMobile ? 11 : 13,
              }}
              axisLine={false}
              tickLine={false}
            />

            {!isMobile && (
              <>
                <YAxis
                  yAxisId="left"
                  tick={{ fill: mergedTheme.axisColor }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: mergedTheme.axisColor }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={formatK}
                />
              </>
            )}

            <Tooltip
              contentStyle={{
                backgroundColor: mergedTheme.tooltipBg,
                border: "none",
                borderRadius: "10px",
                color: mergedTheme.tooltipText,
                fontSize: "13px",
              }}
              formatter={(v, n) =>
                n === "value" ? formatAmount?.(v) : formatCount?.(v)
              }
            />

            <Legend
              verticalAlign="bottom"
              align="center"
              iconType="rect"
              wrapperStyle={{
                paddingTop: isMobile ? "6px" : "18px",
                fontSize: isMobile ? "11px" : "13px",
              }}
            />

            <Bar
              {...(!isMobile ? { yAxisId: "left" } : {})}
              dataKey="count"
              name="العدد"
              fill={`url(#${gradientId}-count)`}
              radius={[8, 8, 0, 0]}
              barSize={isMobile ? undefined : 26}
            >
              {showLabels && <LabelList content={<BarValueLabel />} />}
            </Bar>

            <Bar
              {...(!isMobile ? { yAxisId: "right" } : {})}
              dataKey="value"
              name="القيمة"
              fill={`url(#${gradientId}-value)`}
              radius={[8, 8, 0, 0]}
              barSize={isMobile ? undefined : 26}
            >
              {showLabels && <LabelList content={<BarValueLabel />} />}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default React.memo(MetricBarChart);
