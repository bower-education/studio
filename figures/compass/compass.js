/**
 * Compass: five nested rings on a low round base around a centre pin, like the
 * dials of a mariner's compass. One ring per dimension, innermost first. Each
 * rim carries one notch, its needle. The pointer is projected onto each ring's
 * own rest top: its distance picks the ring, its angle sets the bearing. The
 * chosen ring turns its notch to the bearing and goes bright; the others turn
 * part of the way, less the farther they sit, staggered by distance. The slider
 * is how far the others follow.
 */
const {
  Cam, clamp, fit, proj, facing, rrect, prism, seg, solid, put, mk, flatDot, place,
  spring, stepS, tween, tset, tval, tdone, register, pointer, unproj, disposer, r2,
} = HL;

const NAMES = ["parenting", "emotional", "philosophy", "pace", "pod"];
const REST = [0.7, 3.6, 5.2, 1.9, 4.3]; // uneven, slightly scattered
const R = [24, 40, 56, 72, 88], Z = [15, 12, 9, 6, 3], BASE = 98, STEP = 50;
const TAU = Math.PI * 2;

function mount({ stage, svg, read }, value) {
  const bag = disposer();
  const C = Cam(45, 0.5, 1.5);
  fit(C, [[-BASE, -BASE, -5], [BASE, BASE, -5], [BASE, -BASE, -5], [-BASE, BASE, -5], [0, 0, 18]], 200, 166);
  const P = proj(C), front = facing(C);
  let follow = value, act = -1, last = -1;

  const g = mk("g", {}, svg);
  const ring = (r, b) => [rrect(-r, -r, r, r, r, 14), rrect(-r + b, -r + b, r - b, r - b, r - b * 1, 14)];
  const [br, bi] = ring(BASE, 2);
  put(solid(g), prism(P, front, br, bi, -5, 0));

  const rs = [];
  for (let i = 4; i >= 0; i--) {
    const [rr, ri] = ring(R[i], 1.6);
    const el = solid(g);
    put(el, prism(P, front, rr, ri, 0, Z[i]));
    const tick = mk("path", { class: "sil nf" }, g), tip = flatDot(g, C, 1.5, "dot m");
    rs[i] = { el, tick, tip, sp: spring(0, { eps: 0.002 }), w: tween(0), drawn: NaN };
  }
  const pin = flatDot(g, C, 2.4, "dot");
  place(pin, P(0, 0, Z[0]));

  function draw(i, a) {
    const s = rs[i], c = Math.cos(a), n = Math.sin(a), z = Z[i];
    s.tick.setAttribute("d", seg(P(c * (R[i] - 8), n * (R[i] - 8), z), P(c * (R[i] - 2), n * (R[i] - 2), z)));
    place(s.tip, P(c * (R[i] - 2), n * (R[i] - 2), z));
  }
  const ang = (i, now) => REST[i] + rs[i].sp.x * tval(rs[i].w, now);
  rs.forEach((_, i) => draw(i, REST[i]));

  const B = register(stage, (dt, now) => {
    let m = false;
    rs.forEach((s, i) => {
      if (stepS(s.sp, dt) || !tdone(s.w, now)) m = true;
      const a = r2(ang(i, now) * 100);
      if (a !== s.drawn) { s.drawn = a; draw(i, ang(i, now)); }
    });
    return m;
  });
  bag.add(B.unregister);

  function weight(i, c) { return i === c ? 1 : clamp(follow * (1 - 0.22 * (Math.abs(i - c) - 1)), 0, 1); }
  function retarget(c, th) {
    const now = performance.now(), from = c >= 0 ? c : last;
    rs.forEach((s, i) => {
      if (c >= 0) {
        let d = th - REST[i];
        while (d - s.sp.x > Math.PI) d -= TAU;
        while (d - s.sp.x < -Math.PI) d += TAU;
        s.sp.t = d;
      }
      tset(s.w, c >= 0 ? weight(i, c) : 0, now, from >= 0 ? Math.abs(i - from) * STEP : 0);
      s.el.sil.classList.toggle("hi", i === c); s.tick.classList.toggle("hi", i === c);
      s.tip.setAttribute("class", i === c ? "dot" : "dot m");
    });
    pin.setAttribute("class", c >= 0 ? "dot m" : "dot");
    if (c >= 0) last = c;
    act = c;
    read.textContent = c >= 0 ? NAMES[c] : "rest";
    B.wake();
  }
  // Each ring is tested on its own rest top, never on the pose on screen.
  function pick(p) {
    for (let i = 0; i < 5; i++) {
      const u = unproj(C, p[0], p[1], Z[i]), d = Math.hypot(u[0], u[1]);
      if (d >= (i ? R[i - 1] : 0) && d < R[i]) return [i, Math.atan2(u[1], u[0])];
    }
    return [-1, 0];
  }
  bag.add(pointer(stage, {
    move: (p) => { const [c, th] = pick(p); retarget(c, th); },
    leave: () => retarget(-1, 0),
  }));
  bag.add(() => svg.replaceChildren());

  return { set: (v) => { follow = v; if (act >= 0) retarget(act, REST[act] + rs[act].sp.t); }, destroy: bag.dispose };
}

hairline({
  name: "compass",
  means: "Five rings turn on a dial: the one the pointer picks aims at it, and the rest follow in turn.",
  rules: [1, 2, 5, 9],
  range: [0.15, 0.45, 0.8],
  tour: [[128, 146], [296, 152], [178, 214], null],
  mount,
});
