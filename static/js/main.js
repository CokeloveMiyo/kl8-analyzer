// ===== State =====
let currentAnalysis = null;
let currentPeriod = 50;
let currentSelect = 5;
let currentZone = 20;
let charts = {};
let dataFetched = false;

// ===== Canvas Particles =====
const canvas = document.getElementById('particleCanvas');
const ctx = canvas.getContext('2d');
let particles = [];

function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

class Particle {
  constructor() {
    this.reset();
    this.y = Math.random() * canvas.height;
  }
  reset() {
    this.x = Math.random() * canvas.width;
    this.y = canvas.height + 10;
    this.size = 1 + Math.random() * 2.5;
    this.speed = 0.3 + Math.random() * 0.8;
    this.opacity = 0.15 + Math.random() * 0.25;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = (Math.random() - 0.5) * 0.01;
  }
  update() {
    this.y -= this.speed;
    this.wobble += this.wobbleSpeed;
    this.x += Math.sin(this.wobble) * 0.3;
    if (this.y < -10) this.reset();
    if (this.x < -10) this.x = canvas.width + 10;
    if (this.x > canvas.width + 10) this.x = -10;
  }
  draw() {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(45,122,58,' + this.opacity + ')';
    ctx.fill();
  }
}

for (let i = 0; i < 60; i++) particles.push(new Particle());

function animateParticles() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles.forEach(p => { p.update(); p.draw(); });
  requestAnimationFrame(animateParticles);
}
animateParticles();

// ===== Color scale =====
function heatColor(freq, maxFreq) {
  const ratio = maxFreq > 0 ? freq / maxFreq : 0;
  if (ratio >= 0.85) return '#a84232';
  if (ratio >= 0.7) return '#c05a2c';
  if (ratio >= 0.55) return '#d4893a';
  if (ratio >= 0.4) return '#5a9a4a';
  if (ratio >= 0.25) return '#4a8a7a';
  return '#5a7a9a';
}

// ===== Toast =====
function showToast(msg, type) {
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + (type || 'success');
  toast.textContent = msg;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// ===== Sidebar Navigation =====
function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('.sidebar-link').forEach(link => {
  link.addEventListener('click', function(e) {
    e.preventDefault();
    document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
    this.classList.add('active');
    const target = document.querySelector(this.getAttribute('href'));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

// Highlight sidebar link on scroll
window.addEventListener('scroll', () => {
  const sections = ['section-fetch', 'section-analysis', 'section-predict', 'section-about'];
  let current = 'fetch';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && el.getBoundingClientRect().top < 200) {
      current = id.replace('section-', '');
    }
  });
  document.querySelectorAll('.sidebar-link').forEach(link => {
    link.classList.toggle('active', link.dataset.section === current);
  });
});

// ===== Update sidebar status =====
function setSidebarStatus(ready, text) {
  const dot = document.querySelector('.status-dot');
  const statusText = document.querySelector('.status-text');
  if (ready) dot.classList.add('ready'); else dot.classList.remove('ready');
  statusText.textContent = text;
}

// ===== Period buttons =====
document.querySelectorAll('.period-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.period-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentPeriod = parseInt(this.dataset.period);
  });
});

// ===== Select buttons =====
document.querySelectorAll('.select-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.select-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentSelect = parseInt(this.dataset.select);
  });
});

// ===== Zone buttons =====
document.querySelectorAll('.zone-btn').forEach(btn => {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
    this.classList.add('active');
    currentZone = parseInt(this.dataset.zone);
    if (currentAnalysis) renderZoneChart();
  });
});

// ===== Tab switching =====
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function() {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    this.classList.add('active');
    const target = document.getElementById('tab-' + this.dataset.tab);
    if (target) target.classList.add('active');
    if (!currentAnalysis) return;
    const t = this.dataset.tab;
    setTimeout(() => {
      if (t === 'size') renderSizeChart();
      if (t === 'oe') renderOEChart();
      if (t === 'prime') renderPrimeChart();
      if (t === 'sum') renderSumChart();
      if (t === 'ac') renderACChart();
      if (t === 'mantissa') renderMantissaChart();
      if (t === 'sumtail') renderSumTailChart();
      if (t === 'zone') renderZoneChart();
    }, 150);
  });
});

