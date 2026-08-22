import React from "react";

/** Official Monad Logo */
export default function MonadLogo({
  size = 24,
  spin = false,
  className = "",
}: {
  size?: number;
  spin?: boolean;
  className?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${spin ? "monad-spin" : ""} ${className}`}
    >
      <circle cx="60" cy="60" r="60" fill="#836EF9" />
      <rect
        x="34"
        y="34"
        width="52"
        height="52"
        rx="14"
        transform="rotate(45 60 60)"
        stroke="white"
        strokeWidth="18"
        fill="none"
      />
    </svg>
  );
}
