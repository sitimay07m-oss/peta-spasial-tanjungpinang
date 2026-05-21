// ============================================================
// KONTRIBUSI: SITI UMAYAH - 2401020018
// BAGIAN: Generate Peta Acak + Render SVG Vector
// MATA KULIAH: Grafika Komputer - UMRAH 2026
// ============================================================

const MAP_W = 2800, MAP_H = 2000, GRID_COLS = 10, GRID_ROWS = 8;
const CELL_W = MAP_W / GRID_COLS, CELL_H = MAP_H / GRID_ROWS;

const NAMA_JALAN = [
  'Jl. Merdeka','Jl. Sudirman','Jl. Diponegoro','Jl. Gatot Subroto',
  'Jl. Ahmad Yani','Jl. Hang Tuah','Jl. Raja Ali Haji','Jl. Bintan',
  'Jl. Trikora','Jl. Usman Harun','Jl. Kamboja','Jl. Melati',
  'Jl. Pahlawan','Jl. Veteran','Jl. Kartini','Jl. Pemuda',
  'Jl. Mawar','Jl. Kenanga','Jl. Seroja','Jl. Teratai'
];

// ── FUNGSI BANTU ──────────────────────────────────────────
function rnd(a, b) { return a + Math.random() * (b - a); }
function rndInt(a, b) { return Math.floor(rnd(a, b + 1)); }
function mkEl(tag) { return document.createElementNS('http://www.w3.org/2000/svg', tag); }
function mkG() { return mkEl('g'); }

// ── GENERATE PETA ACAK ────────────────────────────────────
// Fungsi utama untuk membuat peta acak
// Algoritma:
// 1. Buat node (titik persimpangan) di setiap sel grid dengan offset acak
// 2. Hubungkan node dengan edge (jalan) menggunakan kurva Bezier kubik
// 3. Pastikan semua node terhubung (tidak ada jalan terisolasi)
function generateMap() {
  stopAnim();
  setStatus('Membuat peta acak...');

  // Langkah 1: Buat node di setiap sel grid
  // Setiap node diberi posisi acak dalam sel (jitter ±22%)
  // sehingga peta terlihat organik dan tidak terlalu kaku
  nodes = [];
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      nodes.push({
        id: r * GRID_COLS + c,
        x: (c + 0.5 + rnd(-0.22, 0.22)) * CELL_W,
        y: (r + 0.5 + rnd(-0.22, 0.22)) * CELL_H
      });
    }
  }

  edges = []; graph = {};
  nodes.forEach(n => graph[n.id] = []);
  const names = [...NAMA_JALAN].sort(() => Math.random() - 0.5);
  let ni = 0;

  // Langkah 2: Buat edge (jalan) antar node
  // Setiap jalan dibuat sebagai kurva Bezier kubik:
  // M na.x na.y  C cx1 cy1, cx2 cy2, nb.x nb.y
  // cx1, cx2 = control point yang diberi offset acak
  // sehingga jalan tidak lurus melainkan melengkung
  function addEdge(a, b) {
    if (graph[a].some(e => e.to === b)) return;
    const na = nodes[a], nb = nodes[b];
    const dx = nb.x - na.x, dy = nb.y - na.y;

    // Control point Bezier kubik — diberi offset acak ±110px
    // agar jalan terlihat melengkung, bukan garis lurus
    const cx1 = na.x + dx * rnd(0.2, 0.4) + rnd(-110, 110);
    const cy1 = na.y + dy * rnd(0.2, 0.4) + rnd(-110, 110);
    const cx2 = na.x + dx * rnd(0.6, 0.8) + rnd(-110, 110);
    const cy2 = na.y + dy * rnd(0.6, 0.8) + rnd(-110, 110);

    const d = `M ${na.x} ${na.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${nb.x} ${nb.y}`;
    const idx = edges.length;
    edges.push({
      from: a, to: b, d, cx1, cy1, cx2, cy2,
      length: Math.hypot(dx, dy) * rnd(1.1, 1.5),
      label: names[ni++ % names.length]
    });
    graph[a].push({ to: b, edgeIdx: idx });
    graph[b].push({ to: a, edgeIdx: idx });
  }

  // Koneksi horizontal & vertikal di grid
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const id = r * GRID_COLS + c;
      if (c + 1 < GRID_COLS) addEdge(id, id + 1);
      if (r + 1 < GRID_ROWS) addEdge(id, id + GRID_COLS);
    }
  }

  // Tambah jalan diagonal ~45% sel
  // Ini membuat mayoritas jalan berbentuk diagonal/melengkung
  // sesuai syarat tugas (>90% bukan garis lurus)
  for (let r = 0; r < GRID_ROWS - 1; r++) {
    for (let c = 0; c < GRID_COLS - 1; c++) {
      if (Math.random() < 0.45) {
        const id = r * GRID_COLS + c;
        Math.random() < 0.5
          ? addEdge(id, id + GRID_COLS + 1)
          : addEdge(id + 1, id + GRID_COLS);
      }
    }
  }

  ensureConnected();
  randomizePositions();
  renderMap();
  setStatus('Peta siap — pilih objek & klik Start Track');
}

