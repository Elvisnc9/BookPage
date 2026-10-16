/**
 * The "How it works" string: a sine wave across a 1200×520 box (or down a
 * 400×1200 box on phones), sampled as a polyline so SMIL can morph between
 * phases point by point.
 */
export function wavePath(phase: number, amplitude = 200, points = 72): string {
  const out: string[] = [];
  for (let i = 0; i <= points; i++) {
    const x = -20 + (1240 * i) / points;
    const y = 310 + amplitude * Math.sin((x / 1200) * Math.PI * 4 + phase);
    out.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return out.join(' ');
}

export function waveDownPath(phase: number, amplitude = 150, points = 72): string {
  const out: string[] = [];
  for (let i = 0; i <= points; i++) {
    const y = -20 + (1240 * i) / points;
    const x = 200 + amplitude * Math.sin((y / 1200) * Math.PI * 4 + phase);
    out.push(`${i === 0 ? 'M' : 'L'}${x.toFixed(1)} ${y.toFixed(1)}`);
  }
  return out.join(' ');
}

/** Keyframes for an endless swing: three phases, back to the first. */
export function swing(path: (phase: number, amplitude: number) => string, amps: [number, number, number]): { d: string; values: string } {
  const frames = [path(0, amps[0]), path(2.2, amps[1]), path(4.1, amps[2])];
  return { d: frames[0]!, values: [...frames, frames[0]].join(';') };
}
