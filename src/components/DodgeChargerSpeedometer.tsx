import React, { useEffect, useRef, useState } from 'react';
import type { DriveMode, SpeedUnit } from '../types/telemetry';

interface DodgeChargerSpeedometerProps {
  speedMph: number;
  rpm: number;
  peakSpeedMph: number;
  tripDistanceMiles: number;
  heading: number;
  driveMode: DriveMode;
  unit: SpeedUnit;
  isTracking: boolean;
  compact?: boolean;
}

const MODE_PALETTE: Record<
  DriveMode,
  { accent: string; glow: string; label: string; secondary: string }
> = {
  street: {
    accent: '#E2E8F0',
    glow: 'rgba(226, 232, 240, 0.25)',
    label: 'Street',
    secondary: '#94A3B8',
  },
  sport: {
    accent: '#F97316',
    glow: 'rgba(249, 115, 22, 0.35)',
    label: 'Sport',
    secondary: '#FB923C',
  },
  track: {
    accent: '#E11D2E',
    glow: 'rgba(225, 29, 46, 0.45)',
    label: 'Track',
    secondary: '#FB7185',
  },
};

function computeGear(speedMph: number): string {
  if (speedMph < 0.8) return 'P';
  if (speedMph < 22) return '1';
  if (speedMph < 42) return '2';
  if (speedMph < 66) return '3';
  if (speedMph < 94) return '4';
  if (speedMph < 124) return '5';
  if (speedMph < 152) return '6';
  if (speedMph < 178) return '7';
  return '8';
}

function compassLabel(deg: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round((((deg % 360) + 360) % 360) / 45) % 8;
  return dirs[idx];
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeArc(
  cx: number,
  cy: number,
  r: number,
  startAngle: number,
  endAngle: number
) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
  return ['M', start.x, start.y, 'A', r, r, 0, largeArcFlag, 0, end.x, end.y].join(' ');
}

