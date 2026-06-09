/* ══════════════════════════════════════════════════
   MrBytePLC — Main App JS
   localStorage-powered: nickname, visits, likes,
   comments, hall of fame, online simulation
   ══════════════════════════════════════════════════ */
'use strict';

/* ── Storage helpers ── */
const S = {
  get: (k, d = null) => { try { const v = localStorage.getItem(k); return v !== null ? JSON.parse(v) : d; } catch { return d; } },
  set: (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} },
};

/* ── State ── */
let NICK     = S.get('mb-nick', null);      // current user nickname
let VISITS   = S.get('mb-visits', 0);       // visit counter (this device)
let LIKED    = S.get('mb-liked', false);    // has this device liked
let LIKES    = S.get('mb-likes', 0);        // like count (this device)
let COMMENTS = S.get('mb-comments', []);    // approved comments
let PENDING  = S.get('mb-pending', []);     // pending comments (mine)
let HOF_DATA = S.get('mb-hof', []);         // hall of fame entries

/* ── Toast ── */
function showToast(msg, type = '') {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.className = 'toast' + (type ? ' ' + type : '');
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 3000);
}

/* ══════════════════════════════════════════════════
   NICKNAME SYSTEM
   ══════════════════════════════════════════════════ */
function openNickModal() {
  document.getElementById('nick-overlay').classList.add('open');
  setTimeout(() => document.getElementById('nick-input')?.focus(), 100);
}
function closeNickModal() {
  document.getElementById('nick-overlay').classList.remove('open');
}
function submitNick() {
  const inp = document.getElementById('nick-input');
  const err = document.getElementById('nick-err');
  const val = inp.value.trim().replace(/\s+/g, '_');
  if (val.length < 2) { err.textContent = 'Nickname must be at least 2 characters.'; err.style.display = 'block'; return; }
  if (val.length > 20) { err.textContent = 'Max 20 characters.'; err.style.display = 'block'; return; }
  if (!/^[A-Za-z0-9_\-\.]+$/.test(val)) { err.textContent = 'Only letters, numbers, _ - . allowed.'; err.style.display = 'block'; return; }
  err.style.display = 'none';
  NICK = val;
  S.set('mb-nick', NICK);
  closeNickModal();
  updateNickUI();
  updateOnlineBar();
  showToast('Welcome, ' + NICK + '! \uD83D\uDE80', 'success');
}
function skipNick() {
  closeNickModal();
  showToast('Browsing as guest \u2014 create a nickname to comment & like.', '');
}
function updateNickUI() {
  const el = document.getElementById('nav-nick');
  if (!el) return;
  el.textContent = NICK ? '\uD83D\uDC64 ' + NICK : 'Set Nickname';
  el.style.color = NICK ? 'var(--amber)' : '';
}

/* ══════════════════════════════════════════════════
   VISIT COUNTER
   ══════════════════════════════════════════════════ */
function incrementVisits() {
  const key = 'mb-visited-' + new Date().toDateString();
  if (!S.get(key, false)) {
    VISITS++;
    S.set('mb-visits', VISITS);
    S.set(key, true);
  }
  const el = document.getElementById('visit-count');
  if (el) animateNum(el, VISITS);
}

/* ══════════════════════════════════════════════════
   LIKES
   ══════════════════════════════════════════════════ */
function toggleLike() {
  if (!NICK) { openNickModal(); showToast('Set a nickname to give likes \u2764\uFE0F', ''); return; }
  if (LIKED) { showToast('You already liked this! \u2764\uFE0F', ''); return; }
  LIKED = true; LIKES++;
  S.set('mb-liked', LIKED);
  S.set('mb-likes', LIKES);
  updateLikeUI();
  updateHOF();
  showToast('Thanks for the like! \u2764\uFE0F', 'success');
}
function updateLikeUI() {
  const btn = document.getElementById('like-btn');
  const cnt = document.getElementById('like-count');
  if (btn) btn.classList.toggle('liked', LIKED);
  if (cnt) animateNum(cnt, LIKES);
}

/* ══════════════════════════════════════════════════
   ONLINE BAR — simulated with localStorage timestamps
   ══════════════════════════════════════════════════ */