// ===== Fetch data =====
async function fetchData() {
  const loading = document.getElementById('loading');
  const analysisSection = document.getElementById('section-analysis');
  const btn = document.getElementById('btnFetch');

  loading.style.display = 'block';
  analysisSection.style.display = 'none';
  btn.disabled = true;
  btn.style.opacity = '0.5';

  try {
    const resp = await fetch('/api/fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_count: currentPeriod })
    });
    const data = await resp.json();
    if (data.success) {
      currentAnalysis = data.analysis;
      dataFetched = true;
      renderAll();
      analysisSection.style.display = 'block';

      
  if (data.recent_draws) { renderRecentDraws(data.recent_draws); }

// Update hero stats
      document.getElementById('heroStats').style.display = 'flex';
      document.getElementById('statPeriods').textContent = data.total_fetched;
      document.getElementById('statLatest').textContent = data.analysis.latest_draw.code;
      document.getElementById('statDate').textContent = data.analysis.latest_draw.date;

      // Enable predict button
      const predictBtn = document.getElementById('btnPredict');
      predictBtn.disabled = false;
      document.getElementById('predictHint').textContent = '已加载 ' + data.total_fetched + ' 期数据，选择玩法后开始预测';

      setSidebarStatus(true, '数据已就绪 (' + data.total_fetched + '期)');
      showToast('已加载 ' + data.total_fetched + ' 期数据', 'success');

      analysisSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      showToast('数据获取失败', 'error');
    }
  } catch (e) {
    showToast('请求失败: ' + e.message, 'error');
  } finally {
    loading.style.display = 'none';
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}


// ===== AI Thinking Animation =====
let aiThinkingTimer = null;

function startAIThinking() {
  const thinkDiv = document.getElementById('aiThinking');
  const resultDiv = document.getElementById('predictionResult');
  resultDiv.innerHTML = '';
  resultDiv.style.display = 'none';
  thinkDiv.style.display = 'block';
  thinkDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });

  // Reset all steps
  document.querySelectorAll('.ai-step').forEach(s => s.classList.remove('done', 'active'));
  document.querySelectorAll('.ai-step-text').forEach(s => s.style.textDecoration = '');

  const steps = ['aiStep1', 'aiStep2', 'aiStep3', 'aiStep4', 'aiStep5'];
  let current = 0;

  function advanceStep() {
    if (current > 0) {
      const prev = document.getElementById(steps[current - 1]);
      if (prev) { prev.classList.remove('active'); prev.classList.add('done'); }
    }
    if (current < steps.length) {
      const el = document.getElementById(steps[current]);
      if (el) el.classList.add('active');
    }
    current++;
    if (current <= steps.length) {
      aiThinkingTimer = setTimeout(advanceStep, 800);
    }
  }

  advanceStep();

  // Return stop function
  return () => {
    if (aiThinkingTimer) { clearTimeout(aiThinkingTimer); aiThinkingTimer = null; }
    steps.forEach(s => {
      const el = document.getElementById(s);
      if (el) { el.classList.remove('active'); el.classList.add('done'); }
    });
    setTimeout(() => { const td = document.getElementById('aiThinking'); if (td) { td.style.display = 'none'; } }, 300);
  };
}

// ===== Predict =====// ===== Predict =====

