/**
 * Turning a knob is an angle problem, not a drag problem: what matters is how
 * far around the pointer travelled, including across the 359°→0° seam.
 */

/** Degrees clockwise from twelve o'clock, 0–360. */
export const angleAt = (cx, cy, x, y) => {
  const degrees = (Math.atan2(x - cx, cy - y) * 180) / Math.PI;
  return (degrees + 360) % 360;
};

/**
 * Signed change between two angles, always the short way round, so a knob
 * crossing zero does not read as a near-full turn backwards.
 */
export const rotationDelta = (previous, current) => {
  let delta = ((current - previous + 540) % 360) - 180;
  // -180 and 180 are the same rotation; normalise to the positive one.
  if (delta === -180) delta = 180;
  return delta;
};

/** How far the stylus travels for a given rotation. */
export const stepsFor = (deltaDegrees, { pixelsPerTurn = 240 }) =>
  (deltaDegrees / 360) * pixelsPerTurn;