export const DodgeChargerSpeedometer: React.FC<DodgeChargerSpeedometerProps> = ({
  speedMph,
  rpm,
  peakSpeedMph,
  tripDistanceMiles,
  heading,
  driveMode,
  unit,
  isTracking,
  compact = false,
}) => {
  const [displaySpeedMph, setDisplaySpeedMph] = useState(speedMph);
  const [displayRpm, setDisplayRpm] = useState(rpm);
  const targetRef = useRef({ speed: speedMph, rpm });
  const currentRef = useRef({ speed: speedMph, rpm });

  useEffect(() => {
    targetRef.current = { speed: speedMph, rpm };
  }, [speedMph, rpm]);

  // Smooth 60fps needle damping mimicking Charger stepper-motor sweep
  useEffect(() => {
    let rafId = 0;
    const tick = () => {
      const ds = targetRef.current.speed - currentRef.current.speed;
      const dr = targetRef.current.rpm - currentRef.current.rpm;
      if (Math.abs(ds) > 0.05 || Math.abs(dr) > 5) {
        currentRef.current.speed += ds * 0.16;
        currentRef.current.rpm += dr * 0.18;
        setDisplaySpeedMph(currentRef.current.speed);
        setDisplayRpm(currentRef.current.rpm);
      } else if (
        currentRef.current.speed !== targetRef.current.speed ||
        currentRef.current.rpm !== targetRef.current.rpm
      ) {
        currentRef.current.speed = targetRef.current.speed;
        currentRef.current.rpm = targetRef.current.rpm;
        setDisplaySpeedMph(currentRef.current.speed);
        setDisplayRpm(currentRef.current.rpm);
      }
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const maxDialValue = unit === 'mph' ? 200 : 320;
  const shownSpeed = unit === 'mph' ? displaySpeedMph : displaySpeedMph * 1.60934;
  const shownPeak = unit === 'mph' ? peakSpeedMph : peakSpeedMph * 1.60934;
  const shownDist = unit === 'mph' ? tripDistanceMiles : tripDistanceMiles * 1.60934;
  const clampedFraction = Math.min(1, Math.max(0, shownSpeed / maxDialValue));

  // Sweep starts at 225deg (bottom-left, 7:30) clockwise 270deg to 495deg (bottom-right, 4:30)
  // Note: polarToCartesian uses 0deg = 12 o'clock, so 7:30 is 225deg, 4:30 is 135deg (+360 = 495deg)
  const startAngle = 225;
  const sweepSpan = 270;
  const needleAngle = startAngle + clampedFraction * sweepSpan;
  const palette = MODE_PALETTE[driveMode];
  const gear = computeGear(displaySpeedMph);
  const rpmFraction = Math.min(1, Math.max(0, displayRpm / 7000));

  const cx = 220;
  const cy = 220;
  const majorStep = unit === 'mph' ? 20 : 40;
  const minorStep = unit === 'mph' ? 2 : 4;
  const totalTicks = maxDialValue / minorStep;

  const ticks = [];
  for (let i = 0; i <= totalTicks; i++) {
    const val = i * minorStep;
    const frac = val / maxDialValue;
    const angle = startAngle + frac * sweepSpan;
    const isMajor = val % majorStep === 0;
    const isMid = !isMajor && val % (majorStep / 2) === 0;
    const isRedZone = frac >= 0.8;

    const rOuter = 178;
    const rInner = isMajor ? 156 : isMid ? 164 : 170;
    const p1 = polarToCartesian(cx, cy, rInner, angle);
    const p2 = polarToCartesian(cx, cy, rOuter, angle);

    ticks.push(
      <line
        key={`t-${val}`}
        x1={p1.x}
        y1={p1.y}
        x2={p2.x}
        y2={p2.y}
        stroke={isRedZone ? '#E11D2E' : isMajor ? '#F4F4F5' : '#71717A'}
        strokeWidth={isMajor ? 3 : isMid ? 2 : 1.1}
        strokeLinecap="round"
        opacity={isMajor ? 0.96 : isMid ? 0.78 : 0.45}
      />
    );

    if (isMajor) {
      const labelPos = polarToCartesian(cx, cy, 132, angle);
      ticks.push(
        <text
          key={`lbl-${val}`}
          x={labelPos.x}
          y={labelPos.y}
          textAnchor="middle"
          dominantBaseline="central"
          fill={isRedZone ? '#FB7185' : '#F4F4F5'}
          fontSize="21"
          fontWeight="800"
          fontStyle="italic"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {val}
        </text>
      );
    }
  }

  const needleTip = polarToCartesian(cx, cy, 165, needleAngle);
  const needleTail = polarToCartesian(cx, cy, 34, needleAngle + 180);
  const needleLeft = polarToCartesian(cx, cy, 6.5, needleAngle - 90);
  const needleRight = polarToCartesian(cx, cy, 6.5, needleAngle + 90);

  return (
    <div className={`relative flex flex-col items-center select-none ${compact ? 'w-full max-w-[300px]' : 'w-full max-w-[440px]'}`}>
      <svg
        viewBox="0 0 440 440"
        className="w-full h-auto drop-shadow-[0_24px_48px_rgba(0,0,0,0.85)]"
        role="img"
        aria-label={`Dodge Charger Speedometer reading ${Math.round(shownSpeed)} ${unit.toUpperCase()}`}
      >
        <defs>
          <linearGradient id="chargerBezel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#3F4451" />
            <stop offset="28%" stopColor="#1B1E25" />
            <stop offset="72%" stopColor="#101217" />
            <stop offset="100%" stopColor="#2F3440" />
          </linearGradient>
          <radialGradient id="chargerDialBg" cx="50%" cy="46%" r="54%">
            <stop offset="0%" stopColor="#14171F" />
            <stop offset="65%" stopColor="#090B0F" />
            <stop offset="100%" stopColor="#050608" />
          </radialGradient>
          <radialGradient id="modeGlow" cx="50%" cy="50%" r="50%">
            <stop offset="55%" stopColor="transparent" />
            <stop offset="92%" stopColor={palette.glow} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <pattern id="carbonWeave" width="8" height="8" patternUnits="userSpaceOnUse">
            <rect width="8" height="8" fill="transparent" />
            <path d="M 0 4 L 4 0 L 8 4 L 4 8 Z" fill="rgba(255,255,255,0.018)" />
          </pattern>
          <filter id="crimsonGlow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="4" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Outer Brushed Gunmetal Housing */}
        <circle cx={cx} cy={cy} r="214" fill="url(#chargerBezel)" />
        <circle cx={cx} cy={cy} r="204" fill="#07080B" stroke="#272A34" strokeWidth="1.5" />

        {/* Recessed Dial Face + Carbon Weave */}
        <circle cx={cx} cy={cy} r="196" fill="url(#chargerDialBg)" />
        <circle cx={cx} cy={cy} r="196" fill="url(#carbonWeave)" />
        <circle cx={cx} cy={cy} r="194" fill="url(#modeGlow)" />

        {/* Subtle Inner Accent Ring */}
        <path
          d={describeArc(cx, cy, 186, startAngle, startAngle + sweepSpan)}
          fill="none"
          stroke="#27272A"
          strokeWidth="3"
          strokeLinecap="round"
        />

        {/* Active Speed Trail Arc */}
        {clampedFraction > 0.005 && (
          <path
            d={describeArc(cx, cy, 186, startAngle, needleAngle)}
            fill="none"
            stroke={palette.accent}
            strokeWidth="4.5"
            strokeLinecap="round"
            filter="url(#crimsonGlow)"
          />
        )}

        {/* Redline Zone Outer Marker (160 - 200 MPH) */}
        <path
          d={describeArc(cx, cy, 180, startAngle + sweepSpan * 0.8, startAngle + sweepSpan)}
          fill="none"
          stroke="#E11D2E"
          strokeWidth="2"
          opacity="0.7"
        />

        {/* Major, Mid, Minor Ticks & Canted Numerals */}
        {ticks}

        {/* Top Cluster Branding & Mode */}
        <text
          x={cx}
          y="134"
          textAnchor="middle"
          fill="#71717A"
          fontSize="11"
          fontWeight="700"
          letterSpacing="3.5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          CHARGER INSTRUMENT CLUSTER
        </text>
        <text
          x={cx}
          y="152"
          textAnchor="middle"
          fill={palette.accent}
          fontSize="13"
          fontWeight="700"
          letterSpacing="2.5"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {palette.label.toUpperCase()} MODE
        </text>

        {/* Bottom EVIC Digital Cutout Window */}
        <rect
          x="130"
          y="264"
          width="180"
          height="110"
          rx="12"
          fill="#0B0D12"
          stroke="#272A34"
          strokeWidth="1.5"
        />

        {/* Digital Speed Readout */}
        <text
          x={cx}
          y="315"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="56"
          fontWeight="800"
          className="tabular-nums"
          style={{ fontFamily: 'var(--font-display)' }}
        >
          {Math.round(shownSpeed)}
        </text>
        <text
          x={cx}
          y="335"
          textAnchor="middle"
          fill={palette.secondary}
          fontSize="12"
          fontWeight="700"
          letterSpacing="2.5"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {unit.toUpperCase()}
        </text>

        {/* EVIC Bottom Row: Gear | Peak | Trip */}
        <line x1="146" y1="345" x2="294" y2="345" stroke="#1F242D" strokeWidth="1" />
        <text
          x="156"
          y="362"
          textAnchor="start"
          fill="#E11D2E"
          fontSize="13"
          fontWeight="700"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          G:{gear}
        </text>
        <text
          x={cx}
          y="362"
          textAnchor="middle"
          fill="#A1A1AA"
          fontSize="11"
          fontWeight="600"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          PK {Math.round(shownPeak)}
        </text>
        <text
          x="286"
          y="362"
          textAnchor="end"
          fill="#A1A1AA"
          fontSize="11"
          fontWeight="600"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {shownDist.toFixed(1)}{unit === 'mph' ? 'mi' : 'km'}
        </text>

        {/* RPM Micro Bar */}
        <rect x="148" y="384" width="144" height="5" rx="2.5" fill="#181B22" />
        <rect
          x="148"
          y="384"
          width={Math.max(4, 144 * rpmFraction)}
          height="5"
          rx="2.5"
          fill={rpmFraction > 0.85 ? '#E11D2E' : palette.accent}
        />
        <text
          x={cx}
          y="404"
          textAnchor="middle"
          fill="#71717A"
          fontSize="10.5"
          fontWeight="600"
          style={{ fontFamily: 'var(--font-mono)' }}
        >
          {Math.round(displayRpm)} RPM · {compassLabel(heading)} {Math.round(heading)}°
        </text>

        {/* Signature Dodge Charger Glowing Crimson Needle */}
        <g filter="url(#crimsonGlow)">
          <polygon
            points={`${needleTip.x},${needleTip.y} ${needleLeft.x},${needleLeft.y} ${needleTail.x},${needleTail.y} ${needleRight.x},${needleRight.y}`}
            fill="#FF2438"
          />
          <line
            x1={needleTail.x}
            y1={needleTail.y}
            x2={needleTip.x}
            y2={needleTip.y}
            stroke="#FF8A95"
            strokeWidth="1.2"
            opacity="0.75"
          />
        </g>

        {/* Brushed Center Hub Cap */}
        <circle cx={cx} cy={cy} r="24" fill="#181B22" stroke="#3F4451" strokeWidth="2.5" />
        <circle cx={cx} cy={cy} r="14" fill="#0B0D12" stroke="#272A34" strokeWidth="1.5" />
        <circle cx={cx} cy={cy} r="5" fill={isTracking ? '#E11D2E' : '#52525B'} />
      </svg>
    </div>
  );
};
