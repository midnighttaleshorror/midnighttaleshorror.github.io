/* Shared site logic: ember background, data loading, tab pages, slider, song player */
(function(){
'use strict';

/* ---------- ember background ---------- */
(function(){
const canvas = document.getElementById('ember-canvas');
  const ctx = canvas.getContext('2d');
  let W,H;
  function resize(){ W=canvas.width=innerWidth; H=canvas.height=innerHeight; }
  resize(); addEventListener('resize', resize);

  const embers = Array.from({length:55}, () => spawnEmber());
  function spawnEmber(){
    return {
      x: Math.random()*W, y: H + Math.random()*100,
      r: 0.6 + Math.random()*2.2, speed: 0.3 + Math.random()*0.9,
      drift: (Math.random()-0.5)*0.6, hue: Math.random() > 0.25 ? 20 : 190,
      alpha: 0.15 + Math.random()*0.55
    };
  }
  function tick(){
    ctx.clearRect(0,0,W,H);
    embers.forEach(e=>{
      e.y -= e.speed;
      e.x += e.drift + Math.sin(e.y*0.01)*0.3;
      if(e.y < -20){ Object.assign(e, spawnEmber(), {y: H+20}); }
      ctx.beginPath();
      ctx.fillStyle = e.hue === 20
        ? `rgba(255,${90+Math.random()*40|0},30,${e.alpha})`
        : `rgba(57,247,255,${e.alpha*0.6})`;
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 6;
      ctx.arc(e.x, e.y, e.r, 0, Math.PI*2);
      ctx.fill();
    });
    requestAnimationFrame(tick);
  }
  tick();

  
})();

/* ---------- helpers ---------- */
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const safeLink = u => /^https?:\/\//i.test(u || '') ? u : '';
const pageUrl = id => 'page.html?tab=' + encodeURIComponent(id);
const $ = s => document.querySelector(s);

/* ---------- data (data.json is edited through admin.html) ---------- */
function normalize(d){
  d = d || {};
  if(!Array.isArray(d.tabs)){
    // old format: { news, gallery, series, songs }
    d.tabs = [
      { id:'news',    label:'News',         type:'news',    items:d.news    || [] },
      { id:'gallery', label:'Gallery',      type:'gallery', items:d.gallery || [] },
      { id:'series',  label:'Watch Series', type:'series',  items:d.series  || [] },
      { id:'songs',   label:'Songs',        type:'songs',   items:d.songs   || [] }
    ];
  }
  d.slider = Array.isArray(d.slider) ? d.slider : [];
  d.tabs.forEach(t => { t.items = Array.isArray(t.items) ? t.items : []; if(t.home === undefined) t.home = true; });
  return d;
}
function loadData(){
  return fetch('data.json?t=' + Date.now(), { cache:'no-store' })
    .then(r => r.ok ? r.json() : Promise.reject(new Error('data.json not found')))
    .then(normalize);
}

/* ---------- renderers (one per tab type) ---------- */
const R = {
  news(items){
    return `<div class="news-list">` + items.map(n => `
      <article class="news-item ${n.img ? '' : 'no-img'}">
        ${n.img ? `<div class="art-card"><img src="${esc(encodeURI(n.img))}" alt="${esc(n.title)}" loading="lazy"></div>` : ''}
        <div class="news-body">
          <h3>${esc(n.title)}</h3>
          ${n.text ? `<p>${esc(n.text)}</p>` : ''}
        </div>
      </article>`).join('') + `</div>`;
  },
  gallery(items){
    return `<div class="gallery-grid">` + items.map(a => `
      <div class="art-card">
        <img src="${esc(encodeURI(a.img))}" alt="${esc(a.title)}" loading="lazy">
        <div class="tag">${esc(a.title)}</div>
      </div>`).join('') + `</div>`;
  },
  series(items, tab){
    return `<div class="terminal">
      <div class="terminal-bar"><span style="background:#ff5f57"></span><span style="background:#febc2e"></span><span style="background:#28c840"></span></div>
      <ul class="series-list">` + items.map((s,i) => `
        <li>
          <span class="series-num">${String(i+1).padStart(2,'0')}</span>
          <span class="series-title">${esc(s.title)}</span>
          <span class="series-genre">${esc(s.genre)}</span>
          <a class="series-status" href="${esc(safeLink(s.link) || '#')}" target="_blank" rel="noopener">WATCH NOW</a>
        </li>`).join('') + `</ul>
      ${tab.footer ? `<div class="cursor-line">${esc(tab.footer)}<span class="blink"></span></div>` : ''}
    </div>`;
  },
  songs(items, tab){
    return `<div class="terminal">
      <div class="terminal-bar"><span style="background:#ff5f57"></span><span style="background:#febc2e"></span><span style="background:#28c840"></span></div>
      <ul class="series-list songs-list">` + items.map((s,i) => `
        <li>
          <span class="series-num">${String(i+1).padStart(2,'0')}</span>
          <span class="series-title">${esc(s.title)}</span>
          <span class="series-genre">${esc(s.genre)}</span>
          <a class="song-status" href="#" data-src="${esc(encodeURI(s.file))}">PLAY NOW</a>
          <a class="song-download" href="${esc(encodeURI(s.file))}" download="${esc((s.file || '').split('/').pop())}">
            <svg viewBox="0 0 24 24"><path d="M12 3v10.5m0 0 4-4m-4 4-4-4M5 19h14"/></svg>
            DOWNLOAD
          </a>
        </li>`).join('') + `</ul>
      ${tab.footer ? `<div class="cursor-line">${esc(tab.footer)}<span class="blink"></span></div>` : ''}
    </div>`;
  }
};

function sectionHTML(tab, num){
  const body = (R[tab.type] || R.news)(tab.items, tab);
  const inner = tab.items.length ? body : `<div class="empty-note">Nothing here yet.</div>`;
  return `
  <section id="tab-${esc(tab.id)}" class="tab-section ${esc(tab.type)}">
    <div class="sec-head">
      ${num ? `<span class="sec-num">${String(num).padStart(2,'0')}</span>` : ''}
      <h2>${esc(tab.label)}</h2>
      <div class="rule"></div>
      ${num ? `<a class="view-all" href="${pageUrl(tab.id)}">VIEW PAGE →</a>` : ''}
    </div>
    ${tab.note ? `<p class="gallery-note">${esc(tab.note)}</p>` : ''}
    ${inner}
  </section>`;
}

/* ---------- tab bar + top nav ---------- */
function renderTabbar(d, activeId){
  const el = $('#tabbar'); if(!el) return;
  el.innerHTML = `<a href="./" class="${activeId === '' ? 'active' : ''}">Home</a>` +
    d.tabs.map(t => `<a href="${pageUrl(t.id)}" class="${activeId === t.id ? 'active' : ''}">${esc(t.label)}</a>`).join('');
}
function renderNav(d, activeId, onHome){
  const el = $('#navLinks'); if(!el) return;
  let html = onHome ? '' : `<li><a href="./">Home</a></li>`;
  html += d.tabs.map(t => {
    const href = onHome && t.home ? '#tab-' + t.id : pageUrl(t.id);
    return `<li><a href="${esc(href)}" class="${activeId === t.id ? 'active' : ''}">${esc(t.label)}</a></li>`;
  }).join('');
  el.innerHTML = html;
}

/* ---------- image slider ---------- */
function initSlider(d){
  const box = $('#sliderBox'); if(!box) return;
  const slides = d.slider.filter(s => s.img);
  if(!slides.length){ box.parentElement.classList.add('hidden-slider'); box.parentElement.style.display = 'none'; return; }

  box.innerHTML = `
    <div class="track">` + slides.map(s => {
      const href = safeLink(s.link);
      const cap = s.title ? `<div class="cap"><span>${esc(s.title)}</span>${href ? '<span class="go">OPEN ↗</span>' : ''}</div>` : '';
      const img = `<img src="${esc(encodeURI(s.img))}" alt="${esc(s.title || 'Slide')}" draggable="false">${cap}`;
      return href
        ? `<a class="slide" href="${esc(href)}" target="_blank" rel="noopener">${img}</a>`
        : `<div class="slide">${img}</div>`;
    }).join('') + `</div>` +
    (slides.length > 1 ? `
      <button class="nav-btn prev" type="button" aria-label="Previous slide">‹</button>
      <button class="nav-btn next" type="button" aria-label="Next slide">›</button>
      <div class="dots">` + slides.map((_, i) => `<button type="button" aria-label="Slide ${i+1}" data-i="${i}"></button>`).join('') + `</div>` : '');

  if(slides.length < 2) return;

  const track = box.querySelector('.track');
  const dots = [...box.querySelectorAll('.dots button')];
  const DELAY = 4500;
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  let idx = 0, timer = null, paused = false;

  function go(i){
    idx = (i + slides.length) % slides.length;
    track.style.transform = `translateX(${-idx * 100}%)`;
    dots.forEach((b, k) => b.classList.toggle('on', k === idx));
  }
  function stop(){ clearInterval(timer); timer = null; }
  function start(){ stop(); if(!reduce && !paused) timer = setInterval(() => go(idx + 1), DELAY); }
  function user(fn){ fn(); start(); }

  box.querySelector('.prev').addEventListener('click', () => user(() => go(idx - 1)));
  box.querySelector('.next').addEventListener('click', () => user(() => go(idx + 1)));
  dots.forEach(b => b.addEventListener('click', () => user(() => go(+b.dataset.i))));
  box.addEventListener('mouseenter', () => { paused = true; stop(); });
  box.addEventListener('mouseleave', () => { paused = false; start(); });
  document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());

  // swipe (finger or mouse); a drag never counts as a click on the image link
  let sx = null, dx = 0, moved = false;
  box.addEventListener('pointerdown', e => {
    if(e.target.closest('.nav-btn, .dots')) return;
    sx = e.clientX; dx = 0; moved = false; track.style.transition = 'none';
  });
  box.addEventListener('pointermove', e => {
    if(sx === null) return;
    dx = e.clientX - sx;
    if(Math.abs(dx) > 8) moved = true;
    if(moved) track.style.transform = `translateX(calc(${-idx * 100}% + ${dx}px))`;
  });
  function endDrag(){
    if(sx === null) return;
    track.style.transition = '';
    const d0 = dx; sx = null;
    if(d0 > 50) user(() => go(idx - 1));
    else if(d0 < -50) user(() => go(idx + 1));
    else go(idx);
  }
  box.addEventListener('pointerup', endDrag);
  box.addEventListener('pointercancel', endDrag);
  box.addEventListener('pointerleave', endDrag);
  box.addEventListener('click', e => { if(moved){ e.preventDefault(); e.stopPropagation(); moved = false; } }, true);

  go(0); start();
}

/* ---------- one audio player for every song list ---------- */
function initPlayer(){
  const audio = new Audio();
  let activeBtn = null;
  const reset = b => { b.textContent = 'PLAY NOW'; b.classList.remove('playing'); };
  document.addEventListener('click', e => {
    const btn = e.target.closest('.song-status'); if(!btn) return;
    e.preventDefault();
    if(activeBtn === btn && !audio.paused){ audio.pause(); reset(btn); activeBtn = null; return; }
    if(activeBtn && activeBtn !== btn) reset(activeBtn);
    audio.src = btn.getAttribute('data-src');
    audio.play().catch(() => { btn.textContent = 'ERROR'; setTimeout(() => reset(btn), 1500); });
    btn.textContent = 'PAUSE'; btn.classList.add('playing'); activeBtn = btn;
  });
  audio.addEventListener('ended', () => { if(activeBtn) reset(activeBtn); activeBtn = null; });
}

/* ---------- entry points ---------- */
window.DP = {
  initHome(){
    initPlayer();
    loadData().then(d => {
      renderNav(d, '', true);
      renderTabbar(d, '');
      initSlider(d);
      let n = 0;
      $('#homeSections').innerHTML = d.tabs.filter(t => t.home).map(t => sectionHTML(t, ++n)).join('');
    }).catch(() => { $('#homeSections').innerHTML = '<div class="empty-note">Could not load content.</div>'; });
  },
  initPage(){
    initPlayer();
    const id = new URLSearchParams(location.search).get('tab') || '';
    loadData().then(d => {
      const tab = d.tabs.find(t => t.id === id);
      renderNav(d, id, false);
      renderTabbar(d, tab ? id : null);
      if(!tab){ $('#pageBody').innerHTML = '<div class="empty-note">This page was not found. Choose a tab above.</div>'; return; }
      document.title = tab.label + ' | Dark Phoenix: The AI Butcher';
      $('#pageBody').innerHTML = sectionHTML(tab, 0);
    }).catch(() => { $('#pageBody').innerHTML = '<div class="empty-note">Could not load content.</div>'; });
  }
};
})();
