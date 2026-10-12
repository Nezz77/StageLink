import { useState, type MouseEvent } from 'react';

export interface SwitchModeProps {
  width?: number;
  height?: number;
  darkColor?: string;
  lightColor?: string;
  knobDarkColor?: string;
  knobLightColor?: string;
  borderDarkColor?: string;
  borderLightColor?: string;
  isDark?: boolean;
  onChange?: (isDark: boolean, event: MouseEvent<HTMLButtonElement>) => void;
}

export function SwitchMode({
  width = 180,
  height = 90,
  darkColor = "#111",
  lightColor = "#F9F9F9",
  knobDarkColor = "#1C1C1C",
  knobLightColor = "#F3F3F7",
  borderDarkColor = "#444",
  borderLightColor = "#DDD",
  isDark: controlledIsDark,
  onChange,
}: SwitchModeProps) {
  const [internalIsDark, setInternalIsDark] = useState(true);
  const isDark = controlledIsDark ?? internalIsDark;

  const padding = height * 0.1;
  const knobSize = height - (padding * 2);

  return (
    <button
      type="button"
      role="switch"
      aria-label="Light mode"
      aria-checked={!isDark}
      onClick={event => {
        const nextIsDark = !isDark;
        if (controlledIsDark === undefined) setInternalIsDark(nextIsDark);
        onChange?.(nextIsDark, event);
      }}
      style={{
        width,
        height,
        background: isDark ? darkColor : lightColor,
        border: `2px solid ${isDark ? borderDarkColor : borderLightColor}`,
        borderRadius: height / 2,
        position: 'relative',
        cursor: 'pointer',
        transition: 'all 0.3s ease-in-out',
        display: 'flex',
        alignItems: 'center',
        padding: padding,
        boxShadow: isDark ? 'inset 0 4px 20px rgba(0,0,0,0.5)' : 'inset 0 4px 10px rgba(0,0,0,0.1)'
      }}
    >
      {/* Track Icons */}
      <div className="absolute w-full h-full flex justify-between items-center pointer-events-none" style={{ left: 0, padding: `0 ${padding * 1.5}px` }}>
         <svg style={{ width: height * 0.4, height: height * 0.4 }} className={`transition-opacity duration-300 ${isDark ? 'opacity-30 text-slate-500' : 'opacity-100 text-amber-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
         </svg>
         <svg style={{ width: height * 0.4, height: height * 0.4 }} className={`transition-opacity duration-300 ${isDark ? 'opacity-100 text-violet-400' : 'opacity-30 text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
         </svg>
      </div>

      {/* Knob */}
      <div
        style={{
          width: knobSize,
          height: knobSize,
          borderRadius: '50%',
          background: isDark ? knobDarkColor : knobLightColor,
          boxShadow: '0 4px 15px rgba(0,0,0,0.3), inset 0 2px 2px rgba(255,255,255,0.1)',
          position: 'absolute',
          left: padding,
          transform: `translateX(${isDark ? width - padding * 2 - knobSize : 0}px)`,
          transition: 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1), background 0.3s ease',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'}`
        }}
      >
        <div 
          className="rounded-full blur-[2px] opacity-50"
          style={{
            width: knobSize * 0.6,
            height: knobSize * 0.6,
            background: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'
          }}
        />
      </div>
    </button>
  );
}

export default function SwitchModeDemo() {
    return (
        <div className="flex items-center justify-center p-8 rounded-2xl glass-panel">
            <SwitchMode
                width={180}
                height={90}
                darkColor="#111"
                lightColor="#F9F9F9"
                knobDarkColor="#1C1C1C"
                knobLightColor="#F3F3F7"
                borderDarkColor="#444"
                borderLightColor="#DDD"
            />
        </div>
    );
}