// ── PASTIKAN SEMUA TERHUBUNG (BFS) ────────────────────────
// Algoritma BFS untuk memastikan tidak ada node terisolasi
// Jika ditemukan node yang tidak terhubung,
// dibuat edge baru ke node terdekat yang sudah terhubung
function ensureConnected() {
  // BFS dari node 0
  const visited = new Set(), queue = [0];
  visited.add(0);
  while (queue.length) {
    const cur = queue.shift();
    for (const { to } of graph[cur]) {
      if (!visited.has(to)) { visited.add(to); queue.push(to); }
    }
  }

  // Cek node yang belum terjangkau
  nodes.forEach(n => {
    if (!visited.has(n.id)) {
      // Cari node terdekat yang sudah terhubung
      let closest = -1, minD = Infinity;
      visited.forEach(vid => {
        const d = Math.hypot(nodes[vid].x - n.x, nodes[vid].y - n.y);
        if (d < minD) { minD = d; closest = vid; }
      });
      if (closest >= 0) {
        const na = nodes[n.id], nb = nodes[closest];
        const dx = nb.x - na.x, dy = nb.y - na.y;
        const cx1 = na.x + dx * 0.3 + rnd(-60, 60);
        const cy1 = na.y + dy * 0.3 + rnd(-60, 60);
        const cx2 = na.x + dx * 0.7 + rnd(-60, 60);
        const cy2 = na.y + dy * 0.7 + rnd(-60, 60);
        const idx = edges.length;
        edges.push({
          from: n.id, to: closest,
          d: `M ${na.x} ${na.y} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${nb.x} ${nb.y}`,
          cx1, cy1, cx2, cy2,
          length: Math.hypot(dx, dy) * 1.3,
          label: 'Jl. Penghubung'
        });
        graph[n.id].push({ to: closest, edgeIdx: idx });
        graph[closest].push({ to: n.id, edgeIdx: idx });
        // BFS lagi dari node yang baru terhubung
        const q2 = [n.id]; visited.add(n.id);
        while (q2.length) {
          const c = q2.shift();
          for (const { to } of graph[c]) {
            if (!visited.has(to)) { visited.add(to); q2.push(to); }
          }
        }
      }
    }
  });
}

