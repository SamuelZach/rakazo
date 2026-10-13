// Shape and eye geometry adapted from the supplied configurable kit.
import BASE from "./liquid-bot-states.json" with { type: "json" };

const N = 64,
  SH = {
    circle: (cx, cy, rx, ry) => se(cx, cy, rx, ry, 2),
    squircle: (cx, cy, rx, ry) => se(cx, cy, rx * 1.02, ry * 0.96, 4.6),
    droplet: (cx, cy, rx, ry) => tear(cx, cy, rx * 0.96, ry * 0.92),
    capsule: (cx, cy, rx, ry) => se(cx, cy + 15, rx * 1.3, ry * 0.74, 3.4),
    cloud: (cx, cy, rx, ry) =>
      pol(
        cx,
        cy + 12,
        rx * 1.14,
        ry * 0.86,
        (a, c, s) => {
          const w = Math.max(0, Math.min(1, (0.3 - s) / 0.45)),
            base = s < 0 ? 1 : (Math.abs(c) ** 3.2 + s ** 3.2) ** (-1 / 3.2);
          return base * (1 + w * (0.12 * Math.abs(Math.cos(3.5 * (a + Math.PI / 2))) - 0.05));
        },
        1,
      ),
    heart: (cx, cy, rx, ry) => {
      let o = [];
      for (let i = 0; i < N; i++) {
        const t = (2 * Math.PI * i) / N,
          x = 16 * Math.sin(t) ** 3,
          y = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
        o.push([x, y]);
      }
      o = smooth(o, 5);
      return fitOutline(o, cx, cy + 8, rx * 1.12, ry * 1.02);
    },
    star: (cx, cy, rx, ry) =>
      pol(
        cx,
        cy + 14,
        rx * 1.16,
        ry * 1.12,
        (a) => 1 - 0.2 + 0.2 * Math.cos(5 * (a + Math.PI / 2)),
        6,
      ),
    ghost: (cx, cy, rx, ry) => {
      let o = [];
      for (let i = 0; i < N; i++) {
        let a = -Math.PI / 2 + (2 * Math.PI * i) / N,
          c = Math.cos(a),
          s = Math.sin(a),
          x,
          y;
        if (s < 0) {
          x = c;
          y = s * 1.05;
        } else {
          x = Math.sign(c) * Math.abs(c) ** 0.45;
          y = s ** 0.5 * 1.02;
          y += 0.15 * Math.cos(x * 3 * Math.PI) * Math.min(1, s * 2.5);
        }
        o.push([x, y]);
      }
      o = smooth(o, 2);
      return fitOutline(o, cx, cy + 4, rx * 0.94, ry * 1.02);
    },
    egg: (cx, cy, rx, ry) => {
      const o = [];
      for (let i = 0; i < N; i++) {
        const a = -Math.PI / 2 + (2 * Math.PI * i) / N,
          c = Math.cos(a),
          s = Math.sin(a);
        o.push([c * (1 + 0.13 * s), s]);
      }
      return fitOutline(o, cx, cy + 2, rx * 0.9, ry * 1.06);
    },
    hexagon: (cx, cy, rx, ry) =>
      pol(
        cx,
        cy + 4,
        rx * 1.04,
        ry * 1.0,
        (a) => {
          const k = Math.PI / 3,
            m = (((a % k) + k) % k) - k / 2;
          return Math.cos(k / 2) / Math.cos(m);
        },
        4,
      ),
    bean: (cx, cy, rx, ry) => {
      let o = [];
      for (let i = 0; i < N; i++) {
        let a = -Math.PI / 2 + (2 * Math.PI * i) / N,
          c = Math.cos(a),
          s = Math.sin(a),
          x = c,
          y = s;
        if (s > 0) y -= 0.42 * Math.exp(-((c / 0.42) ** 2)) * s;
        o.push([x, y]);
      }
      o = smooth(o, 2);
      return fitOutline(o, cx, cy + 16, rx * 1.3, ry * 0.8);
    },
  };
function smooth(o, k) {
  for (; k > 0; k--)
    o = o.map((p, i) => {
      const a = o[(i + N - 1) % N],
        b = o[(i + 1) % N];
      return [(a[0] + 2 * p[0] + b[0]) / 4, (a[1] + 2 * p[1] + b[1]) / 4];
    });
  return o;
}
function fitOutline(o, cx, cy, rx, ry) {
  const b = bb(o);
  return o.map((p) => [cx + ((p[0] - b[0]) / b[2]) * rx, cy + ((p[1] - b[1]) / b[3]) * ry]);
}
function pol(cx, cy, rx, ry, f, sm) {
  let o = [];
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / N,
      c = Math.cos(a),
      s = Math.sin(a),
      r = f(a, c, s);
    o.push([r * c, r * s]);
  }
  o = smooth(o, sm || 0);
  o[0][0] = 0;
  for (let j = 1; j < N / 2; j++) {
    const L = o[j],
      R = o[N - j],
      dx = (L[0] - R[0]) / 2,
      yy = (L[1] + R[1]) / 2;
    o[j] = [dx, yy];
    o[N - j] = [-dx, yy];
  }
  return fitOutline(o, cx, cy, rx, ry);
}
const SHDY = {
    circle: 0,
    squircle: 0,
    droplet: 22,
    capsule: 15,
    cloud: 22,
    heart: -6,
    star: 34,
    ghost: -10,
    egg: 18,
    hexagon: 4,
    bean: 4,
  },
  SHSP = {
    circle: 1,
    squircle: 1,
    droplet: 1,
    capsule: 1.18,
    cloud: 1.12,
    heart: 0.98,
    star: 0.8,
    ghost: 0.96,
    egg: 0.92,
    hexagon: 1,
    bean: 1.15,
  },
  SHSC = { heart: 0.82, star: 0.74, ghost: 0.95, egg: 0.92, bean: 0.88 };
