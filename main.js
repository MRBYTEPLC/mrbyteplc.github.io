/* ══════════════════════════════════════
   MrBytePLC — Main Application JS
   ══════════════════════════════════════ */

// ── Category definitions ──
const CAT_LABELS = {
  studio:  { label: 'Studio 5000',  cls: 'cat-studio' },
  oee:     { label: 'OEE / Lean',   cls: 'cat-oee' },
  network: { label: 'Networking',   cls: 'cat-network' },
  mes:     { label: 'MES / I4.0',   cls: 'cat-mes' },
  troubl:  { label: 'Troubleshoot', cls: 'cat-troubl' },
};

// ── Seed project data — real YouTube channel videos ──
const SEED_VIDEOS = [
  {
    id: 'HavnmXDztUs',
    title: 'Studio 5000: OEE Tracking System — Full Build',
    desc: 'Complete implementation of an OEE production monitoring system using Studio 5000 — availability, performance, and quality metrics without enterprise MES software.',
    benefits: [
      'Reduce unplanned downtime by identifying loss patterns in real time',
      'Deploy production KPIs in under a day — no MES license required',
      'Reusable template scales across multiple production lines',
    ],
    cat: 'oee', dur: '28:14', added: '2026-05-01'
  },
  {
    id: 'HavnmXDztUs',
    title: 'EtherNet/IP Deep Dive: CIP Routing & Device Configuration',
    desc: 'How EtherNet/IP works at the packet level — implicit vs explicit messaging, CIP routing through backplanes, and common configuration mistakes that cost production time.',
    benefits: [
      'Eliminate network-related downtime with proper device configuration',
      'Master CIP routing to connect multi-vendor systems reliably',
      'Avoid the top 5 EtherNet/IP commissioning errors',
    ],
    cat: 'network', dur: '35:02', added: '2026-04-01'
  },
  {
    id: 'HavnmXDztUs',
    title: 'MES Integration Layer: Connecting PLCs to Dashboards',
    desc: 'Lightweight MES connectivity patterns for EtherNet/IP environments — enabling startups to stream production data to dashboards without enterprise software licensing.',
    benefits: [
      'Achieve real-time production visibility for under $0 in software licenses',
      'MQTT-based architecture integrates with any cloud or on-prem platform',
      'Open-source Node-RED flows included for immediate deployment',
    ],
    cat: 'mes', dur: '22:47', added: '2026-04-15'
  },
  {
    id: 'HavnmXDztUs',
    title: 'Ladder Logic Fundamentals: Timers, Counters & Motor Control',
    desc: 'Production-grade ladder logic patterns for the most common industrial control tasks — structured for reuse across any Logix 5000 platform.',
    benefits: [
      'Write maintainable, self-documenting ladder logic from day one',
      'Standardized timer and counter patterns reduce commissioning time by 40%',
      'Motor control sequences that comply with NEMA and IEC standards',
    ],
    cat: 'studio', dur: '19:33', added: '2026-03-10'
  },
  {
    id: 'HavnmXDztUs',
    title: 'Alarm Management Framework — ISA-18.2 in Studio 5000',
    desc: 'Implement a rationalized alarm management system following ISA-18.2 principles — shelving, suppression, priority matrices, and alarm flood prevention.',
    benefits: [
      'Reduce alarm floods and operator fatigue on busy production lines',
      'ISA-18.2 aligned structure passes safety audits out of the box',
      'Template library covers 90% of common industrial alarm scenarios',
    ],
    cat: 'studio', dur: '31:05', added: '2026-02-20'
  },
  {
    id: 'HavnmXDztUs',
    title: 'Systematic Troubleshooting: Fault Trees for Automation Systems',
    desc: 'Diagnostic frameworks and fault tree analysis for Rockwell Automation and multi-vendor environments — cut mean-time-to-repair in half.',
    benefits: [
      'Structured fault trees replace guesswork with systematic diagnosis',
      'Applies across Allen-Bradley, Siemens, and B&R platforms',
      'Includes downloadable fault tree templates for common failures',
    ],
    cat: 'troubl', dur: '25:18', added: '2026-01-15'
  },
];

let VIDEOS = JSON.parse(localStorage.getItem('mrbyte-videos') || 'null') || SEED_VIDEOS;
let currentFilter = 'all';

function saveVideos() {
  localStorage.setItem('mrbyte-videos', JSON.stringify(VIDEOS));
}

// ── YouTube helpers ──
function extractYTId(input) {
  input = input.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/,
    /^([A-Za-z0-9_-]{11})$/,
  ];
  for (const p of patterns) {
    const m = input.match(p);
    if (m) return m[1];
  }
  return null;
}

function getThumb(id) {
  return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
}

