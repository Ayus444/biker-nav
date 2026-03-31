// src/components/TurnArrow.tsx
import React from "react";

const ARROWS: Record<string, { path: string; viewBox: string }> = {
  left: {
    path: "M 60 90 L 60 40 L 30 40 L 55 10 L 80 40 L 60 40",
    viewBox: "0 0 100 100",
  },
  right: {
    path: "M 40 90 L 40 40 L 70 40 L 45 10 L 20 40 L 40 40",
    viewBox: "0 0 100 100",
  },
  "sharp-left": {
    path: "M 70 90 L 70 50 L 20 50 L 20 20 L 10 35 L 30 35 L 30 60 L 70 60",
    viewBox: "0 0 100 100",
  },
  "sharp-right": {
    path: "M 30 90 L 30 50 L 80 50 L 80 20 L 90 35 L 70 35 L 70 60 L 30 60",
    viewBox: "0 0 100 100",
  },
  "slight-left": {
    path: "M 65 90 L 65 50 L 45 30 L 20 30 L 35 15 L 50 30 L 55 30 L 55 50 L 65 50",
    viewBox: "0 0 100 100",
  },
  "slight-right": {
    path: "M 35 90 L 35 50 L 55 30 L 80 30 L 65 15 L 50 30 L 45 30 L 45 50 L 35 50",
    viewBox: "0 0 100 100",
  },
  straight: {
    path: "M 50 90 L 50 30 L 30 50 L 50 30 L 70 50",
    viewBox: "0 0 100 100",
  },
  arrive: {
    path: "M 50 20 L 50 70 M 30 50 L 50 70 L 70 50 M 25 80 L 75 80",
    viewBox: "0 0 100 100",
  },
  roundabout: {
    path: "M 50 25 A 25 25 0 1 1 75 50 L 70 45 M 75 50 L 80 45",
    viewBox: "0 0 100 100",
  },
};

interface Props {
  action: string;
  size?: number;
  color?: string;
}

export function TurnArrow({ action, size = 80, color = "#F97316" }: Props) {
  const arrow = ARROWS[action] || ARROWS.straight;

  return (
    <svg
      width={size}
      height={size}
      viewBox={arrow.viewBox}
      fill="none"
      stroke={color}
      strokeWidth="8"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ filter: `drop-shadow(0 0 8px ${color}80)` }}
    >
      <path d={arrow.path} />
    </svg>
  );
}