const EY = {
  tall: { sx: 1, sy: 1, sp: 1, dy: 0 },
  round: { sx: 1.45, sy: 0.66, sp: 1.32, dy: 10 },
  cyclops: { sx: 1.55, sy: 1.12, sp: 0, dy: 18 },
  ring: { sx: 1.08, sy: 0.86, sp: 1.32, dy: 4, ring: 1 },
};
const MO = {
  classic: {},
  floaty: { drift: 1, tempo: 1.25 },
  bouncy: { bounce: 1, tempo: 0.85 },
  jelly: { jelly: 1 },
};
function se(cx, cy, rx, ry, p) {
  const o = [];
  for (let i = 0; i < N; i++) {
    const a = -Math.PI / 2 + (2 * Math.PI * i) / N,
      c = Math.cos(a),
      s = Math.sin(a);
    o.push([
      cx + rx * Math.sign(c) * Math.abs(c) ** (2 / p),
      cy + ry * Math.sign(s) * Math.abs(s) ** (2 / p),
    ]);
  }
  return o;
}
function tear(cx, cy, rx, ry) {
  const o = [];
  for (let i = 0; i < N; i++) {
    let a = -Math.PI / 2 + (2 * Math.PI * i) / N,
      c = Math.cos(a),
      s = Math.sin(a),
      x = rx * c,
      y = ry * s;
    if (s < 0) {
      x *= Math.min(1, ((1 + s) * 1.05) ** 0.62);
      y *= 1.32;
    }
    o.push([cx + x, cy + y + ry * 0.1]);
  }
  // keep the tip exactly on the axis and mirror the halves so it never leans
  o[0][0] = cx;
  for (let j = 1; j < N / 2; j++) {
    const L = o[j],
      R = o[N - j],
      dx = (L[0] - cx - (R[0] - cx)) / 2,
      yy = (L[1] + R[1]) / 2;
    o[j] = [cx + dx, yy];
    o[N - j] = [cx - dx, yy];
  }
  return o;
}
function bb(p) {
  let x0 = 1e9,
    x1 = -1e9,
    y0 = 1e9,
    y1 = -1e9;
  p.forEach((q) => {
    x0 = Math.min(x0, q[0]);
    x1 = Math.max(x1, q[0]);
    y0 = Math.min(y0, q[1]);
    y1 = Math.max(y1, q[1]);
  });
  return [(x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2];
}
const FACES = ["idle", "curious", "happy", "thinking", "surprised", "talking", "drowsy", "sleepy"],
  cache = {};
export function configuredLiquidStates(o) {
  const key = `${o.shape}|${o.eyes}`;
  if (cache[key]) return cache[key];
  const S = JSON.parse(JSON.stringify(BASE)),
    e = EY[o.eyes],
    k = SHSC[o.shape] || 1,
    sp = e.sp * SHSP[o.shape],
    dy = e.dy + SHDY[o.shape];
  FACES.forEach((n) => {
    const s = S[n],
      b = bb(s.body);
    s.body = SH[o.shape](b[0], b[1], b[2], b[3]);
    ["eyeL", "eyeR", "mouth", "cheekL", "cheekR"].forEach((f) => {
      const c = bb(s[f]),
        nx = 500 + (c[0] - 500) * sp;
      s[f] = s[f].map((q) => [nx + (q[0] - c[0]) * e.sx * k, c[1] + dy + (q[1] - c[1]) * e.sy * k]);
    });
    if (o.eyes === "cyclops") {
      const c = bb(s.cheekR);
      s.cheekR = s.cheekR.map((q) => [
        c[0] + 28 + (q[0] - c[0]) * 0.45,
        c[1] + 40 + (q[1] - c[1]) * 0.45,
      ]);
    }
    s.ring = e.ring ? 1 : 0;
  });
  Object.keys(S).forEach((n) => {
    if (S[n].ring == null) S[n].ring = 0;
  });
  cache[key] = S;
  return S;
}

export function liquidVariant(o) {
  return {
    ...MO[o.motion],
    tipfix: o.shape === "droplet" ? 1 : 0,
    drip: o.extra.includes("drip") ? 1 : 0,
    orbit: o.extra.includes("orbit") ? 1 : 0,
  };
}