async function doPredict() {
  if (!dataFetched) { showToast('请先获取数据', 'error'); return; }

  const btn = document.getElementById('btnPredict');
  btn.disabled = true;
  const stopThinking = startAIThinking();

  try {
    const resp = await fetch('/api/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ issue_count: currentPeriod, select_type: currentSelect })
    });

    const data = await resp.json();
    stopThinking();

    if (data.success) {
      renderPrediction(data);
    } else {
      document.getElementById('predictionResult').innerHTML =
        '<div class="pred-card"><div class="pred-error">' + (data.error || '预测失败') + '</div></div>';
      document.getElementById('predictionResult').style.display = 'block';
    }
  } catch (e) {
    stopThinking();
    document.getElementById('predictionResult').innerHTML =
      '<div class="pred-card"><div class="pred-error">网络请求失败: ' + e.message + '</div></div>';
    document.getElementById('predictionResult').style.display = 'block';
  } finally {
    btn.disabled = false;
  }
}

function renderRecentDraws(draws) {
  const container = document.getElementById('recentDraws');
  const list = document.getElementById('recentDrawsList');
  const showCount = Math.min(draws.length, 10);
  let html = '';
  for (let i = 0; i < showCount; i++) {
    const d = draws[i];
    const nums = d.red.sort((a, b) => a - b);
    html += '<div class="recent-draw-row">';
    html += '<span class="recent-draw-code">' + d.code + '</span>';
    html += '<span class="recent-draw-date">' + (d.date || '') + '</span>';
    html += '<span class="recent-draw-balls">';
    nums.forEach(n => { html += '<span class="recent-ball">' + n + '</span>'; });
    html += '</span></div>';
  }
  if (draws.length > showCount) {
    html += '<div class="recent-draw-ellipsis">··· 更多历史数据 ···</div>';
  }
  list.innerHTML = html;
  container.style.display = 'block';
}
function renderPrediction(data) {
  document.getElementById("aiThinking").style.display = "none";
  const pred = data.prediction || {};
  const nums = pred.recommended_numbers || [];
  const reasons = pred.reasons || {};
  const summary = pred.summary || '';
  const err = pred.error || '';

  let html = '<div class="pred-card">';
  html += '<h3>AI ' + data.select_name + ' 推荐号码</h3>';

  html += '<div class="pred-numbers">';
  nums.forEach(n => { html += '<div class="pred-ball">' + n + '</div>'; });
  html += '</div>';

  if (Object.keys(reasons).length > 0 && (reasons[nums[0]] || reasons[String(nums[0])])) {
    html += '<div class="pred-reasons">';
    nums.forEach(n => {
      const reason = reasons[n] || reasons[String(n)] || '';
      html += '<div class="pred-reason-item"><span class="pred-reason-num">' + n + '</span><span>' + reason + '</span></div>';
    });
    html += '</div>';
  }

  const isFallback = summary.indexOf('解析失败') !== -1 || summary.indexOf('备用算法') !== -1;
  if (summary && !isFallback) {
    html += '<div class="pred-summary">' + summary + '</div>';
  } else if (summary) {
    html += '<div class="pred-error">' + summary + '</div>';
  }
  if (err) html += '<div class="pred-error" style="margin-top:10px">' + err + '</div>';

  html += '</div>';
  const resultDiv = document.getElementById('predictionResult');
  resultDiv.innerHTML = html;
  resultDiv.style.display = 'block';
  resultDiv.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ===== Charts helpers =====
function destroyChart(key) { if (charts[key]) { charts[key].destroy(); delete charts[key]; } }
function getLabels(data) { return data.slice(-40).map(d => d.code.slice(-3)); }

function renderAll() {
  renderHeatmap();
  renderFreqTable();
  renderHotCold();
  const activeTab = document.querySelector('.tab.active');
  if (activeTab) {
    const t = activeTab.dataset.tab;
    if (t === 'size') renderSizeChart();
    if (t === 'oe') renderOEChart();
    if (t === 'prime') renderPrimeChart();
    if (t === 'sum') renderSumChart();
    if (t === 'ac') renderACChart();
    if (t === 'mantissa') renderMantissaChart();
    if (t === 'sumtail') renderSumTailChart();
    if (t === 'zone') renderZoneChart();
  }
}

function renderHeatmap() {
  const freq = currentAnalysis.basic_trend.frequency;
  const maxFreq = Math.max(...Object.values(freq));
  const div = document.getElementById('heatmap');
  let html = '';
  for (let i = 1; i <= 80; i++) {
    const f = freq[i] || 0;
    html += '<div class="heatmap-cell" style="background:' + heatColor(f, maxFreq) + '" title="' + i + ': ' + f + '次">' + i + '</div>';
  }
  div.innerHTML = html;
}

function renderFreqTable() {
  const base = currentAnalysis.basic_trend;
  const freq = base.frequency, missing = base.current_missing, avgMiss = base.avg_missing, maxMiss = base.max_missing;
  let html = '<table class="data-table"><thead><tr><th>号码</th><th>出现次数</th><th>当前遗漏</th><th>平均遗漏</th><th>最大遗漏</th></tr></thead><tbody>';
  for (let i = 1; i <= 80; i++) {
    html += '<tr><td><strong>' + i + '</strong></td><td>' + (freq[i] || 0) + '</td><td>' + (missing[i] || 0) + '</td><td>' + (avgMiss[i] || 0) + '</td><td>' + (maxMiss[i] || 0) + '</td></tr>';
  }
  html += '</tbody></table>';
  document.getElementById('freqTable').innerHTML = html;
}

function renderHotCold() {
  const hc = currentAnalysis.hot_cold_analysis;
  let html = '<div class="hc-grid">';
  html += '<div class="hc-card"><h4>热门号码</h4><div class="badge-list">';
  hc.hot.forEach(item => { html += '<span class="badge badge-hot">' + item.number + ' (' + item.appearances + '次)</span>'; });
  html += '</div></div>';
  html += '<div class="hc-card"><h4>冷门号码</h4><div class="badge-list">';
  hc.cold.forEach(item => { html += '<span class="badge badge-cold">' + item.number + ' (' + item.appearances + '次)</span>'; });
  html += '</div></div>';
  html += '<div class="hc-card"><h4>遗漏最久</h4><div class="badge-list">';
  hc.most_missing.forEach(item => { html += '<span class="badge badge-miss">' + item.number + ' (' + item.periods_missing + '期)</span>'; });
  html += '</div></div></div>';
  document.getElementById('hotColdTable').innerHTML = html;
}

// ===== Chart renderers =====
function renderSizeChart() {
  destroyChart('size');
  const data = currentAnalysis.size_trend;
  const ctx = document.getElementById('chartSize').getContext('2d');
  charts.size = new Chart(ctx, {
    type: 'line',
    data: { labels: getLabels(data), datasets: [
      { label: '大号(≥41)', data: data.slice(-40).map(d => d.big), borderColor: '#c05a2c', backgroundColor: 'rgba(192,90,44,0.06)', fill: true, tension: 0.35, pointRadius: 0 },
      { label: '小号(≤40)', data: data.slice(-40).map(d => d.small), borderColor: '#5a7a9a', backgroundColor: 'rgba(90,122,154,0.06)', fill: true, tension: 0.35, pointRadius: 0 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderOEChart() {
  destroyChart('oe');
  const data = currentAnalysis.odd_even_trend;
  const ctx = document.getElementById('chartOE').getContext('2d');
  charts.oe = new Chart(ctx, {
    type: 'line',
    data: { labels: getLabels(data), datasets: [
      { label: '奇数', data: data.slice(-40).map(d => d.odd), borderColor: '#c05a2c', backgroundColor: 'rgba(192,90,44,0.06)', fill: true, tension: 0.35, pointRadius: 0 },
      { label: '偶数', data: data.slice(-40).map(d => d.even), borderColor: '#5a9a4a', backgroundColor: 'rgba(90,154,74,0.06)', fill: true, tension: 0.35, pointRadius: 0 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderPrimeChart() {
  destroyChart('prime');
  const data = currentAnalysis.prime_composite_trend;
  const ctx = document.getElementById('chartPrime').getContext('2d');
  charts.prime = new Chart(ctx, {
    type: 'line',
    data: { labels: getLabels(data), datasets: [
      { label: '质数', data: data.slice(-40).map(d => d.prime), borderColor: '#7b5ea7', backgroundColor: 'rgba(123,94,167,0.06)', fill: true, tension: 0.35, pointRadius: 0 },
      { label: '合数', data: data.slice(-40).map(d => d.composite), borderColor: '#4a8a7a', backgroundColor: 'rgba(74,138,122,0.06)', fill: true, tension: 0.35, pointRadius: 0 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, interaction: { intersect: false, mode: 'index' }, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderSumChart() {
  destroyChart('sum');
  const data = currentAnalysis.sum_trend;
  const ctx = document.getElementById('chartSum').getContext('2d');
  charts.sum = new Chart(ctx, {
    type: 'line',
    data: { labels: getLabels(data), datasets: [
      { label: '和值', data: data.slice(-40).map(d => d.sum), borderColor: '#2d7a3a', backgroundColor: 'rgba(45,122,58,0.05)', fill: true, tension: 0.35, pointRadius: 0, borderWidth: 2 }
    ]},
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderACChart() {
  destroyChart('ac');
  const data = currentAnalysis.ac_trend;
  const ctx = document.getElementById('chartAC').getContext('2d');
  charts.ac = new Chart(ctx, {
    type: 'bar',
    data: { labels: getLabels(data), datasets: [{ label: 'AC值', data: data.slice(-40).map(d => d.ac), backgroundColor: '#2d7a3a', borderRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderMantissaChart() {
  destroyChart('mantissa');
  const ma = currentAnalysis.mantissa_analysis;
  const ctx = document.getElementById('chartMantissa').getContext('2d');
  charts.mantissa = new Chart(ctx, {
    type: 'bar',
    data: { labels: [0,1,2,3,4,5,6,7,8,9].map(i => '尾' + i), datasets: [{ label: '出现次数', data: [0,1,2,3,4,5,6,7,8,9].map(i => ma.counts[i] || 0), backgroundColor: '#c05a2c', borderRadius: 6 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
  });
}

function renderSumTailChart() {
  destroyChart('sumtail');
  const data = currentAnalysis.sum_tail_trend;
  const ctx = document.getElementById('chartSumTail').getContext('2d');
  charts.sumtail = new Chart(ctx, {
    type: 'line',
    data: { labels: getLabels(data), datasets: [{ label: '和尾', data: data.slice(-40).map(d => d.sum_tail), borderColor: '#a84232', backgroundColor: 'rgba(168,66,50,0.06)', fill: true, tension: 0.3, pointRadius: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } }, scales: { y: { min: 0, max: 9, ticks: { stepSize: 1 } } } }
  });
}

function renderZoneChart() {
  destroyChart('zone');
  const key = 'zone_' + currentZone;
  const data = currentAnalysis[key] || [];
  const datasets = [];
  const colors = ['#a84232','#c05a2c','#d4893a','#5a9a4a','#5a7a9a','#7b5ea7','#4a8a7a','#c05a2c','#5a7a9a','#4a8a7a','#7b5ea7','#a84232','#5a9a4a','#8a7a5a','#5a9a4a','#7a8a9a','#8a9a5a','#c05a2c','#4a8a7a','#9a8ab0'];
  for (let i = 0; i < currentZone; i++) {
    datasets.push({ label: '区' + (i + 1), data: data.slice(-40).map(d => d['zone_' + (i + 1)] || 0), borderColor: colors[i % colors.length], backgroundColor: 'transparent', tension: 0.2, pointRadius: 0 });
  }
  const ctx = document.getElementById('chartZone').getContext('2d');
  charts.zone = new Chart(ctx, {
    type: 'line', data: { labels: getLabels(data), datasets },
    options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } } }
  });
}

// ===== Button handlers =====
document.getElementById('btnFetch').addEventListener('click', fetchData);
document.getElementById('btnPredict').addEventListener('click', doPredict);