// ── RENDER PETA SVG VECTOR ────────────────────────────────
// Render semua elemen peta sebagai SVG vector
// SVG vector memastikan kualitas tetap tajam saat zoom
// (tidak pixelated seperti bitmap/canvas)
function renderMap() {
  const svg = document.getElementById('map');
  svg.setAttribute('width', MAP_W);
  svg.setAttribute('height', MAP_H);
  svg.setAttribute('viewBox', `0 0 ${MAP_W} ${MAP_H}`);
  svg.innerHTML = '';

  // Background warna tanah kota
  const bg = mkEl('rect');
  bg.setAttribute('width', MAP_W); bg.setAttribute('height', MAP_H);
  bg.setAttribute('fill', '#f0ebe3');
  svg.appendChild(bg);

  // Blok kota: bangunan & taman
  const blockG = mkG(); svg.appendChild(blockG);
  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      const cx = (c + 0.5) * CELL_W, cy = (r + 0.5) * CELL_H;
      Math.random() < 0.18 ? drawPark(blockG, cx, cy) : drawCityBlock(blockG, cx, cy);
    }
  }

  // Layer jalan: bahu → aspal → garis tengah
  // Dibuat berlapis untuk efek visual yang realistis
  const rsg = mkG(); svg.appendChild(rsg);
  edges.forEach(e => {
    const p = mkEl('path');
    p.setAttribute('d', e.d);
    p.setAttribute('stroke', '#b0a090'); p.setAttribute('stroke-width', '22');
    p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round');
    rsg.appendChild(p);
  });

  const rg = mkG(); svg.appendChild(rg);
  edges.forEach(e => {
    const p = mkEl('path');
    p.setAttribute('d', e.d);
    p.setAttribute('stroke', '#d8cfc2'); p.setAttribute('stroke-width', '14');
    p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round');
    rg.appendChild(p);
  });

  const rlg = mkG(); svg.appendChild(rlg);
  edges.forEach(e => {
    const p = mkEl('path');
    p.setAttribute('d', e.d);
    p.setAttribute('stroke', '#bab0a0'); p.setAttribute('stroke-width', '1.5');
    p.setAttribute('stroke-dasharray', '14 10');
    p.setAttribute('fill', 'none'); p.setAttribute('stroke-linecap', 'round');
    rlg.appendChild(p);
  });

  // Highlight jalur terpilih
  const hg = mkG(); hg.setAttribute('id', 'highlight-group');
  svg.appendChild(hg); drawHighlight(hg);

  // Label nama jalan
  const lg = mkG(); svg.appendChild(lg);
  edges.forEach((e, i) => {
    if (i % 3 !== 0) return;
    const na = nodes[e.from], nb = nodes[e.to];
    const midX = (na.x + nb.x) / 2, midY = (na.y + nb.y) / 2;
    const angle = Math.atan2(nb.y - na.y, nb.x - na.x) * 180 / Math.PI;
    const txt = mkEl('text');
    txt.setAttribute('x', midX); txt.setAttribute('y', midY);
    txt.setAttribute('text-anchor', 'middle'); txt.setAttribute('font-size', '9');
    txt.setAttribute('fill', '#7a6e5f'); txt.setAttribute('font-family', 'Arial,sans-serif');
    txt.setAttribute('transform', `rotate(${angle > 90 || angle < -90 ? angle + 180 : angle},${midX},${midY})`);
    txt.textContent = e.label; lg.appendChild(txt);
  });

  // Persimpangan jalan
  const ng = mkG(); svg.appendChild(ng);
  nodes.forEach(n => {
    const c = mkEl('circle');
    c.setAttribute('cx', n.x); c.setAttribute('cy', n.y); c.setAttribute('r', 5);
    c.setAttribute('fill', '#d4c9b8'); c.setAttribute('stroke', '#b0a090');
    c.setAttribute('stroke-width', '1.5'); ng.appendChild(c);
  });

  // Marker start & end
  const mg = mkG(); mg.setAttribute('id', 'markers-group');
  svg.appendChild(mg); renderMarkersInto(mg);

  // Objek bergerak
  const og = mkG(); og.setAttribute('id', 'obj-group');
  og.setAttribute('display', 'none'); svg.appendChild(og);
  buildObjShape(og);
}

