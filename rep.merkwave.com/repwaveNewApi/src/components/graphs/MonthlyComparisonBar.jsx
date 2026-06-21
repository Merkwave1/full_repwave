import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
  Legend,
  LabelList,
} from "recharts";

const useIsMobile = () => {
  const [mobile, setMobile] = useState(
    typeof window !== "undefined" &&
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

const MonthlyComparisonBar = ({ data }) => {
  const isMobile = useIsMobile();
  const chartData = [
    {
      month: "الشهر الحالي",
      orders: data.currentOrders,
      sales: data.currentSales,
    },
    {
      month: "الشهر السابق",
      orders: data.previousOrders,
      sales: data.previousSales,
    },
  ];

  return (
    <div className={`w-full ${isMobile ? "h-[260px]" : "h-[480px]"}`}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          barGap={isMobile ? 4 : 12}
          barCategoryGap={isMobile ? "25%" : "40%"}
          margin={{
            top: 20,
            right: isMobile ? 4 : 10,
            left: isMobile ? 4 : 10,
            bottom: 4,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />

          <XAxis dataKey="month" tick={{ fontSize: isMobile ? 10 : 13 }} />

          {!isMobile && (
            <>
              <YAxis
                yAxisId="orders"
                orientation="left"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toLocaleString("ar-EG")}
              />
              <YAxis
                yAxisId="sales"
                orientation="right"
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => v.toLocaleString("ar-EG")}
              />
            </>
          )}

          <Tooltip
            formatter={(v) => v.toLocaleString("ar-EG")}
            contentStyle={{ fontSize: isMobile ? 11 : 13 }}
          />
          <Legend
            wrapperStyle={{
              fontSize: isMobile ? 11 : 13,
              paddingTop: isMobile ? 4 : 12,
            }}
          />

          <defs>
            <linearGradient id="ordersGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1F2937" />
              <stop offset="100%" stopColor="#005A7D" />
            </linearGradient>
            <linearGradient id="salesGradient" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#1F2937" />
              <stop offset="100%" stopColor="#005A7D" />
            </linearGradient>
          </defs>

          <Bar
            {...(!isMobile ? { yAxisId: "orders" } : {})}
            dataKey="orders"
            name="عدد الطلبات"
            fill="url(#ordersGradient)"
            barSize={isMobile ? 20 : 34}
            radius={[6, 6, 0, 0]}
          >
            <LabelList
              position="top"
              fill="#1e3a8a"
              fontSize={isMobile ? 9 : 12}
            />
          </Bar>

          <Bar
            {...(!isMobile ? { yAxisId: "sales" } : {})}
            dataKey="sales"
            name="قيمة المبيعات"
            fill="url(#salesGradient)"
            barSize={isMobile ? 20 : 34}
            radius={[6, 6, 0, 0]}
          >
            <LabelList
              position="top"
              fill="#1e40af"
              fontSize={isMobile ? 9 : 12}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MonthlyComparisonBar;
