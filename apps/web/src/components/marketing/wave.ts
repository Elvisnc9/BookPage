/**
 * The "How it works" string: a sine wave across a 1200×520 box, sampled as a
 * polyline so GSAP can tween between two phases point by point.
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