const SESSION_KEY = 'mb-session-' + Math.random().toString(36).slice(2);
const ALL_SESSIONS_KEY = 'mb-sessions';

function heartbeat() {
  const sessions = S.get(ALL_SESSIONS_KEY, {});
  const now = Date.now();
  // clean stale (> 45s)
  Object.keys(sessions).forEach(k => { if (now - sessions[k].ts > 45000) delete sessions[k]; });
  sessions[SESSION_KEY] = { nick: NICK || 'Guest', ts: now };
  S.set(ALL_SESSIONS_KEY, sessions);
  updateOnlineBar();
}
function updateOnlineBar() {
  const sessions = S.get(ALL_SESSIONS_KEY, {});
  const now = Date.now();
  const active = Object.values(sessions).filter(s => now - s.ts < 45000);
  const countEl = document.getElementById('online-count');
  const namesEl = document.getElementById('online-names');
  if (countEl) countEl.textContent = active.length;
  if (namesEl) {
    namesEl.innerHTML = active.map(s =>
      `<span class="user-chip${s.nick === NICK ? ' me' : ''}">${s.nick}</span>`
    ).join('');
  }
}

/* ══════════════════════════════════════════════════
   COMMENTS
   ══════════════════════════════════════════════════ */
const MAX_COMMENT = 400;

function updateCharCount() {
  const ta = document.getElementById('cfb-textarea');
  const cc = document.getElementById('cfb-chars');
  if (!ta || !cc) return;
  cc.textContent = ta.value.length + ' / ' + MAX_COMMENT;
}

function submitComment() {
  if (!NICK) { openNickModal(); showToast('Set a nickname to comment.', ''); return; }
  const ta = document.getElementById('cfb-textarea');
  if (!ta) return;
  const text = ta.value.trim();
  if (!text) { showToast('Write something first!', ''); return; }
  if (text.length > MAX_COMMENT) { showToast('Comment too long (max ' + MAX_COMMENT + ' chars).', 'error'); return; }

  // Rate limit: 1 comment per 5 min
  const lastTime = S.get('mb-last-comment', 0);
  if (Date.now() - lastTime < 5 * 60 * 1000) {
    const wait = Math.ceil((5 * 60 * 1000 - (Date.now() - lastTime)) / 1000);
    showToast('Please wait ' + wait + 's before commenting again.', 'error');
    return;
  }

  const comment = {
    id: Date.now(),
    nick: NICK,
    text,
    ts: Date.now(),
    status: 'pending', // pending until "approved" locally
  };

  // On this device: show immediately as pending
  PENDING.push(comment);
  S.set('mb-pending', PENDING);

  // Also add to approved after short delay (simulating approval — Firebase will handle real moderation)
  // For local-only mode we auto-approve after 5 seconds
  setTimeout(() => {
    const idx = PENDING.findIndex(c => c.id === comment.id);
    if (idx !== -1) {
      const approved = { ...PENDING[idx], status: 'approved' };
      PENDING.splice(idx, 1);
      COMMENTS.unshift(approved);
      S.set('mb-pending', PENDING);
      S.set('mb-comments', COMMENTS);
      renderComments();
    }
  }, 5000);

  S.set('mb-last-comment', Date.now());
  ta.value = '';
  updateCharCount();
  renderComments();
  showToast('Comment submitted! Pending review \u23F3', '');

  // Update HOF participation
  updateHOF();
}

function deleteComment(id) {
  if (!confirm('Delete this comment?')) return;
  COMMENTS = COMMENTS.filter(c => c.id !== id);
  PENDING  = PENDING.filter(c => c.id !== id);
  S.set('mb-comments', COMMENTS);
  S.set('mb-pending', PENDING);
  renderComments();
}

