import { PieChart, Pie, Sector, Cell, ResponsiveContainer } from "recharts";
import { useState } from "react";

const HoverDonut = ({ data, colors = ["#16a34a", "#4ade80"] }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const activeSlice = data[activeIndex];
  const percent = ((activeSlice.value / total) * 100).toFixed(1);

  const renderActiveShape = ({
    cx,
    cy,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
  }) => (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 6}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );

  return (
    <div className="flex flex-col items-center gap-1 w-full">
      {/* Label shown ABOVE the donut on small screens only */}
      <div className="sm:hidden text-center">
        <span className="text-[11px] font-medium text-gray-600 leading-tight block">
          {activeSlice.name}
        </span>
        <span
          className="text-sm font-bold block"
          style={{ color: colors[activeIndex] }}
        >
          {percent}%
        </span>
      </div>

      {/* Donut */}
      <div className="relative w-full max-w-[200px] sm:max-w-[220px] aspect-square mx-auto">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              cx="50%"
              cy="50%"
              innerRadius="60%"
              outerRadius="80%"
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              onMouseEnter={(_, i) => setActiveIndex(i)}
              onMouseLeave={() => setActiveIndex(0)}
              stroke="none"
            >
              {data.map((_, i) => (
                <Cell key={i} fill={colors[i]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>

        {/* Center overlay — only on sm+ where there's enough room */}
        <div className="hidden sm:flex absolute inset-0 flex-col items-center justify-center pointer-events-none text-center px-1">
          <span className="text-xs md:text-sm font-medium text-gray-600 leading-tight">
            {activeSlice.name}
          </span>
          <span
            className="text-base md:text-xl font-bold"
            style={{ color: colors[activeIndex] }}
          >
            {percent}%
          </span>
        </div>
      </div>
    </div>
  );
};

export default HoverDonut;
