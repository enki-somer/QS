"use client";

import React from "react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadialBarChart,
  RadialBar,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

// Color palette for charts
export const CHART_COLORS = {
  primary: "#182C61",
  secondary: "#40739e",
  success: "#27ae60",
  warning: "#f39c12",
  danger: "#e74c3c",
  info: "#3498db",
  light: "#ecf0f1",
  dark: "#2c3e50",
  gradient: ["#182C61", "#40739e", "#27ae60", "#f39c12", "#e74c3c", "#3498db"],
};

// Custom tooltip component
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-4 border border-gray-200 rounded-lg shadow-lg">
        <p className="text-gray-900 font-medium arabic-spacing">{label}</p>
        {payload.map((entry: any, index: number) => (
          <p
            key={index}
            className="text-sm arabic-nums"
            style={{ color: entry.color }}
          >
            {entry.name}:{" "}
            {typeof entry.value === "number"
              ? formatCurrency(entry.value)
              : entry.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

// KPI Card Component
interface KPICardProps {
  title: string;
  value: number | string;
  change?: number;
  changeType?: "increase" | "decrease" | "neutral";
  icon?: React.ReactNode;
  color?: string;
  format?: "currency" | "number" | "percentage";
}

export const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  change,
  changeType = "neutral",
  icon,
  color = CHART_COLORS.primary,
  format = "currency",
}) => {
  const formatValue = (val: number | string) => {
    if (typeof val === "string") return val;
    switch (format) {
      case "currency":
        return formatCurrency(val);
      case "percentage":
        return `${val}%`;
      default:
        return val.toLocaleString();
    }
  };

  const getChangeColor = () => {
    switch (changeType) {
      case "increase":
        return "text-green-600";
      case "decrease":
        return "text-red-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3 space-x-reverse">
          {icon && (
            <div
              className="p-2 rounded-lg"
              style={{ backgroundColor: `${color}15`, color }}
            >
              {icon}
            </div>
          )}
          <h3 className="text-sm font-medium text-gray-600 arabic-spacing">
            {title}
          </h3>
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-3xl font-bold text-gray-900 arabic-nums">
          {formatValue(value)}
        </p>
        {change !== undefined && (
          <p className={`text-sm ${getChangeColor()} arabic-nums`}>
            {change > 0 ? "+" : ""}
            {change}% من الشهر الماضي
          </p>
        )}
      </div>
    </div>
  );
};

// Gauge Chart Component
interface GaugeChartProps {
  value: number;
  max: number;
  title: string;
  color?: string;
  size?: number;
}

export const GaugeChart: React.FC<GaugeChartProps> = ({
  value,
  max,
  title,
  color = CHART_COLORS.primary,
  size = 200,
}) => {
  const percentage = Math.min((value / max) * 100, 100);
  const data = [
    { name: "Used", value: percentage, fill: color },
    { name: "Remaining", value: 100 - percentage, fill: "#e5e7eb" },
  ];

  return (
    <div className="flex flex-col items-center">
      <ResponsiveContainer width={size} height={size}>
        <RadialBarChart
          cx="50%"
          cy="50%"
          innerRadius="60%"
          outerRadius="90%"
          data={data}
          startAngle={180}
          endAngle={0}
        >
          <RadialBar dataKey="value" cornerRadius={10} />
        </RadialBarChart>
      </ResponsiveContainer>
      <div className="text-center mt-2">
        <p className="text-2xl font-bold text-gray-900 arabic-nums">
          {percentage.toFixed(1)}%
        </p>
        <p className="text-sm text-gray-600 arabic-spacing">{title}</p>
      </div>
    </div>
  );
};

// Trend Chart Component
interface TrendChartProps {
  data: Array<{ name: string; value: number; [key: string]: any }>;
  dataKey: string;
  title: string;
  color?: string;
  height?: number;
  type?: "line" | "area" | "bar";
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  dataKey,
  title,
  color = CHART_COLORS.primary,
  height = 300,
  type = "area",
}) => {
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
      case "line":
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              strokeWidth={3}
              dot={{ fill: color, strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        );
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Bar dataKey={dataKey} fill={color} radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      default:
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient
                id={`gradient-${dataKey}`}
                x1="0"
                y1="0"
                x2="0"
                y2="1"
              >
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey={dataKey}
              stroke={color}
              fillOpacity={1}
              fill={`url(#gradient-${dataKey})`}
              strokeWidth={2}
            />
          </AreaChart>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 arabic-spacing mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

// Multi-Series Chart Component
interface MultiSeriesChartProps {
  data: Array<{ name: string; [key: string]: any }>;
  series: Array<{ key: string; name: string; color: string }>;
  title: string;
  height?: number;
  type?: "line" | "area" | "bar";
}

export const MultiSeriesChart: React.FC<MultiSeriesChartProps> = ({
  data,
  series,
  title,
  height = 300,
  type = "line",
}) => {
  const renderChart = () => {
    const commonProps = {
      data,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    };

    switch (type) {
      case "bar":
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {series.map((s) => (
              <Bar
                key={s.key}
                dataKey={s.key}
                name={s.name}
                fill={s.color}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        );
      case "area":
        return (
          <AreaChart {...commonProps}>
            <defs>
              {series.map((s) => (
                <linearGradient
                  key={s.key}
                  id={`gradient-${s.key}`}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.8} />
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {series.map((s) => (
              <Area
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                fill={`url(#gradient-${s.key})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        );
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {series.map((s) => (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={s.name}
                stroke={s.color}
                strokeWidth={3}
                dot={{ fill: s.color, strokeWidth: 2, r: 4 }}
              />
            ))}
          </LineChart>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 arabic-spacing mb-4">
        {title}
      </h3>
      <ResponsiveContainer width="100%" height={height}>
        {renderChart()}
      </ResponsiveContainer>
    </div>
  );
};

// Donut Chart Component
interface DonutChartProps {
  data: Array<{ name: string; value: number; color?: string }>;
  title: string;
  centerText?: string;
  height?: number;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  data,
  title,
  centerText,
  height = 300,
}) => {
  const dataWithColors = data.map((item, index) => ({
    ...item,
    color:
      item.color || CHART_COLORS.gradient[index % CHART_COLORS.gradient.length],
  }));

  const total = data.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 className="text-lg font-semibold text-gray-900 arabic-spacing mb-4">
        {title}
      </h3>
      <div className="flex items-center justify-between">
        <ResponsiveContainer width="60%" height={height}>
          <PieChart>
            <Pie
              data={dataWithColors}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {dataWithColors.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="flex-1 space-y-3">
          {centerText && (
            <div className="text-center mb-4">
              <p className="text-2xl font-bold text-gray-900 arabic-nums">
                {centerText}
              </p>
            </div>
          )}
          {dataWithColors.map((item, index) => (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-2 space-x-reverse">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                ></div>
                <span className="text-sm text-gray-700 arabic-spacing">
                  {item.name}
                </span>
              </div>
              <div className="text-left">
                <span className="text-sm font-medium text-gray-900 arabic-nums">
                  {formatCurrency(item.value)}
                </span>
                <p className="text-xs text-gray-500 arabic-nums">
                  {((item.value / total) * 100).toFixed(1)}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
