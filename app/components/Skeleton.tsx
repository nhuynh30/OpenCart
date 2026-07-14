import type { CSSProperties } from "react";

export default function Skeleton({
  className = "",
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return <div className={`animate-pulse rounded-md bg-gray-200/70 ${className}`} style={style} />;
}