// ── GAMBAR BLOK BANGUNAN ──────────────────────────────────
// Menggambar beberapa gedung kecil dalam satu blok kota
function drawCityBlock(parent, cx, cy) {
  for (let i = 0, n = rndInt(2, 5); i < n; i++) {
    const bw = rnd(20, CELL_W * 0.28), bh = rnd(20, CELL_H * 0.28);
    const bx = cx + rnd(-CELL_W * 0.3, CELL_W * 0.3) - bw / 2;
    const by = cy + rnd(-CELL_H * 0.3, CELL_H * 0.3) - bh / 2;
    // Bayangan gedung
    const sh = mkEl('rect');
    sh.setAttribute('x', bx + 3); sh.setAttribute('y', by + 3);
    sh.setAttribute('width', bw); sh.setAttribute('height', bh);
    sh.setAttribute('rx', 2); sh.setAttribute('fill', 'rgba(0,0,0,0.1)');
    parent.appendChild(sh);
    // Bodi gedung
    const colors = ['#c8b89a','#d4c4a6','#bfaf96','#c9bba5','#d0c3ae','#cfc0a8'];
    const r = mkEl('rect');
    r.setAttribute('x', bx); r.setAttribute('y', by);
    r.setAttribute('width', bw); r.setAttribute('height', bh);
    r.setAttribute('rx', 2); r.setAttribute('fill', colors[rndInt(0, colors.length - 1)]);
    r.setAttribute('stroke', '#a89880'); r.setAttribute('stroke-width', '0.8');
    parent.appendChild(r);
    // Atap
    const rf = mkEl('rect');
    rf.setAttribute('x', bx + 2); rf.setAttribute('y', by + 2);
    rf.setAttribute('width', bw - 4); rf.setAttribute('height', bh * 0.3);
    rf.setAttribute('rx', 1); rf.setAttribute('fill', 'rgba(0,0,0,0.08)');
    parent.appendChild(rf);
  }
}

// ── GAMBAR TAMAN ──────────────────────────────────────────
// Menggambar area taman kota dengan pohon-pohon
function drawPark(parent, cx, cy) {
  const pw = CELL_W * rnd(0.35, 0.55), ph = CELL_H * rnd(0.35, 0.55);
  // Area taman
  const p = mkEl('rect');
  p.setAttribute('x', cx - pw / 2); p.setAttribute('y', cy - ph / 2);
  p.setAttribute('width', pw); p.setAttribute('height', ph);
  p.setAttribute('rx', 8); p.setAttribute('fill', '#a8d5a2');
  p.setAttribute('stroke', '#7cb87c'); p.setAttribute('stroke-width', '1.5');
  parent.appendChild(p);
  const inn = mkEl('rect');
  inn.setAttribute('x', cx - pw * 0.35); inn.setAttribute('y', cy - ph * 0.35);
  inn.setAttribute('width', pw * 0.7); inn.setAttribute('height', ph * 0.7);
  inn.setAttribute('rx', 5); inn.setAttribute('fill', '#90c98a');
  parent.appendChild(inn);
  // Pohon-pohon
  for (let i = 0, n = rndInt(3, 7); i < n; i++) {
    const tx = cx + rnd(-pw * 0.4, pw * 0.4);
    const ty = cy + rnd(-ph * 0.4, ph * 0.4);
    const tr = rnd(6, 14);
    const t = mkEl('circle');
    t.setAttribute('cx', tx); t.setAttribute('cy', ty); t.setAttribute('r', tr);
    t.setAttribute('fill', '#5a9e5a'); t.setAttribute('opacity', '0.85');
    parent.appendChild(t);
    const hl = mkEl('circle');
    hl.setAttribute('cx', tx - tr * 0.3); hl.setAttribute('cy', ty - tr * 0.3);
    hl.setAttribute('r', tr * 0.4); hl.setAttribute('fill', '#7cb87c');
    hl.setAttribute('opacity', '0.5'); parent.appendChild(hl);
  }
  // Label taman
  const lbl = mkEl('text');
  lbl.setAttribute('x', cx); lbl.setAttribute('y', cy + ph / 2 + 12);
  lbl.setAttribute('text-anchor', 'middle'); lbl.setAttribute('font-size', '8');
  lbl.setAttribute('fill', '#3d7a3d'); lbl.setAttribute('font-family', 'Arial,sans-serif');
  lbl.textContent = Math.random() < 0.5 ? 'Taman Kota' : 'Area Hijau';
  parent.appendChild(lbl);
}
