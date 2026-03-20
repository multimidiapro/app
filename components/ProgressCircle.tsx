// components/ProgressCircle.tsx
'use client';

export function ProgressCircle({ percentage, size = 40 }: { percentage: number, size?: number }) {
  const radius = (size - 4) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg className="w-full h-full -rotate-90">
        <circle className="text-muted" stroke="currentColor" strokeWidth="4" fill="transparent" r={radius} cx={size / 2} cy={size / 2} />
        <circle className="text-primary" stroke="currentColor" strokeWidth="4" fill="transparent" r={radius} cx={size / 2} cy={size / 2} 
          style={{ strokeDasharray: circumference, strokeDashoffset: offset }} strokeLinecap="round" />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold">{percentage}%</span>
    </div>
  );
}