function renderComments() {
  const list = document.getElementById('comments-list');
  if (!list) return;

  const allVisible = [
    ...COMMENTS,
    ...PENDING,
  ].sort((a, b) => b.ts - a.ts);

  if (allVisible.length === 0) {
    list.innerHTML = '<div class="no-comments"><p>\uD83D\uDCAC No comments yet \u2014 be the first!</p></div>';
    return;
  }

  list.innerHTML = allVisible.map(c => {
    const mine = c.nick === NICK;
    const time = new Date(c.ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    return `<div class="comment-card">
      <div class="cc-header">
        <div class="cc-avatar">${c.nick.charAt(0).toUpperCase()}</div>
        <div>
          <div class="cc-nick">${escHtml(c.nick)}</div>
          <div class="cc-time">${time}</div>
        </div>
        ${mine ? `<button class="cc-del" onclick="deleteComment(${c.id})" title="Delete">\u2715</button>` : ''}
      </div>
      <div class="cc-body">${escHtml(c.text)}</div>
      ${c.status === 'pending' ? '<div class="cc-pending">\u23F3 Pending review</div>' : ''}
    </div>`;
  }).join('');
}

function renderCommentForm() {
  const formWrap = document.getElementById('cfb-form-wrap');
  if (!formWrap) return;
  if (NICK) {
    formWrap.innerHTML = `
      <div class="cfb-who">Commenting as <span>${escHtml(NICK)}</span></div>
      <textarea class="cfb-textarea" id="cfb-textarea" maxlength="${MAX_COMMENT}"
        placeholder="Share your thoughts on industrial automation, STEM, or the projects..."
        oninput="updateCharCount()"></textarea>
      <div class="cfb-footer">
        <span class="cfb-chars">0 / ${MAX_COMMENT}</span>
        <button class="cfb-submit" onclick="submitComment()">Post Comment</button>
      </div>`;
  } else {
    formWrap.innerHTML = `
      <div class="cfb-login-msg">
        <p>Set a nickname to join the conversation.</p>
        <button class="cfb-login-btn" onclick="openNickModal()">\uD83D\uDC64 Set Nickname</button>
      </div>`;
  }
}

/* ══════════════════════════════════════════════════
   HALL OF FAME
   ══════════════════════════════════════════════════ */
function updateHOF() {
  if (!NICK) return;
  const score = (LIKED ? 10 : 0) + COMMENTS.filter(c => c.nick === NICK).length * 5;
  const idx = HOF_DATA.findIndex(h => h.nick === NICK);
  if (idx >= 0) HOF_DATA[idx].score = score;
  else HOF_DATA.push({ nick: NICK, score });
  HOF_DATA.sort((a, b) => b.score - a.score);
  S.set('mb-hof', HOF_DATA);
  renderHOF();
}

function renderHOF() {
  const grid = document.getElementById('hof-grid');
  if (!grid) return;
  const top = HOF_DATA.slice(0, 6);
  if (top.length === 0) {
    grid.innerHTML = '<div class="hof-empty">\uD83C\uDFC6 Be the first to join the Hall of Fame! Like and comment to earn points.</div>';
    return;
  }
  const medals = ['gold', 'silver', 'bronze'];
  const rankSymbols = ['\uD83E\uDD47', '\uD83E\uDD48', '\uD83E\uDD49'];
  grid.innerHTML = top.map((h, i) => `
    <div class="hof-card">
      <div class="hof-rank ${medals[i] || ''}">${rankSymbols[i] || (i + 1)}</div>
      <div class="hof-avatar">${h.nick.charAt(0).toUpperCase()}</div>
      <div class="hof-info">
        <div class="hof-nick">${escHtml(h.nick)}</div>
        <div class="hof-stat">Score: <span>${h.score}</span> pts</div>
      </div>
    </div>`).join('');
}

/* ══════════════════════════════════════════════════
   VIDEO PROJECTS
   ══════════════════════════════════════════════════ */
const CAT_LABELS = {
  studio:  { label: 'Studio 5000', cls: 'cat-studio' },
  oee:     { label: 'OEE / Lean',  cls: 'cat-oee' },
  network: { label: 'Networking',  cls: 'cat-network' },
  mes:     { label: 'MES / I4.0',  cls: 'cat-mes' },
  troubl:  { label: 'Troubleshoot',cls: 'cat-troubl' },
  vision:  { label: 'Vision / AI', cls: 'cat-vision' },
};

const SEED_VIDEOS = [
  { id:'HavnmXDztUs', title:'Scale Your Maintenance Operations: High-End Asset Management on a Startup Budget', desc:'Enterprise-grade asset management for lean teams — without the enterprise price tag.', benefits:['Cut unplanned downtime with preventive maintenance workflows','Deploy asset tracking at startup cost','Scalable framework grows without re-engineering'], cat:'oee', dur:'', added:'2026-05-01' },
  { id:'yekWrjRPnnE', title:'Does the Fishbone Diagram Oversimplify Failure? (Industrial Data Approach)', desc:'Data-driven failure analysis vs. traditional root cause tools — when fishbone falls short.', benefits:['Move beyond guesswork with data-driven RCA','Reduce repeat failures by addressing systemic causes','Integrate historian data into your RCA process'], cat:'troubl', dur:'', added:'2026-04-20' },
  { id:'UjMPAoRHqaI', title:'PODCAST #1 \u2014 Prevent Failures & Save Money Using Elapsed Time AOI', desc:'Elapsed Time AOI for predictive maintenance — track runtime hours to prevent costly failures.', benefits:['Predict motor failures before production stops','Condition-based maintenance without extra hardware','AOI reusable across any Logix 5000 platform'], cat:'studio', dur:'', added:'2026-04-15' },
  { id:'ClFwQWB6Eeo', title:'Industry 4.0 for Small Manufacturers: PLC and Python Integration', desc:'Bridge the PLC world and modern software — read live tags with Python, feed dashboards or ML.', benefits:['Unlock IIoT on existing Rockwell infrastructure','Custom analytics no SCADA can match','Deploy your first data pipeline in hours'], cat:'mes', dur:'', added:'2026-04-01' },
  { id:'jfkpbsATlcg', title:'Open-Source MES Architecture for Small U.S. Manufacturers', desc:'Lightweight, open-source MES for startups — no six-figure license required.', benefits:['Real-time production visibility for $0 in licensing','Modular — implement only what you need','Node-RED, InfluxDB, Grafana, MQTT stack'], cat:'mes', dur:'', added:'2026-03-20' },
  { id:'WNc3BG74ONA', title:'Saving Energy Money $ \u2014 NO WASTE', desc:'PLC-based energy monitoring — identify the biggest consumers and automate reduction.', benefits:['Spot energy waste invisible to utility monitoring','No additional metering hardware required','Documented ROI framework for management'], cat:'oee', dur:'', added:'2026-03-10' },
  { id:'nql7OMqGUaw', title:'Python + PLC: How to Build Your Own Low-Cost MES System', desc:'Step-by-step MES build with Python and PLC — production counting, downtime tracking, live dashboard.', benefits:['Full MES at a fraction of commercial software cost','Complete flexibility to customize every metric','Real factory deployment with documented steps'], cat:'mes', dur:'', added:'2026-02-25' },
  { id:'LGRZOjTw9vo', title:'How to Program Vision Pro Cognex Designer \u2014 Part 1', desc:'Hands-on Cognex Vision Pro programming — inspection jobs, tools, and PLC integration.', benefits:['Machine vision QC without a vision integrator','Cognex Designer reduces inspection setup time','PLC integration ensures zero production delay'], cat:'vision', dur:'', added:'2026-02-10' },
  { id:'Wz--qN-kl2A', title:'Keyence AI Camera System Demo with Real Object: Next Level Automation for Poka Yokes', desc:'Keyence AI vision system for real-object inspection — setup, config, and automation cell integration.', benefits:['AI vision reduces false rejects vs. rule-based','Poka-yoke integration stops defects at source','No vision expertise required — AI trains from parts'], cat:'vision', dur:'', added:'2026-01-28' },
];

let VIDEOS = S.get('mb-videos', null) || SEED_VIDEOS;
let currentFilter = 'all';

function saveVideos() { S.set('mb-videos', VIDEOS); }

function extractYTId(input) {
  input = input.trim();
  const pats = [/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([A-Za-z0-9_-]{11})/, /^([A-Za-z0-9_-]{11})$/];
  for (const p of pats) { const m = input.match(p); if (m) return m[1]; }
  return null;
}
function getThumb(id) { return 'https://img.youtube.com/vi/' + id + '/hqdefault.jpg'; }

function renderVideos() {
  const grid = document.getElementById('video-grid');
  if (!grid) return;
  const filtered = currentFilter === 'all' ? VIDEOS : VIDEOS.filter(v => v.cat === currentFilter);
  const statEl = document.getElementById('stat-videos');
  if (statEl) statEl.textContent = VIDEOS.length;
  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty-state"><h3>NO PROJECTS YET</h3><p>Click \u201CAdd YouTube Video\u201D to add your first project.</p></div>';
    return;
  }
  grid.innerHTML = filtered.map((v, i) => {
    const realIdx = VIDEOS.indexOf(v);
    const cat = CAT_LABELS[v.cat] || CAT_LABELS['studio'];
    const date = v.added ? new Date(v.added).toLocaleDateString('en-US', { month:'short', year:'numeric' }) : '';
    const benefits = v.benefits?.length ? '<ul class="vc-benefits">' + v.benefits.map(b => '<li>' + escHtml(b) + '</li>').join('') + '</ul>' : '';
    return `<div class="video-card fade-up">
      <div class="vc-thumb" onclick="openVideo('${v.id}')">
        <img src="${getThumb(v.id)}" alt="${escHtml(v.title)}" loading="lazy" onerror="this.style.opacity='.2'">
        <div class="vc-play"><div class="vc-play-icon">&#9654;</div></div>
        ${v.dur ? '<div class="vc-duration">' + v.dur + '</div>' : ''}
        <div class="vc-cat ${cat.cls}">${cat.label}</div>
      </div>
      <div class="vc-body">
        <div class="vc-title">${escHtml(v.title)}</div>
        <div class="vc-desc">${escHtml(v.desc)}</div>
        ${benefits}
        <div class="vc-meta">
          <span class="vc-meta-left">${date}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <a class="vc-watch" href="https://youtube.com/watch?v=${v.id}" target="_blank" rel="noopener">Watch &#8599;</a>
            <button class="vc-del" onclick="deleteVideo(${realIdx})" title="Remove">\u2715</button>
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
  VIDEOS.splice(i, 1); saveVideos(); renderVideos();
}
function toggleAddPanel() {
  const p = document.getElementById('add-panel');
  if (p) p.style.display = p.style.display === 'none' ? 'block' : 'none';
}
function addVideo() {
  const url = document.getElementById('f-url').value;
  const title = document.getElementById('f-title').value.trim();
  const desc  = document.getElementById('f-desc').value.trim();
  const cat   = document.getElementById('f-cat').value;
  const dur   = document.getElementById('f-dur').value.trim();
  const errEl = document.getElementById('add-error');
  const ytId  = extractYTId(url);
  if (!ytId)  { errEl.textContent = 'Could not extract a valid YouTube ID.'; errEl.style.display = 'block'; return; }
  if (!title) { errEl.textContent = 'Please enter a project title.'; errEl.style.display = 'block'; return; }
  errEl.style.display = 'none';
  VIDEOS.unshift({ id:ytId, title, desc:desc||'', cat, dur:dur||'', added:new Date().toISOString().split('T')[0], benefits:[] });
  saveVideos();
  ['f-url','f-title','f-desc','f-dur'].forEach(id => { const el = document.getElementById(id); if(el) el.value=''; });
  toggleAddPanel();
  currentFilter = 'all';
  document.querySelectorAll('.filter-btn').forEach((b,i) => b.classList.toggle('active', i===0));
  renderVideos();
}

/* ══════════════════════════════════════════════════
   VIDEO MODAL
   ══════════════════════════════════════════════════ */
function openVideo(id) {
  document.getElementById('modal-iframe').src = 'https://www.youtube.com/embed/' + id + '?autoplay=1';
  document.getElementById('modal').classList.add('open');
}
function closeModal(e) {
  if (e.target.id === 'modal') { document.getElementById('modal').classList.remove('open'); document.getElementById('modal-iframe').src = ''; }
}
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { const m = document.getElementById('modal'); if (m?.classList.contains('open')) { m.classList.remove('open'); document.getElementById('modal-iframe').src = ''; } }
});

/* ══════════════════════════════════════════════════
   CONVEYOR BELT SIMULATOR
   ══════════════════════════════════════════════════ */
const SIM = {
  running: false,
  speed: 2,
  target: 5,
  count: 0,
  boxes: [],
  animId: null,
  W: 800, H: 240,
  BELT_Y: 160,
  BOX_W: 44, BOX_H: 36,
  SENSOR_X: 80,          // sensor at START of belt
  SENSOR_BEAM_LEN: 60,
  lastSpawn: 0,
  spawnInterval: 1800,
};

function simInit() {
  const canvas = document.getElementById('sim-canvas');
  if (!canvas) return;
  SIM.ctx = canvas.getContext('2d');
  // Responsive canvas size
  function resize() {
    const wrap = canvas.parentElement;
    const w = wrap.offsetWidth;
    const scale = w / SIM.W;
    canvas.width  = SIM.W;
    canvas.height = SIM.H;
    canvas.style.width  = '100%';
    canvas.style.height = Math.round(SIM.H * scale) + 'px';
  }
  resize();
  window.addEventListener('resize', resize);
  simDraw();
}

function simStart() {
  if (SIM.running) return;
  if (SIM.count >= SIM.target) { showToast('Target reached! Reset to start again.', ''); return; }
  SIM.running = true;
  document.getElementById('sim-badge').textContent = 'RUNNING';
  document.getElementById('sim-badge').className = 'sim-badge';
  document.getElementById('btn-start').disabled = true;
  document.getElementById('btn-stop').disabled  = false;
  simLoop();
}
function simStop() {
  SIM.running = false;
  if (SIM.animId) { cancelAnimationFrame(SIM.animId); SIM.animId = null; }
  document.getElementById('sim-badge').textContent = 'STOPPED';
  document.getElementById('sim-badge').className = 'sim-badge stopped';
  document.getElementById('btn-start').disabled = false;
  document.getElementById('btn-stop').disabled  = true;
  simDraw();
}
function simReset() {
  simStop();
  SIM.count = 0; SIM.boxes = []; SIM.lastSpawn = 0;
  document.getElementById('sim-count').textContent = '0';
  simDraw();
}
function simSetSpeed(v) { SIM.speed = parseFloat(v); document.getElementById('sim-speed-val').textContent = v + 'x'; }
function simSetTarget(v) {
  SIM.target = parseInt(v);
  document.getElementById('sim-target-val').textContent = v;
  if (SIM.count >= SIM.target && SIM.running) simStop();
}

function simLoop(ts = 0) {
  if (!SIM.running) return;
  const px = SIM.speed * 1.5;

  // spawn
  if (ts - SIM.lastSpawn > SIM.spawnInterval / SIM.speed) {
    SIM.boxes.push({ x: SIM.W + SIM.BOX_W, counted: false, hue: Math.floor(Math.random()*6)*40 });
    SIM.lastSpawn = ts;
  }

  // move
  SIM.boxes.forEach(b => { b.x -= px; });

  // detect — sensor at SENSOR_X (start of belt)
  SIM.boxes.forEach(b => {
    if (!b.counted && b.x <= SIM.SENSOR_X + SIM.BOX_W / 2 && b.x >= SIM.SENSOR_X - SIM.BOX_W / 2) {
      if (SIM.count < SIM.target) {
        b.counted = true;
        SIM.count++;
        document.getElementById('sim-count').textContent = SIM.count;
        if (SIM.count >= SIM.target) { setTimeout(simStop, 400); }
      }
    }
  });

  // remove off-screen
  SIM.boxes = SIM.boxes.filter(b => b.x > -SIM.BOX_W);

  simDraw();
  SIM.animId = requestAnimationFrame(simLoop);
}

function simDraw() {
  const { ctx, W, H, BELT_Y, BOX_W, BOX_H, SENSOR_X, SENSOR_BEAM_LEN } = SIM;
  if (!ctx) return;

  // bg
  ctx.fillStyle = '#0d1117';
  ctx.fillRect(0, 0, W, H);

  // belt surface
  const beltH = 18;
  const beltGrad = ctx.createLinearGradient(0, BELT_Y, 0, BELT_Y + beltH);
  beltGrad.addColorStop(0, '#2a3545');
  beltGrad.addColorStop(1, '#111519');
  ctx.fillStyle = beltGrad;
  ctx.fillRect(0, BELT_Y, W, beltH);

  // belt stripes (moving)
  ctx.strokeStyle = 'rgba(245,158,11,.15)';
  ctx.lineWidth = 2;
  const offset = (Date.now() / 8) % 40;
  for (let x = -40 + offset; x < W + 40; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, BELT_Y); ctx.lineTo(x - 20, BELT_Y + beltH); ctx.stroke();
  }

  // rollers
  [20, W - 20].forEach(rx => {
    const rGrad = ctx.createRadialGradient(rx, BELT_Y + beltH/2, 2, rx, BELT_Y + beltH/2, 14);
    rGrad.addColorStop(0, '#627b95'); rGrad.addColorStop(1, '#232b35');
    ctx.fillStyle = rGrad;
    ctx.beginPath(); ctx.ellipse(rx, BELT_Y + beltH/2, 14, beltH/2 + 2, 0, 0, Math.PI*2); ctx.fill();
  });

  // support legs
  ctx.fillStyle = '#1e252f';
  [80, W/2, W-80].forEach(lx => { ctx.fillRect(lx - 5, BELT_Y + beltH, 10, H - BELT_Y - beltH); });

  // boxes
  SIM.boxes.forEach(b => {
    const by = BELT_Y - BOX_H;
    // box body
    ctx.fillStyle = b.counted ? 'rgba(16,185,129,.9)' : `hsla(${b.hue},70%,55%,.9)`;
    ctx.beginPath();
    ctx.roundRect ? ctx.roundRect(b.x - BOX_W/2, by, BOX_W, BOX_H, 4)
                  : ctx.rect(b.x - BOX_W/2, by, BOX_W, BOX_H);
    ctx.fill();
    // box border
    ctx.strokeStyle = b.counted ? 'rgba(16,185,129,1)' : `hsl(${b.hue},80%,70%)`;
    ctx.lineWidth = 1.5; ctx.stroke();
    // box label
    ctx.fillStyle = '#fff'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText('BOX', b.x, by + BOX_H/2 + 4);
    if (b.counted) {
      ctx.fillStyle = '#10b981'; ctx.font = 'bold 10px monospace';
      ctx.fillText('\u2713', b.x, by - 4);
    }
  });

  // ── SENSOR (WHITE, at start of belt) ──
  const sx = SENSOR_X;
  const sy = BELT_Y - BOX_H - 28;

  // sensor body — bright white
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#cccccc';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(sx - 14, sy - 14, 28, 28, 5)
                : ctx.rect(sx - 14, sy - 14, 28, 28);
  ctx.fill(); ctx.stroke();

  // sensor icon dot (dark on white)
  ctx.fillStyle = '#0b0d10';
  ctx.beginPath(); ctx.arc(sx, sy, 5, 0, Math.PI*2); ctx.fill();

  // sensor label
  ctx.fillStyle = '#ffffff'; ctx.font = 'bold 9px monospace'; ctx.textAlign = 'center';
  ctx.fillText('SENSOR', sx, sy + 26);

  // mounting post
  ctx.strokeStyle = '#627b95'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(sx, sy + 14); ctx.lineTo(sx, BELT_Y - BOX_H); ctx.stroke();

  // RED LASER BEAM — animated pulse
  const beamAlpha = SIM.running ? (0.5 + 0.5 * Math.sin(Date.now() / 120)) : 0.3;
  const beamGrad = ctx.createLinearGradient(sx, sy, sx + SENSOR_BEAM_LEN, sy);
  beamGrad.addColorStop(0, `rgba(239,68,68,${beamAlpha})`);
  beamGrad.addColorStop(0.7, `rgba(239,68,68,${beamAlpha * 0.6})`);
  beamGrad.addColorStop(1, 'rgba(239,68,68,0)');
  ctx.strokeStyle = beamGrad;
  ctx.lineWidth = 2.5;
  ctx.setLineDash([]);
  ctx.beginPath(); ctx.moveTo(sx + 14, sy); ctx.lineTo(sx + SENSOR_BEAM_LEN, sy); ctx.stroke();

  // beam glow
  ctx.strokeStyle = `rgba(239,68,68,${beamAlpha * 0.2})`;
  ctx.lineWidth = 6;
  ctx.beginPath(); ctx.moveTo(sx + 14, sy); ctx.lineTo(sx + SENSOR_BEAM_LEN * 0.8, sy); ctx.stroke();

  // sensor active dot (green when blocked)
  const blocked = SIM.boxes.some(b => Math.abs(b.x - sx) < BOX_W / 2);
  ctx.fillStyle = blocked ? '#ef4444' : (SIM.running ? '#10b981' : '#3d5068');
  ctx.beginPath(); ctx.arc(sx - 7, sy - 9, 4, 0, Math.PI*2); ctx.fill();

  // HUD
  ctx.fillStyle = 'rgba(11,13,16,.7)';
  ctx.beginPath(); ctx.roundRect ? ctx.roundRect(W - 180, 10, 168, 64, 6) : ctx.rect(W - 180, 10, 168, 64); ctx.fill();
  ctx.strokeStyle = 'rgba(245,158,11,.3)'; ctx.lineWidth = 1; ctx.stroke();
  ctx.fillStyle = '#627b95'; ctx.font = '10px monospace'; ctx.textAlign = 'left';
  ctx.fillText('TARGET', W - 168, 30);
  ctx.fillText('COUNTED', W - 168, 48);
  ctx.fillText('STATUS', W - 168, 64);
  ctx.fillStyle = '#f59e0b'; ctx.font = 'bold 11px monospace';
  ctx.fillText(SIM.target, W - 80, 30);
  ctx.fillText(SIM.count, W - 80, 48);
  ctx.fillStyle = SIM.running ? '#10b981' : '#ef4444';
  ctx.fillText(SIM.running ? 'RUNNING' : 'STOPPED', W - 80, 64);

  // grid lines
  ctx.strokeStyle = 'rgba(42,53,69,.4)'; ctx.lineWidth = 1; ctx.setLineDash([4,8]);
  for (let y = 20; y < BELT_Y - 10; y += 40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(W,y); ctx.stroke(); }
  ctx.setLineDash([]);

  if (SIM.running) requestAnimationFrame(() => simDraw());
}

/* ══════════════════════════════════════════════════
   MOBILE NAV
   ══════════════════════════════════════════════════ */
function toggleMobileNav() {
  const nav = document.getElementById('nav-mobile');
  const btn = document.getElementById('nav-hamburger');
  if (!nav) return;
  const open = nav.classList.toggle('open');
  btn.classList.toggle('open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}
document.addEventListener('click', e => {
  if (e.target.matches('.nav-mobile a')) {
    document.getElementById('nav-mobile')?.classList.remove('open');
    document.getElementById('nav-hamburger')?.classList.remove('open');
    document.body.style.overflow = '';
  }
});

/* ══════════════════════════════════════════════════
   SCROLL ANIMATIONS
   ══════════════════════════════════════════════════ */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 60);
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.06 });

/* ── Counter animation ── */
function animateNum(el, target, duration = 1000) {
  const start = parseInt(el.textContent) || 0;
  const diff = target - start;
  if (diff === 0) { el.textContent = target; return; }
  const steps = 40;
  const step = diff / steps;
  let cur = start; let s = 0;
  const t = setInterval(() => {
    cur += step; s++;
    el.textContent = Math.round(cur);
    if (s >= steps) { clearInterval(t); el.textContent = target; }
  }, duration / steps);
}

/* ══════════════════════════════════════════════════
   UTILS
   ══════════════════════════════════════════════════ */
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

/* ══════════════════════════════════════════════════
   INIT
   ══════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  // Visits
  incrementVisits();

  // Nickname
  updateNickUI();
  if (!NICK) {
    setTimeout(openNickModal, 800);
  }

  // Likes
  updateLikeUI();

  // Videos
  renderVideos();
  const statEl = document.getElementById('stat-videos');
  if (statEl) setTimeout(() => animateNum(statEl, VIDEOS.length), 600);

  // Comments
  renderComments();
  renderCommentForm();

  // HOF
  renderHOF();

  // Simulator
  simInit();

  // Scroll observer
  document.querySelectorAll('.fade-up').forEach(el => observer.observe(el));

  // Heartbeat for online simulation
  heartbeat();
  setInterval(heartbeat, 20000);
  updateOnlineBar();
  setInterval(updateOnlineBar, 5000);

  // Nick input enter key
  document.getElementById('nick-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') submitNick();
  });
});
