/**
 * The cassette behind the window. Two hubs whose tape packs swap thickness as
 * the tape runs, with spokes that spin at the right relative speed — the
 * take-up reel is fat and slow while the supply reel is thin and frantic.
 */
/* Sized to sit inside the round porthole, the way the real one shows you a
   circle of cassette rather than the whole shell. */
const VIEW = { width: 132, height: 106 };
const HUB_RADIUS = 7;
const PACK_RADIUS = 25;
const LEFT = { x: 40, y: 46 };
const RIGHT = { x: 92, y: 46 };
const SPOKES = 6;
/**
 * Degrees per second per unit of (tape-speed / pack-radius). Tuned so play
 * reads as a believable spool and fast-forward reads as frantic.
 */
const SPIN = 900;

const svg = (name, attrs) => {
  const node = document.createElementNS('http://www.w3.org/2000/svg', name);
  Object.entries(attrs).forEach(([key, value]) => node.setAttribute(key, String(value)));
  return node;
};

/** Pack radius for a reel holding `fill` (0–1) of the tape, by area. */
const packRadius = (fill) =>
  Math.sqrt(HUB_RADIUS ** 2 + (PACK_RADIUS ** 2 - HUB_RADIUS ** 2) * Math.max(0, Math.min(1, fill)));

const buildReel = (parent, center) => {
  const group = svg('g', { transform: `translate(${center.x} ${center.y})` });

  const pack = svg('circle', { r: PACK_RADIUS, class: 'reel__pack' });
  const packEdge = svg('circle', { r: PACK_RADIUS, class: 'reel__pack-edge' });

  const spin = svg('g', { class: 'reel__spin' });
  spin.appendChild(svg('circle', { r: HUB_RADIUS, class: 'reel__hub' }));
  for (let i = 0; i < SPOKES; i += 1) {
    const angle = (i / SPOKES) * Math.PI * 2;
    spin.appendChild(
      svg('rect', {
        x: -2.2,
        y: -HUB_RADIUS - 5,
        width: 4.4,
        height: 6,
        rx: 1.4,
        class: 'reel__tooth',
        transform: `rotate(${(angle * 180) / Math.PI})`,
      }),
    );
  }
  spin.appendChild(svg('circle', { r: 3.2, class: 'reel__pin' }));

  group.append(pack, packEdge, spin);
  parent.appendChild(group);
  return { pack, packEdge, spin };
};

export const createReels = (mount) => {
  const root = svg('svg', {
    viewBox: `0 0 ${VIEW.width} ${VIEW.height}`,
    class: 'cassette',
    role: 'img',
    'aria-label': 'Cassette tape',
  });

  // Exposed tape along the bottom of the shell, where the heads sit. The two
  // vertical runs start at the edge of each pack, so they shorten and lengthen
  // as the tape moves from one reel to the other.
  const TAPE_Y = 84;
  root.appendChild(
    svg('line', { x1: LEFT.x, y1: TAPE_Y, x2: RIGHT.x, y2: TAPE_Y, class: 'cassette__tape-path' }),
  );
  const leftRun = svg('line', { x1: LEFT.x, x2: LEFT.x, y2: TAPE_Y, class: 'cassette__tape-path' });
  const rightRun = svg('line', {
    x1: RIGHT.x,
    x2: RIGHT.x,
    y2: TAPE_Y,
    class: 'cassette__tape-path',
  });
  root.append(leftRun, rightRun);

  const left = buildReel(root, LEFT);
  const right = buildReel(root, RIGHT);
  mount.appendChild(root);

  /** Each reel keeps its own angle: they turn at genuinely different speeds. */
  let leftAngle = 0;
  let rightAngle = 0;
  let lastAt = null;

  /**
   * `rate` is signed tape-seconds per second. Angular speed is linear speed
   * over pack radius, which is why an almost-empty reel whips around.
   */
  const update = ({ position, duration, rate, now = performance.now() }) => {
    const fill = duration > 0 ? Math.max(0, Math.min(1, position / duration)) : 0;
    const supply = packRadius(1 - fill);
    const takeup = packRadius(fill);

    left.pack.setAttribute('r', supply.toFixed(2));
    left.packEdge.setAttribute('r', supply.toFixed(2));
    right.pack.setAttribute('r', takeup.toFixed(2));
    right.packEdge.setAttribute('r', takeup.toFixed(2));

    leftRun.setAttribute('y1', (LEFT.y + supply).toFixed(2));
    rightRun.setAttribute('y1', (RIGHT.y + takeup).toFixed(2));

    const dt = lastAt === null ? 0 : Math.min(0.1, (now - lastAt) / 1000);
    lastAt = now;

    if (rate !== 0) {
      // Angular speed is linear tape speed over pack radius, so the reel with
      // less tape on it turns faster. SPIN scales that into degrees.
      leftAngle += ((rate * SPIN) / supply) * dt;
      rightAngle += ((rate * SPIN) / takeup) * dt;
      left.spin.setAttribute('transform', `rotate(${leftAngle.toFixed(2)})`);
      right.spin.setAttribute('transform', `rotate(${rightAngle.toFixed(2)})`);
    }
  };

  return { update };
};
