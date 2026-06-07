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
  vision:  { label: 'Vision / AI',  cls: 'cat-vision' },
};

// ── Seed project data — MrBytePLC YouTube channel ──
const SEED_VIDEOS = [
  {
    id: 'HavnmXDztUs',
    title: 'Scale Your Maintenance Operations: High-End Asset Management on a Startup Budget',
    desc: 'How to implement enterprise-grade asset management and maintenance tracking systems without the enterprise price tag — built for lean manufacturing teams.',
    benefits: [
      'Cut unplanned downtime with structured preventive maintenance workflows',
      'Deploy asset tracking typically reserved for large OEMs at startup cost',
      'Scalable framework grows with your operation without re-engineering',
    ],
    cat: 'oee', dur: '', added: '2026-05-01'
  },
  {
    id: 'yekWrjRPnnE',
    title: 'Does the Fishbone Diagram Oversimplify Failure? (Industrial Data Approach)',
    desc: 'A critical look at traditional root cause analysis tools versus data-driven failure analysis — when the fishbone diagram falls short and what to use instead in modern industrial environments.',
    benefits: [
      'Move beyond guesswork with data-driven root cause methodologies',
      'Reduce repeat failures by addressing systemic causes, not symptoms',
      'Integrate historian data into your RCA process for measurable improvement',
    ],
    cat: 'troubl', dur: '', added: '2026-04-20'
  },
  {
    id: 'UjMPAoRHqaI',
    title: 'PODCAST #1 — Prevent Failures & Save Money Using Elapsed Time AOI',
    desc: 'Deep dive into the Elapsed Time Add-On Instruction for predictive maintenance — how tracking runtime hours on motors, pumps, and conveyors prevents costly unplanned failures.',
    benefits: [
      'Predict and prevent motor failures before they cause production stops',
      'Implement condition-based maintenance without expensive sensor hardware',
      'AOI template is reusable across any Logix 5000 platform out of the box',
    ],
    cat: 'studio', dur: '', added: '2026-04-15'
  },
  {
    id: 'ClFwQWB6Eeo',
    title: 'Industry 4.0 for Small Manufacturers: PLC and Python Integration',
    desc: 'Practical guide to bridging the PLC world and modern software stacks — read live PLC tags with Python, process production data, and feed it into dashboards or ML pipelines.',
    benefits: [
      'Unlock IIoT capabilities on existing Rockwell infrastructure with zero hardware changes',
      'Python integration enables custom analytics no SCADA system can match',
      'Open-source code included — deploy your first data pipeline in hours, not months',
    ],
    cat: 'mes', dur: '', added: '2026-04-01'
  },
  {
    id: 'jfkpbsATlcg',
    title: 'Open-Source MES Architecture for Small U.S. Manufacturers',
    desc: 'Full architecture walkthrough of a lightweight, open-source Manufacturing Execution System designed specifically for startups and small manufacturers — no six-figure license required.',
    benefits: [
      'Achieve real-time production visibility for $0 in software licensing',
      'Modular architecture — implement only the modules your operation needs',
      'Built on proven open-source tools: Node-RED, InfluxDB, Grafana, and MQTT',
    ],
    cat: 'mes', dur: '', added: '2026-03-20'
  },
  {
    id: 'WNc3BG74ONA',
    title: 'Saving Energy Money $ — NO WASTE',
    desc: 'Engineering approach to energy monitoring and waste elimination using PLC data — identify the biggest energy consumers on your floor and build automated reduction strategies.',
    benefits: [
      'Identify energy waste patterns invisible to traditional utility monitoring',
      'PLC-based energy tracking requires no additional metering hardware',
      'Documented ROI framework to justify energy projects to management',
    ],
    cat: 'oee', dur: '', added: '2026-03-10'
  },
  {
    id: 'nql7OMqGUaw',
    title: 'Python + PLC: How to Build Your Own Low-Cost MES System',
    desc: 'Step-by-step build of a functional MES using Python and direct PLC communication — production counting, downtime tracking, shift reporting, and a live dashboard from scratch.',
    benefits: [
      'Full MES functionality at a fraction of commercial software cost',
      'Python gives you complete flexibility — customize every metric and report',
      'Real factory deployment example with documented implementation steps',
    ],
    cat: 'mes', dur: '', added: '2026-02-25'
  },
  {
    id: 'LGRZOjTw9vo',
    title: 'How to Program Vision Pro Cognex Designer — Part 1',
    desc: 'Hands-on programming guide for Cognex Vision Pro using Designer software — setting up inspection jobs, configuring tools, and integrating results back into PLC control logic.',
    benefits: [
      'Implement machine vision quality checks without a vision systems integrator',
      'Cognex Designer job structure reduces setup time for new inspection programs',
      'PLC integration patterns ensure zero production delay on vision failures',
    ],
    cat: 'vision', dur: '', added: '2026-02-10'
  },
  {
    id: 'Wz--qN-kl2A',
    title: 'Keyence AI Camera System Demo with Real Object: Next Level Automation for Poka Yokes',
    desc: 'Live demonstration of a Keyence AI-based vision system performing real-object inspection for poka-yoke applications — setup, configuration, and integration into an automation cell.',
    benefits: [
      'AI-powered vision dramatically reduces false rejects versus traditional rule-based systems',
      'Poka-yoke integration ensures defects never reach the next process step',
      'No vision programming expertise required — the AI trains from real sample parts',
    ],
    cat: 'vision', dur: '', added: '2026-01-28'
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
