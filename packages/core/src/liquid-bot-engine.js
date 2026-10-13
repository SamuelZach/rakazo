// Liquid mascot engine adapted from the supplied configurable kit. No DOM or network dependencies.
export function makeEngine(D, bodyColor, eyeColor, namespace) {
  const S = D.states,
    PI = Math.PI,
    VC = D.variant || {};
  const FACES = [
      "idle",
      "curious",
      "happy",
      "thinking",
      "surprised",
      "talking",
      "drowsy",
      "sleepy",
    ],
    isFace = (n) => FACES.includes(n);
  const DL = {
    body: 0,
    eyeL: 0.04,
    eyeR: 0.07,
    mouth: 0.1,
    cheekL: 0.08,
    cheekR: 0.11,
    ball: 0.12,
  };
  const FEAT = ["eyeL", "eyeR", "mouth", "cheekL", "cheekR", "ball"];
  const FADE = new Set(["cheek", "stalk", "rays", "zz", "squig", "dotc", "sharp", "ring"]);
  const smooth = (t) => t * t * t * (t * (6 * t - 15) + 10),
    clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const spring = (x) => {
    x = clamp(x);
    x = 0.5 * x + 0.5 * x * x * (3 - 2 * x);
    const c = 0.9;
    return 1 + (c + 1) * (x - 1) ** 3 + c * (x - 1) ** 2;
  };
  const bump = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin((PI * (t - a)) / (b - a)) ** 2);
  const mix = (a, b, t) => (Array.isArray(a) ? a.map((x, i) => mix(x, b[i], t)) : a + (b - a) * t);
  const clone = (s) => JSON.parse(JSON.stringify(s));
  const cen = (p) => [0, 1].map((i) => p.reduce((a, q) => a + q[i], 0) / p.length);
  const scale = (p, c, sx, sy = sx) =>
    p.map((q) => [c[0] + (q[0] - c[0]) * sx, c[1] + (q[1] - c[1]) * sy]);
  const move = (p, dx, dy) => p.map((q) => [q[0] + dx, q[1] + dy]);
  const moveTo = (p, c) => {
    const o = cen(p);
    return move(p, c[0] - o[0], c[1] - o[1]);
  };
  const EDGE = [425, 610]; // where bubble droplets pinch off
  function lerp(a, b, t, mode, fromName, toName) {
    const o = {},
      swapF = isFace(fromName) !== isFace(toName);
    for (const k in b) {
      if (k in DL) {
        const drip =
          ["cheekL", "cheekR", "ball"].includes(k) &&
          (toName === "bubble" || fromName === "bubble");
        if (drip && toName === "bubble") {
          const st = scale(moveTo(b[k], EDGE), EDGE, 0.7);
          const u = spring((t - 0.3 - DL[k]) / 0.6);
          o[k] = t < 0.3 + DL[k] ? scale(st, EDGE, 0) : mix(st, b[k], u);
        } else if (drip) {
          const en = scale(moveTo(a[k], EDGE), EDGE, 0.7),
            u = smooth(clamp(t / 0.55));
          o[k] = u < 1 ? mix(a[k], en, u) : scale(en, EDGE, 0);
        } else if ((mode === "current" || mode === "pour") && FEAT.includes(k))
          o[k] = swapF
            ? t < 0.5
              ? scale(a[k], cen(a[k]), 1 - smooth(clamp(t / 0.5)))
              : scale(b[k], cen(b[k]), smooth(clamp((t - 0.45) / 0.55)))
            : mix(a[k], b[k], smooth(t));
        else if (mode === "current" || mode === "pour")
          o[k] = mix(a[k], b[k], smooth(clamp((t - 0.05) / 0.85)));
        else if (mode === "swish" && FEAT.includes(k))
          o[k] =
            t < 0.45
              ? scale(a[k], cen(a[k]), 1 - smooth(clamp((t - 0.15) / 0.25)))
              : scale(b[k], cen(b[k]), Math.max(0, spring((t - 0.55) / 0.3)));
        else if (mode === "swish") o[k] = mix(a[k], b[k], smooth(clamp((t - 0.45) / 0.15)));
        else if (swapF && FEAT.includes(k))
          o[k] =
            t < 0.5
              ? scale(a[k], cen(a[k]), 1 - smooth(clamp(t / 0.35)))
              : scale(b[k], cen(b[k]), Math.max(0, spring((t - 0.6) / 0.4)));
        else if (swapF) o[k] = mix(a[k], b[k], spring((t - 0.15) / 0.7));
        else o[k] = mix(a[k], b[k], spring((t - DL[k]) / 0.86));
      } else if (FADE.has(k))
        o[k] = a[k] + (b[k] - a[k]) * smooth(b[k] < a[k] ? clamp(t / 0.3) : clamp((t - 0.7) / 0.3));
      else if (mode === "swish" && k === "tilt")
        o[k] = mix(a[k], b[k], smooth(clamp((t - 0.4) / 0.2)));
      else o[k] = mix(a[k], b[k], smooth(t));
    }
    return o;
  }
  const pulse = (lt, k, per = 1.2) => Math.max(0, Math.sin(2 * PI * (lt / per - k * 0.17))) ** 2;
  function keys(t, K) {
    t = t % K[K.length - 1][0];
    for (let i = 1; i < K.length; i++)
      if (t <= K[i][0]) {
        const u = smooth((t - K[i - 1][0]) / (K[i][0] - K[i - 1][0]));
        return K[i - 1][1] + (K[i][1] - K[i - 1][1]) * u;
      }
    return 0;
  }
  function blinkK(lt, wins) {
    for (const [a, b] of wins) {
      if (lt >= a && lt <= b) return 1 - 0.95 * Math.sin((PI * (lt - a)) / (b - a));
    }
    return 1;
  }
  function wave(d) {
    return 28 * Math.sin((d / 250) * 6 * PI) * Math.sin((PI * d) / 250);
  }
  function anim(name, lt) {
    const s = clone(S[name]);
    if (isFace(name)) {
      const bot = Math.max(...s.body.map((q) => q[1])),
        b = Math.sin((2 * PI * lt) / 2.8);
      s.body = scale(s.body, [500, bot], 1 - 0.008 * b, 1 + 0.016 * b);
      FEAT.forEach((k) => {
        s[k] = move(s[k], 0, -6 * b);
      });
      // ---- eye controller ----
      let GX = [
          [0, 0],
          [1, 0],
        ],
        GY = [
          [0, 0],
          [1, 0],
        ],
        per = 1,
        gs = 24,
        lidL = 0,
        lidR = 0,
        szL = 1,
        szR = 1,
        wid = 1,
        bw = [],
        eyeDy = 0,
        eyeSq = 0;
      const T = name === "curious" ? lt % 11.5 : lt;
      if (name === "idle") {
        per = 4.2;
        GX = [
          [0, 0],
          [0.95, 0],
          [1.12, -1],
          [1.65, -1],
          [1.8, 1],
          [2.4, 1],
          [2.58, 0],
          [4.2, 0],
        ];
        GY = [
          [0, 0],
          [2.9, 0],
          [3.05, -0.6],
          [3.6, -0.6],
          [3.78, 0],
          [4.2, 0],
        ];
        bw = [
          [0.55, 0.73],
          [2.75, 2.93],
          [3.05, 3.23],
        ].map((w) => w.map((x) => x + Math.floor(lt / 4.2) * 4.2));
        s.tilt += 0.035 * Math.sin((2 * PI * lt) / 2.4);
      }
      if (name === "curious") {
        per = 11.5;
        gs = 46;
        GX = [
          [0, 0],
          [1, 0],
          [1.16, -1],
          [2.3, -1],
          [2.46, 1],
          [3.4, 1],
          [3.6, 0.3],
          [4.6, 0.3],
          [4.85, 0],
          [5.9, 0],
          [6.3, 1],
          [7.6, 1],
          [8.2, 0],
          [8.8, 0],
          [8.95, -0.8],
          [9.9, -0.8],
          [10.1, 0],
          [11.5, 0],
        ];
        GY = [
          [0, 0],
          [3.4, 0],
          [3.6, -1],
          [4.6, -1],
          [4.85, 0],
          [5.9, 0],
          [6.3, -0.25],
          [7.6, -0.25],
          [8.2, 0],
          [11.5, 0],
        ];
        s.tilt += keys(T, [
          [0, 0],
          [1, 0],
          [1.35, -0.04],
          [2.3, -0.04],
          [2.7, 0.06],
          [3.4, 0.06],
          [3.8, -0.05],
          [4.6, -0.05],
          [5, 0],
          [5.9, 0],
          [6.5, 0.13],
          [7.6, 0.13],
          [8.4, 0],
          [9, 0],
          [9.3, -0.05],
          [9.9, -0.05],
          [10.2, 0],
          [11.5, 0],
        ]);
        s.ox += keys(T, [
          [0, 0],
          [5.9, 0],
          [6.5, 70],
          [7.6, 70],
          [8.4, 0],
          [11.5, 0],
        ]);
        const wv = keys(T, [
          [0, 0],
          [6.95, 0],
          [7.08, 1],
          [7.5, 1],
          [7.95, 0],
          [11.5, 0],
        ]);
        wid = 1 + 0.22 * wv;
        eyeDy = -10 * wv;
        const sus = keys(T, [
          [0, 0],
          [8.95, 0],
          [9.15, 1],
          [9.8, 1],
          [10.05, 0],
          [11.5, 0],
        ]);
        lidL = 0.42 * sus;
        lidR = 0.55 * sus; // suspicious narrow
        szR =
          1 +
          0.08 *
            keys(T, [
              [0, 0],
              [6.3, 0],
              [6.6, 1],
              [7.6, 1],
              [8.1, 0],
              [11.5, 0],
            ]);
        bw = [
          [5.1, 5.26],
          [5.4, 5.56],
          [10.6, 10.78],
        ];
        let q = 0;
        for (const te of [1, 2.3, 3.4, 4.6, 5.9, 7.08, 7.6, 8.95]) {
          const d = T - te;
          if (d > 0) q += Math.exp(-5 * d) * Math.sin(14 * d);
        }
        s.body = ripple(s.body, 9 * q, T * 2);
        s.sqq = q;
      }
      if (name === "thinking") {
        per = 99;
        GX = [
          [0, 0.2],
          [1.2, 0.45],
          [2.4, 0.2],
          [3.6, 0.45],
        ];
        GY = [
          [0, -0.2],
          [1.8, -0.45],
          [3.6, -0.2],
        ];
        lidL = 0.28;
        szR = 1.06;
        bw = [[1.2, 1.36]];
      }
      if (name === "surprised") {
        const w = Math.exp(-4 * lt);
        wid = 1 + 0.12 * w * Math.cos(10 * lt);
        eyeDy = -14 * w * Math.abs(Math.sin(9 * lt));
        bw = [[1.3, 1.42]];
      }
      if (name === "talking") {
        const r = Math.abs(Math.sin(PI * lt * 2.4));
        eyeDy = -9 * r;
        eyeSq = 0.14 * Math.sin(PI * lt * 2.4 + 0.6) ** 2;
        GX = [
          [0, 0],
          [0.8, 0.25],
          [1.6, -0.2],
          [2.4, 0],
        ];
        per = 2.4;
        bw = [[1.25, 1.4]];
        s.tilt += 0.04 * Math.sin(PI * lt * 1.2);
      }
      if (name === "happy") {
        s.oy = -22 * Math.abs(Math.sin((PI * lt) / 0.5)) * Math.exp(-lt * 0.6);
        eyeDy = -4 * Math.abs(Math.sin((PI * lt) / 0.5));
      }
      if (name === "drowsy") {
        const c = lt % 4.2,
          cyc = Math.floor(lt / 4.2);
        const ld = keys(c, [
          [0, 0],
          [1.4, 0.08],
          [2.3, 0.62],
          [2.55, 0.6],
          [2.72, -0.05],
          [3.0, 0.06],
          [4.2, 0],
        ]);
        lidL = ld;
        lidR = ld * 1.08;
        const nod = keys(c, [
          [0, 0],
          [1.6, 0],
          [2.4, 22],
          [2.65, -8],
          [3.0, 0],
          [4.2, 0],
        ]);
        FEAT.forEach((k) => {
          s[k] = move(s[k], 0, nod * 0.6);
        });
        s.oy += nod * 0.5;
        s.tilt += 0.05 * Math.sin((2 * PI * lt) / 5);
        GX = [
          [0, 0],
          [2, -0.15],
          [4.2, 0],
        ];
        per = 4.2;
        if (cyc % 2 === 1 && c > 0.2 && c < 1.7) {
          const y = Math.sin((PI * (c - 0.2)) / 1.5);
          s.body = scale(s.body, [500, bot], 1 - 0.05 * y, 1 + 0.1 * y);
          lidL = lidR = Math.max(lidL, 0.75 * y);
        }
      }
      const g = (tt) => [keys(((tt % per) + per) % per, GX), keys(((tt % per) + per) % per, GY)];
      const g0 = g(T),
        gp = g(T - 0.1),
        gf = g(T + 0.12),
        gx = g0[0] + (g0[0] - gp[0]) * 0.55,
        gy = g0[1] + (g0[1] - gp[1]) * 0.55; // follow-through overshoot
      const vx = (g0[0] - gp[0]) * 10,
        vy = (g0[1] - gp[1]) * 10,
        ant = clamp(Math.hypot(gf[0] - g0[0], gf[1] - g0[1]) * 1.6); // velocity + anticipation
      const stx = 1 + 0.12 * clamp(Math.abs(vx) / 6),
        sty = 1 - 0.08 * clamp(Math.abs(vx) / 6) + 0.08 * clamp(Math.abs(vy) / 6);
      [
        ["eyeL", "cheekL", lidL, szL],
        ["eyeR", "cheekR", lidR, szR],
      ].forEach(([e, h, lid, sz]) => {
        const c = cen(s[e]),
          k = blinkK(lt, bw) * (1 - 0.22 * ant) * (1 - eyeSq);
        let E = move(
          scale(s[e], c, wid * sz * stx * (1 + 0.06 * (1 - k)), wid * sz * sty * k),
          gs * gx,
          gs * 0.75 * gy + eyeDy,
        );
        if (lid > 0.01) {
          const ys = E.map((q) => q[1]),
            y0 = Math.min(...ys),
            y1 = Math.max(...ys),
            lim = y0 + clamp(lid, 0, 0.95) * (y1 - y0);
          E = E.map((q) => [q[0], Math.max(q[1], lim)]);
        }
        s[e] = E;
        const hk = k * clamp(1 - lid * 1.8);
        s[h] = move(
          scale(s[h], c, wid * sz * hk, wid * sz * hk),
          gs * gx * 1.25,
          gs * 0.9 * gy + eyeDy,
        );
      });
      s.mouth = move(s.mouth, gs * gx, gs * 0.75 * gy);
    }
    if (name === "bubble") {
      s.body = move(s.body, 0, -6 * Math.sin((2 * PI * lt) / 3));
      [
        ["cheekR", 0],
        ["cheekL", 1.3],
        ["ball", 2.5],
      ].forEach(([k, ph]) => {
        s[k] = move(
          s[k],
          4 * (Math.sin((2 * PI * lt) / 2.6 + ph) - Math.sin(ph)),
          9 * (Math.sin((2 * PI * lt) / 2.1 + ph) - Math.sin(ph)),
        );
      });
      ["eyeL", "eyeR", "mouth"].forEach((k, i) => {
        const p = pulse(lt, i);
        s[k] = scale(s[k], cen(s[k]), 1 + 0.45 * p);
      });
    }
    if (name === "chat")
      ["eyeL", "eyeR", "mouth"].forEach((k, i) => {
        s[k] = move(s[k], 0, -22 * pulse(lt, i, 1));
      });
    if (name === "bulb") {
      const ph = lt % 3;
      s.lit = (ph > 0.4 && ph < 0.5) || (ph > 0.6 && ph < 0.8) || (ph > 0.95 && ph < 1.0) ? 0 : 1;
    }
    if (name === "pen") {
      const ph = lt % 3.2,
        L = 250;
      let d = 0,
        ox = 0,
        oy = 0;
      if (ph >= 0.08 && ph < 1.4) {
        d = L * smooth((ph - 0.08) / 1.32);
        ox = d;
        oy = wave(d);
      } else if (ph >= 1.4 && ph < 1.9) {
        const u = smooth((ph - 1.4) / 0.5);
        d = L;
        ox = L * (1 - u);
        oy = wave(L) * (1 - u) - 30 * Math.sin(PI * u);
      } else if (ph >= 1.9) d = L;
      s.squigD = d;
      s.ox = ox;
      s.oy = oy;
      s.squig = ph > 2.2 ? 1 - smooth((ph - 2.2) / 0.6) : 1;
    }
    return s;
  }

  // water-surface ripple: radial offset of body outline
  function ripple(body, amp, ph) {
    if (Math.abs(amp) < 0.05) return body;
    const c = cen(body),
      n = body.length;
    return body.map((q, i) => {
      const a = (2 * PI * i) / n,
        d = Math.hypot(q[0] - c[0], q[1] - c[1]) || 1,
        o = amp * (0.6 * Math.sin(3 * a + ph) + 0.4 * Math.sin(5 * a - 1.3 * ph));
      return [q[0] + ((q[0] - c[0]) / d) * o, q[1] + ((q[1] - c[1]) / d) * o];
    });
  }
  function path(p) {
    let n = p.length,
      f = (x) => x.toFixed(1),
      d = `M${f(p[0][0])},${f(p[0][1])}`;
    for (let i = 0; i < n; i++) {
      const a = p[(i - 1 + n) % n],
        b = p[i],
        c = p[(i + 1) % n],
        e = p[(i + 2) % n];
      d += `C${f(b[0] + (c[0] - a[0]) / 6)},${f(b[1] + (c[1] - a[1]) / 6)} ${f(c[0] - (e[0] - b[0]) / 6)},${f(c[1] - (e[1] - b[1]) / 6)} ${f(c[0])},${f(c[1])}`;
    }
    return `${d}Z`;
  }
  // returns 3 layers: back (glow/rays/ink/z), goo (white liquid: body+droplets), feat (eyes, dots, highlights)
  function ribbons(t) {
    if (t == null || t <= 0 || t >= 1) return "";
    let out = "";
    const fade = 1 - smooth(clamp((t - 0.55) / 0.45));
    [
      [330, 26, 0, 0.07],
      [420, 50, 1.7, 0.0],
      [505, 66, 3.1, 0.04],
      [590, 40, 4.4, 0.02],
      [675, 28, 5.6, 0.09],
    ].forEach(([x0, W, ph, dl]) => {
      const uu = smooth(clamp((t - dl) / (1 - dl))),
        yh = 1350 - 2400 * uu,
        L = 900,
        N = 40,
        lw = [],
        rw = [];
      for (let i = 0; i <= N; i++) {
        const sN = i / N,
          y = yh + L * sN,
          x = x0 + 9 * Math.sin(y / 160 + ph + t * 2),
          w =
            (W *
              Math.sin(PI * sN) ** 0.7 *
              (1 + 0.22 * Math.sin(9 * sN + ph)) *
              (0.15 + 0.85 * fade)) /
            2;
        lw.push([x - w, y]);
        rw.push([x + w, y]);
      }
      out += `<path d="M${lw.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L")} L${rw
        .reverse()
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .join(" L")}Z" fill="${bodyColor}" transform="rotate(42 500 560)"/>`;
    });
    return out;
  }
  const PATH = {
    current: {
      x: [
        [0, 0],
        [0.28, -95],
        [0.62, 70],
        [1, 0],
      ],
      y: [
        [0, 0],
        [0.28, 65],
        [0.62, -55],
        [1, 0],
      ],
      st: 0.42,
    },
    pour: {
      x: [
        [0, 0],
        [0.3, -60],
        [0.65, 40],
        [1, 0],
      ],
      y: [
        [0, 0],
        [0.3, 40],
        [0.65, -28],
        [1, 0],
      ],
      st: 0.18,
    },
  };
  const pth = (m, t) => [keys(clamp(t), PATH[m].x), keys(clamp(t), PATH[m].y)];
  function wisps(w) {
    if (!w) return "";
    const { cx, cy, vx, vy, k } = w,
      sp = Math.hypot(vx, vy);
    if (k < 0.03 || sp < 1) return "";
    const ux = vx / sp,
      uy = vy / sp,
      px = -uy,
      py = ux;
    let o = "";
    [
      [-120, 0.7],
      [-40, 1],
      [50, 0.85],
      [125, 0.6],
    ].forEach(([off, len]) => {
      const L = (360 * len * k) / 0.42,
        bx = cx + px * off - ux * 150 * (1 - Math.abs(off) / 260),
        by = cy + py * off - uy * 150 * (1 - Math.abs(off) / 260),
        N = 14,
        a = [],
        b = [];
      for (let i = 0; i <= N; i++) {
        const s = i / N,
          x = bx - ux * L * s + px * 6 * Math.sin(s * 5 + off),
          y = by - uy * L * s + py * 6 * Math.sin(s * 5 + off),
          wd = 46 * (1 - s) ** 0.8;
        a.push([x + (px * wd) / 2, y + (py * wd) / 2]);
        b.push([x - (px * wd) / 2, y - (py * wd) / 2]);
      }
      o += `<path d="M${a.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L")} L${b
        .reverse()
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .join(" L")}Z" fill="${bodyColor}"/>`;
    });
    return o;
  }
  function layers(s, now, drops = []) {
    const th = s.tilt,
      rot = (x, y) => [
        500 + (x - 500) * Math.cos(th) - (y - 560) * Math.sin(th),
        560 + (x - 500) * Math.sin(th) + (y - 560) * Math.cos(th),
      ];
    const lit = clamp(s.lit),
      feat = lit < 0.5 ? bodyColor : eyeColor,
      sx = s.sx || 1,
      sy = s.sy || 1,
      fdx = s.fdx || 0;
    let back = "";
    if (s.rays > 0.01) {
      back += `<defs><radialGradient id="${namespace}-gl"><stop offset="0" stop-color="${bodyColor}" stop-opacity=".35"/><stop offset="1" stop-color="${bodyColor}" stop-opacity="0"/></radialGradient></defs><circle cx="${500 + s.ox}" cy="${440 + s.oy}" r="250" fill="url(#${namespace}-gl)" opacity="${(s.rays * lit).toFixed(2)}"/>`;
      for (let a = -180; a <= 0; a += 30) {
        const r = (a * PI) / 180,
          c = [500 + s.ox, 430 + s.oy];
        back += `<line x1="${c[0] + 250 * Math.cos(r)}" y1="${c[1] + 250 * Math.sin(r)}" x2="${c[0] + 305 * Math.cos(r)}" y2="${c[1] + 305 * Math.sin(r)}" stroke="${bodyColor}" stroke-width="16" stroke-linecap="round" opacity="${(s.rays * lit).toFixed(2)}"/>`;
      }
    }
    if (s.squig > 0.01 && s.squigD > 1) {
      const t0 = rot(500, 830);
      let d = `M${t0[0]},${t0[1]}`;
      for (let x = 0; x <= s.squigD; x += 4)
        d += ` L${(t0[0] + x).toFixed(1)},${(t0[1] + wave(x)).toFixed(1)}`;
      back += `<path d="${d}" stroke="${bodyColor}" stroke-width="12" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${s.squig.toFixed(2)}"/>`;
    }
    if (s.zz > 0.01) {
      for (let i = 0; i < 3; i++) {
        const p = (now / 3 + i / 3) % 1,
          x = 650 + 90 * p + 14 * Math.sin(p * 7),
          y = 400 - 250 * p,
          k = 24 + 34 * p;
        back += `<path d="M${x - k},${y - k} L${x + k},${y - k} L${x - k},${y + k} L${x + k},${y + k}" stroke="${bodyColor}" stroke-width="${9 + 6 * p}" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${(s.zz * Math.sin(PI * p)).toFixed(2)}"/>`;
      }
    }
    const tf = `${s.xf || ""} translate(${s.ox.toFixed(1)},${s.oy.toFixed(1)}) translate(500,775) scale(${sx.toFixed(3)},${sy.toFixed(3)}) translate(-500,-775) rotate(${((th * 180) / PI).toFixed(2)} 500 560)`;
    const goo =
      `<g transform="${tf}"><path d="${path(s.body)}" fill="${bodyColor}"/>` +
      ["cheekL", "cheekR", "ball"]
        .map(
          (k) =>
            `<path d="${path(s[k])}" fill="${bodyColor}" opacity="${k === "ball" ? 1 : clamp(s.cheek).toFixed(2)}"/>`,
        )
        .join("") +
      drops
        .map(
          (d) =>
            `<circle cx="${d[0].toFixed(1)}" cy="${d[1].toFixed(1)}" r="${d[2].toFixed(1)}" fill="${bodyColor}"/>`,
        )
        .join("") +
      `</g>` +
      wisps(s.wisp);
    const fs = (k) => move(s[k], fdx, 0);
    const ft =
      `<g transform="${tf}">` +
      (s.sharp > 0.01
        ? `<path d="${path(s.body)}" fill="${bodyColor}" opacity="${clamp(s.sharp).toFixed(2)}"/>`
        : "") +
      (lit < 0.99
        ? `<path d="${path(scale(s.body, cen(s.body), 0.955))}" fill="${eyeColor}" opacity="${(1 - lit).toFixed(2)}"/>`
        : "") +
      ["eyeL", "eyeR", "mouth"].map((k) => `<path d="${path(fs(k))}" fill="${feat}"/>`).join("") +
      ((s.ring || 0) > 0.02
        ? ["eyeL", "eyeR"]
            .map((k) => {
              const p = fs(k),
                ys = p.map((q) => q[1]),
                xs = p.map((q) => q[0]),
                h = Math.max(...ys) - Math.min(...ys),
                w = Math.max(...xs) - Math.min(...xs),
                m = Math.min(w, h);
              if (m < 34) return "";
              const c = cen(p),
                kx = 1 - (22 / w) * 2,
                ky = 1 - (22 / h) * 2;
              return `<path d="${path(scale(p, c, Math.max(0.05, kx), Math.max(0.05, ky)))}" fill="${bodyColor}" opacity="${clamp(s.ring * Math.min(1, (m - 34) / 20)).toFixed(2)}"/>`;
            })
            .join("")
        : "") +
      ["cheekL", "cheekR"]
        .map(
          (k) =>
            `<path d="${path(fs(k))}" fill="${bodyColor}" opacity="${clamp(s.cheek).toFixed(2)}"/>`,
        )
        .join("") +
      `<path d="${path(s.cheekL)}" fill="${feat}" opacity="${s.rays > 0.5 ? clamp(s.rays) : 0}"/></g>` +
      ribbons(s.swish);
    return { back, goo, feat: ft };
  }
  const GOO = `<filter id="${namespace}-goo" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="10"/><feColorMatrix values="1 0 0 0 0 0 1 0 0 0 0 0 1 0 0 0 0 0 24 -11"/></filter>`;
  const wrap = (inner, size, bg) =>
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="150 150 700 700">${bg ? `<rect width="1000" height="1000" fill="${bg}"/>` : ""}${inner}</svg>`;
  function render(s, now, size, bg, drops) {
    const L = layers(s, now, drops);
    return wrap(
      `<defs>${GOO}</defs>${L.back}<g filter="url(#${namespace}-goo)">${L.goo}</g>${L.feat}`,
      size,
      bg,
    );
  }
  function vmotion(s, now) {
    const P = 2 * PI;
    if (VC.tipfix) s.tilt *= 0.45;
    if (VC.drift) {
      s.ox += 16 * Math.sin((P * now) / 6.3);
      s.oy += -14 * Math.sin((P * now) / 4.4);
      s.tilt += 0.04 * Math.sin((P * now) / 5.1);
    }
    if (VC.bounce && s.cheek > 0.5 && !s.sharp) {
      const b = Math.abs(Math.sin((PI * now) / 0.62)) ** 1.6;
      s.oy -= 10 * b;
      s.sy = (s.sy || 1) * (1 - 0.035 * (1 - b));
      s.sx = (s.sx || 1) * (1 + 0.03 * (1 - b));
    }
    if (VC.jelly) {
      const j = Math.sin((P * now) / 0.95);
      s.sx = (s.sx || 1) * (1 + 0.028 * j);
      s.sy = (s.sy || 1) * (1 - 0.028 * j);
      s.body = ripple(s.body, 5, now * 2.2);
    }
  }
  function vdrops(s, now) {
    const o = [],
      c = cen(s.body);
    if (VC.drip) {
      const bot = Math.max(...s.body.map((q) => q[1])),
        ph = (now % 2.6) / 2.6;
      if (ph < 0.6) {
        const g = smooth(ph / 0.6);
        o.push([500, bot - 4 + 20 * g, 4 + 14 * g]);
      } else {
        const u = (ph - 0.6) / 0.4;
        o.push([500, bot + 16 + 170 * u * u, 18 * (1 - u)]);
      }
    }
    if (VC.orbit) {
      const a = (2 * PI * now) / 3.4,
        rx = 372,
        ry = 105,
        d = Math.sin(a);
      o.push([c[0] + rx * Math.cos(a), c[1] - 30 + ry * d, 15 + 5 * d]);
    }
    return o;
  }
  function Player() {
    let from = clone(S.idle),
      to = "idle",
      prev = "idle",
      t0 = -99,
      dur = 1,
      arrive = -99,
      mode = "slosh",
      drops = [];
    // droplet: peels off body edge along dir, arcs out and falls back in (local coords)
    const dropPos = (now) =>
      drops
        .map((d) => {
          const u = (now - d.t) / d.dur;
          if (u < 0 || u > 1) return null;
          const h = 4 * u * (1 - u);
          return [d.x + d.dx * h, d.y + d.dy * h, d.r * (1 - 0.2 * h)];
        })
        .filter(Boolean);
    const p = {
      name: () => to,
      state(now) {
        let s;
        if (now < t0 + dur) {
          const t = (now - t0) / dur;
          s = lerp(from, S[to], t, mode, prev, to);
          if (mode === "current" || mode === "pour") {
            const [x, y] = pth(mode, t),
              e = 0.01,
              [x2, y2] = pth(mode, t + e),
              vx = (x2 - x) / (e * dur),
              vy = (y2 - y) / (e * dur),
              sp = Math.hypot(vx, vy);
            const k = Math.min(PATH[mode].st, (((sp / 1400) * PATH[mode].st) / 0.42) * 1.0),
              ang = (Math.atan2(vy, vx) * 180) / PI,
              cx = 500 + x,
              cy = 560 + y;
            s.xf = `translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${ang.toFixed(1)}) scale(${(1 + k).toFixed(3)},${(1 / Math.sqrt(1 + k)).toFixed(3)}) rotate(${(-ang).toFixed(1)}) translate(-500,-560)`;
            if (mode === "current")
              s.wisp = { cx, cy, vx, vy, k: k * (t < 0.8 ? 1 : 0) * Math.min(1, t / 0.15) };
            else {
              s.tilt += 0.45 * Math.sin(2 * PI * t) * (1 - t);
            }
            s.body = ripple(s.body, (mode === "pour" ? 14 : 7) * Math.sin(PI * t), t * 10);
          } else if (mode === "swish") {
            s.swish = t;
            const k = bump(t, 0.08, 0.95);
            s.ox += -75 * k;
            s.oy += -22 * k;
            s.sy = 1 - 0.09 * k;
            s.sx = 1 + 0.05 * k;
            s.tilt -= 0.06 * k;
            s.body = ripple(s.body, 5 * Math.sin(PI * t), t * 9);
          } else {
            const sy =
              1 - 0.07 * bump(t, 0, 0.35) + 0.05 * bump(t, 0.25, 0.75) - 0.05 * bump(t, 0.7, 1);
            s.sy = sy;
            s.sx = 1 / Math.sqrt(sy);
            if (mode === "hop") s.oy -= 55 * bump(t, 0.18, 0.88);
            s.body = ripple(s.body, 6 * Math.sin(PI * t), 8 * t);
          }
        } else {
          const lt = now - arrive;
          s = anim(to, lt);
          const w = Math.exp(-4.5 * lt);
          s.body = ripple(s.body, 11 * w * Math.sin(16 * lt), lt * 3);
          const q = w * Math.sin(12 * lt) + (s.sqq || 0) * 0.8;
          s.sy = 1 - 0.04 * q;
          s.sx = 1 + 0.03 * q;
        }
        vmotion(s, now);
        return s;
      },
      drops: (now) => dropPos(now),
      go(n, now, d = 1.0, m) {
        from = p.state(now);
        delete from.sx;
        delete from.sy;
        delete from.fdx;
        delete from.xf;
        delete from.wisp;
        prev = to;
        to = n;
        t0 = now;
        dur = d;
        arrive = now + d;
        mode = m || (n === "happy" ? "hop" : "flow");
        drops = drops.filter((x) => now - x.t < 2);
        const top = Math.min(...S[n].body.map((q) => q[1]));
        if (mode === "flow" || mode === "hop" || mode === "pour") {
          (mode === "hop"
            ? [
                [-0.35, 22],
                [0, 28],
                [0.4, 18],
              ]
            : [
                [-0.25, 18],
                [0.3, 15],
              ]
          ).forEach(([a, r], i) => {
            drops.push({
              t: now + (0.7 + i * 0.05) * d,
              dur: 0.42 + i * 0.05,
              x: 500 + a * 230,
              y: top + 38,
              dx: a * 50,
              dy: -(55 + 25 * (1 - Math.abs(a))),
              r,
              side: 0,
            });
          });
        }
      },
      svg(now, size = 1000, bg = null) {
        const s = p.state(now);
        return render(s, now, size, bg, dropPos(now).concat(vdrops(s, now)));
      },
      layers(now) {
        const s = p.state(now);
        return layers(s, now, dropPos(now).concat(vdrops(s, now)));
      },
    };
    return p;
  }
  return { Player };
}