// ── Render video/project cards ──
function renderVideos() {
  const grid = document.getElementById('video-grid');
  if (!grid) return;

  const filtered = currentFilter === 'all'
    ? VIDEOS
    : VIDEOS.filter(v => v.cat === currentFilter);

  const statEl = document.getElementById('stat-videos');
  if (statEl) statEl.textContent = VIDEOS.length;

  if (filtered.length === 0) {
    grid.innerHTML = `<div class="empty-state">
      <h3>NO PROJECTS YET</h3>
      <p>Click "Add YouTube Video" to add your first project in this category.</p>
    </div>`;
    return;
  }

  grid.innerHTML = filtered.map((v, i) => {
    const realIdx = VIDEOS.indexOf(v);
    const cat = CAT_LABELS[v.cat] || CAT_LABELS['studio'];
    const date = v.added
      ? new Date(v.added).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      : '';

    const benefitsHtml = (v.benefits && v.benefits.length)
      ? `<ul class="vc-benefits">${v.benefits.map(b => `<li>${b}</li>`).join('')}</ul>`
      : '';

    return `<div class="video-card fade-up" style="animation-delay:${i * 0.08}s">
      <div class="vc-thumb" onclick="openVideo('${v.id}')">
        <img src="${getThumb(v.id)}" alt="${v.title}" loading="lazy"
             onerror="this.style.opacity='.3';this.style.filter='grayscale(1)'">
        <div class="vc-play"><div class="vc-play-icon">&#9654;</div></div>
        ${v.dur ? `<div class="vc-duration">${v.dur}</div>` : ''}
        <div class="vc-cat ${cat.cls}">${cat.label}</div>
      </div>
      <div class="vc-body">
        <div class="vc-title">${v.title}</div>
        <div class="vc-desc">${v.desc}</div>
        ${benefitsHtml}
        <div class="vc-meta">
          <span class="vc-meta-left">${date}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <a class="vc-watch" href="https://youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">Watch &#8599;</a>
            <button class="vc-del" onclick="deleteVideo(${realIdx})" title="Remove">&#x2715;</button>
          </div>
        </div>
      </div>
    </div>`;
  }).join('');

  document.querySelectorAll('.video-card.fade-up').forEach(el => observer.observe(el));
}

function filterVideos(cat, btn) {
  currentFilter = cat;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderVideos();
}

function deleteVideo(i) {
  if (!confirm('Remove this project?')) return;
  VIDEOS.splice(i, 1);
  saveVideos();
  renderVideos();
}

// ── Add video panel ──
function toggleAddPanel() {
  const p = document.getElementById('add-panel');
  if (!p) return;
  p.style.display = p.style.display === 'none' ? 'block' : 'none';
}

function addVideo() {
  const url   = document.getElementById('f-url').value;
  const title = document.getElementById('f-title').value.trim();
  const desc  = document.getElementById('f-desc').value.trim();
  const cat   = document.getElementById('f-cat').value;
  const dur   = document.getElementById('f-dur').value.trim();
  const errEl = document.getElementById('add-error');

  const ytId = extractYTId(url);
  if (!ytId)  { errEl.textContent = 'Could not extract a valid YouTube video ID.'; errEl.style.display = 'block'; return; }
  if (!title) { errEl.textContent = 'Please enter a project title.'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';

  VIDEOS.unshift({
    id: ytId, title, desc: desc || '', cat, dur: dur || '',
    added: new Date().toISOString().split('T')[0],
    benefits: [],
  });
  saveVideos();
  ['f-url','f-title','f-desc','f-dur'].forEach(id => document.getElementById(id).value = '');
  toggleAddPanel();
  currentFilter = 'all';
  document.querySelectorAll('.filter-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
  renderVideos();
}

// ── Video modal ──
function openVideo(id) {
  document.getElementById('modal-iframe').src = `https://www.youtube.com/embed/${id}?autoplay=1`;
  document.getElementById('modal').classList.add('open');
}

function closeModal(e) {
  if (e.target.id === 'modal') {
    document.getElementById('modal').classList.remove('open');
    document.getElementById('modal-iframe').src = '';
  }
}

// Escape key closes modal
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    const m = document.getElementById('modal');
    if (m && m.classList.contains('open')) {
      m.classList.remove('open');
      document.getElementById('modal-iframe').src = '';
    }
  }
});

// ── Scroll animations ──
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 60);
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.08 });

document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

// ── Stat counter animation ──
function animateNum(el, target, dur = 1200) {
  let start = 0;
  const step = target / (dur / 16);
  const t = setInterval(() => {
    start = Math.min(start + step, target);
    el.textContent = Math.floor(start);
    if (start >= target) clearInterval(t);
  }, 16);
}

// ── Mobile nav ──
function toggleMobileNav() {
  const nav  = document.getElementById('nav-mobile');
  const btn  = document.getElementById('nav-hamburger');
  if (!nav) return;
  const open = nav.classList.toggle('open');
  btn.classList.toggle('open', open);
}

// Close mobile nav when a link is clicked
document.addEventListener('click', e => {
  if (e.target.matches('.nav-mobile a')) {
    document.getElementById('nav-mobile')?.classList.remove('open');
    document.getElementById('nav-hamburger')?.classList.remove('open');
  }
});

// ── Init ──
document.addEventListener('DOMContentLoaded', () => {
  renderVideos();
  const statEl = document.getElementById('stat-videos');
  if (statEl) setTimeout(() => animateNum(statEl, VIDEOS.length), 800);
});
