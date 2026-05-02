import React from "react";
import { View, Text } from "react-native";
import Svg, { Circle } from "react-native-svg";

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerValue?: string;
}

export default function DonutChart({
  data,
  size = 140,
  strokeWidth = 20,
  centerLabel,
  centerValue,
}: DonutChartProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;
  const total = data.reduce((sum, d) => sum + d.value, 0);

  let cumulativePercent = 0;

  return (
    <View style={{ alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#E8F0EB"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {/* Data segments */}
        {total > 0 &&
          data
            .filter((d) => d.value > 0)
            .map((item, index) => {
              const percent = item.value / total;
              const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
              const rotation = cumulativePercent * 360 - 90;
              cumulativePercent += percent;

              return (
                <Circle
                  key={index}
                  cx={center}
                  cy={center}
                  r={radius}
                  stroke={item.color}
                  strokeWidth={strokeWidth}
                  fill="none"
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={0}
                  strokeLinecap="round"
                  rotation={rotation}
                  origin={`${center}, ${center}`}
                />
              );
            })}
      </Svg>
      {/* Center text */}
      {(centerLabel || centerValue) && (
        <View
          style={{
            position: "absolute",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {centerLabel && (
            <Text style={{ fontSize: 11, color: "#7A8F84", fontWeight: "500" }}>
              {centerLabel}
            </Text>
          )}
          {centerValue && (
            <Text
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.75}
              style={{
                width: size - strokeWidth * 3,
                textAlign: "center",
                fontSize: 18,
                color: "#1A2B23",
                fontWeight: "800",
              }}
            >
              {centerValue}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}
