// ─── CONFIG ───────────────────────────────────────────────────────────────────
const PROJECTS = {
  'SIGSUAS': { label: 'SIGSUAS', client: 'Múltiplos clientes', desc: 'Sistema de assistência social em diversos âmbitos' },
  'SIGP': { label: 'SIGP', client: 'Múltiplos clientes', desc: 'Sistema de folha de pagamento e E-social' },
  'Iplanrio': { label: 'Gestão Cultural', client: 'Iplanrio', desc: 'Sistema de gestão e fomento cultural' },
  'Procuradoria Fiscal': { label: 'Procuradoria Fiscal', client: 'Produto interno', desc: 'Plataforma integrada de procuradoria fiscal automatizada' }
};

let supabaseClient = null;
let selectedFiles = [];
let allTranscriptions = [];

// ─── INIT ──────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  initSupabase();
  initNav();
  initDropZone();
  setDefaultDates();
  loadTranscriptions();
});

function loadSettings() {
  document.getElementById('anthropicKey').value = localStorage.getItem('anthropicKey') || '';
  document.getElementById('supabaseUrl').value = localStorage.getItem('supabaseUrl') || '';
  document.getElementById('supabaseKey').value = localStorage.getItem('supabaseKey') || '';
}

function saveSettings() {
  const key = document.getElementById('anthropicKey').value.trim();
  const url = document.getElementById('supabaseUrl').value.trim();
  const sbKey = document.getElementById('supabaseKey').value.trim();

  if (!key || !url || !sbKey) {
    showFeedback('settingsFeedback', 'Preencha todos os campos.', 'error');
    return;
  }

  localStorage.setItem('anthropicKey', key);
  localStorage.setItem('supabaseUrl', url);
  localStorage.setItem('supabaseKey', sbKey);
  showFeedback('settingsFeedback', 'Configurações salvas com sucesso!', 'success');
  initSupabase();
}

function initSupabase() {
  let url = localStorage.getItem('supabaseUrl');
  const key = localStorage.getItem('supabaseKey');
  if (url && key) {
    try {
      // Support new sb_publishable_ key format — extract project ref and build URL
      if (key.startsWith('sb_publishable_') || key.startsWith('sb_secret_')) {
        // Extract project ref from the supabase key or URL
        if (!url || url === 'https://xxxx.supabase.co') {
          // Try to get URL from stored value
          url = localStorage.getItem('supabaseUrl');
        }
      }
      // Ensure URL has correct format
      if (url && !url.startsWith('http')) {
        url = 'https://' + url;
      }
      if (url && !url.includes('supabase.co') && !url.includes('supabase.')) {
        url = url + '.supabase.co';
      }
      supabaseClient = supabase.createClient(url, key);
    } catch(e) {
      console.error('Supabase init error:', e);
    }
  }
}

// ─── NAVIGATION ───────────────────────────────────────────────────────────────
function initNav() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', e => {
      e.preventDefault();
      const page = item.dataset.page;
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      item.classList.add('active');
      document.getElementById('page-' + page).classList.add('active');
      if (page === 'files') loadTranscriptions();
    });
  });
}

// ─── DROP ZONE ────────────────────────────────────────────────────────────────
function initDropZone() {
  const zone = document.getElementById('dropZone');
  const input = document.getElementById('fileInput');

  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('drag'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('drag'));
  zone.addEventListener('drop', e => {
    e.preventDefault();
    zone.classList.remove('drag');
    handleFileSelect(Array.from(e.dataTransfer.files));
  });

  input.addEventListener('change', () => {
    handleFileSelect(Array.from(input.files));
  });
}

function handleFileSelect(files) {
  const valid = files.filter(f => f.type === 'application/pdf' || f.name.endsWith('.txt'));
  if (!valid.length) {
    showFeedback('uploadFeedback', 'Apenas arquivos PDF ou TXT são aceitos.', 'error');
    return;
  }
  selectedFiles = valid;
  renderFileList();
  document.getElementById('uploadMeta').style.display = 'block';

  // Auto-fill date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('uploadDate').value = today;
}

function renderFileList() {
  const list = document.getElementById('fileList');
  list.innerHTML = selectedFiles.map(f => `
    <div class="file-item">
      <div class="file-card-icon icon-SIGSUAS" style="font-size:10px;font-weight:700;width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;">PDF</div>
      <span class="file-item-name">${f.name}</span>
      <span class="file-item-size">${(f.size / 1024).toFixed(0)} KB</span>
    </div>
  `).join('');
}

// ─── UPLOAD ────────────────────────────────────────────────────────────────────
async function uploadFiles() {
  if (!checkConfig()) return;

  const project = document.getElementById('uploadProject').value;
  const date = document.getElementById('uploadDate').value;
  const context = document.getElementById('uploadContext').value;

  if (!project || !date) {
    showFeedback('uploadFeedback', 'Selecione o projeto e a data da reunião.', 'error');
    return;
  }

  const btn = document.getElementById('uploadBtn');
  btn.disabled = true;
  btn.innerHTML = '<div class="spinner" style="width:16px;height:16px;border-width:2px"></div> Processando...';

  let success = 0;
  for (const file of selectedFiles) {
    try {
      const content = await readFileContent(file);
      const { error } = await supabaseClient.from('transcriptions').insert({
        project,
        meeting_date: date,
        context: context || null,
        filename: file.name,
        content
      });
      if (!error) success++;
      else console.error('Upload error:', error);
    } catch(e) {
      console.error('File read error:', e);
    }
  }

  btn.disabled = false;
  btn.innerHTML = '<svg width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M16 8l-4-4-4 4M12 4v12"/></svg> Fazer upload';

  if (success > 0) {
    showFeedback('uploadFeedback', `${success} arquivo(s) enviado(s) com sucesso!`, 'success');
    selectedFiles = [];
    document.getElementById('fileList').innerHTML = '';
    document.getElementById('uploadMeta').style.display = 'none';
    document.getElementById('fileInput').value = '';
    document.getElementById('uploadContext').value = '';
    updateSidebarCounts();
  } else {
    showFeedback('uploadFeedback', 'Erro ao salvar. Verifique as configurações do Supabase.', 'error');
  }
}

async function readFileContent(file) {
  if (file.name.endsWith('.txt')) {
    return new Promise((res, rej) => {
      const r = new FileReader();
      r.onload = () => res(r.result);
      r.onerror = rej;
      r.readAsText(file);
    });
  }
  // PDF: extract text via Claude API
  const base64 = await fileToBase64(file);
  const apiKey = localStorage.getItem('anthropicKey');
  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } },
          { type: 'text', text: 'Extraia todo o texto desta transcrição de reunião. Retorne apenas o texto puro, sem formatação adicional.' }
        ]
      }]
    })
  });
  const data = await resp.json();
  return data.content?.map(i => i.text || '').join('') || '';
}

function fileToBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result.split(',')[1]);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

// ─── LOAD TRANSCRIPTIONS ───────────────────────────────────────────────────────
async function loadTranscriptions(filter = 'all') {
  if (!supabaseClient) return;

  let query = supabaseClient.from('transcriptions').select('*').order('meeting_date', { ascending: false });
  if (filter !== 'all') query = query.eq('project', filter);

  const { data, error } = await query;
  if (error) { console.error(error); return; }

  allTranscriptions = data || [];
  renderFileGrid(allTranscriptions);
  updateSidebarCounts();
}

function renderFileGrid(items) {
  const grid = document.getElementById('fileGrid');
  if (!items.length) {
    grid.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" fill="none" stroke="currentColor" stroke-width="1" viewBox="0 0 24 24"><path d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V7z"/></svg>
        <p>Nenhuma transcrição encontrada</p>
        <span>Faça o upload de PDFs do Tactique para começar</span>
      </div>`;
    return;
  }

  const projKey = p => p === 'Procuradoria Fiscal' ? 'Procuradoria' : p;

  grid.innerHTML = items.map(t => `
    <div class="file-card">
      <div class="file-card-header">
        <div class="file-card-icon icon-${projKey(t.project)}">PDF</div>
        <div class="file-card-info">
          <div class="file-card-name">${t.filename}</div>
          <div class="file-card-date">${formatDate(t.meeting_date)}</div>
        </div>
      </div>
      <div>
        <span class="file-card-proj proj-${projKey(t.project)}">${t.project}</span>
      </div>
      ${t.context ? `<div class="file-card-context">${t.context}</div>` : ''}
      <div class="file-card-footer">
        <button class="btn-delete" onclick="deleteFile('${t.id}')">Excluir</button>
      </div>
    </div>
  `).join('');
}

function filterFiles(filter, btn) {
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  loadTranscriptions(filter);
}

async function deleteFile(id) {
  if (!confirm('Excluir esta transcrição?')) return;
  const { error } = await supabaseClient.from('transcriptions').delete().eq('id', id);
  if (!error) loadTranscriptions();
}

function updateSidebarCounts() {
  const counts = {};
  allTranscriptions.forEach(t => { counts[t.project] = (counts[t.project] || 0) + 1; });
  const badges = document.getElementById('sidebarBadges');
  badges.innerHTML = Object.entries(PROJECTS).map(([key, val]) => `
    <div class="proj-badge">
      <span>${val.label}</span>
      <span class="proj-badge-count">${counts[key] || 0}</span>
    </div>
  `).join('');
}

// ─── GENERATE ─────────────────────────────────────────────────────────────────
function setDefaultDates() {
  const today = new Date();
  const monday = new Date(today);
  monday.setDate(today.getDate() - today.getDay() + 1);
  const friday = new Date(monday);
  friday.setDate(monday.getDate() + 4);
  document.getElementById('genDateStart').value = monday.toISOString().split('T')[0];
  document.getElementById('genDateEnd').value = friday.toISOString().split('T')[0];
}

async function generateReports() {
  if (!checkConfig()) return;

  const dateStart = document.getElementById('genDateStart').value;
  const dateEnd = document.getElementById('genDateEnd').value;
  const selectedProjects = Array.from(document.querySelectorAll('.check-group input:checked')).map(i => i.value);

  if (!dateStart || !dateEnd || !selectedProjects.length) {
    alert('Selecione o período e ao menos um projeto.');
    return;
  }

  document.getElementById('genLoading').style.display = 'block';
  document.getElementById('genResults').innerHTML = '';

  const msgs = ['Buscando transcrições...', 'Lendo os arquivos...', 'Analisando reuniões...', 'Gerando relatórios...'];
  let mi = 0;
  const interval = setInterval(() => {
    document.getElementById('genLoadingTxt').textContent = msgs[Math.min(mi++, msgs.length - 1)];
  }, 2500);

  // Fetch transcriptions in date range
  const { data, error } = await supabaseClient
    .from('transcriptions')
    .select('*')
    .gte('meeting_date', dateStart)
    .lte('meeting_date', dateEnd)
    .in('project', selectedProjects)
    .order('meeting_date', { ascending: true });

  if (error || !data?.length) {
    clearInterval(interval);
    document.getElementById('genLoading').style.display = 'none';
    document.getElementById('genResults').innerHTML = `
      <div class="feedback info">Nenhuma transcrição encontrada no período selecionado para os projetos escolhidos.</div>`;
    return;
  }

  // Group by project
  const grouped = {};
  data.forEach(t => {
    if (!grouped[t.project]) grouped[t.project] = [];
    grouped[t.project].push(t);
  });

  // Generate for each project
  const results = [];
  for (const [proj, files] of Object.entries(grouped)) {
    const combined = files.map(f =>
      `[Reunião: ${formatDate(f.meeting_date)}${f.context ? ' - ' + f.context : ''}]\n${f.content}`
    ).join('\n\n---\n\n');

    const report = await callClaude(proj, combined, dateStart, dateEnd, files.length);
    results.push({ proj, files: files.length, ...report });
  }

  clearInterval(interval);
  document.getElementById('genLoading').style.display = 'none';
  renderReports(results, dateStart, dateEnd);
}

async function callClaude(proj, transcriptions, dateStart, dateEnd, fileCount) {
  const apiKey = localStorage.getItem('anthropicKey');
  const projInfo = PROJECTS[proj];
  const ds = formatDate(dateStart);
  const de = formatDate(dateEnd);
  const projLabel = `${proj} - ${projInfo?.desc || ''}`;

  const prompt = `Você é um analista de projetos de TI. Analise as ${fileCount} transcrição(ões) de reunião abaixo do projeto ${proj} e gere um status report semanal em DUAS versões.

Projeto: ${projLabel}
Cliente: ${projInfo?.client || ''}
Período: ${ds} a ${de}

TRANSCRIÇÕES DAS REUNIÕES:
${transcriptions}

Gere EXATAMENTE neste formato, sem texto fora dele:

===WHATSAPP===
*Status Report — ${proj}*
*Período:* ${ds} a ${de}

*Status:* [frase de status curta e direta]

*Resumo:*
[2-3 parágrafos diretos. Use *negrito* para destacar pontos-chave. Baseie-se no que foi discutido nas reuniões.]

*Pendências/Bloqueios:*
[liste com 🔸 ou escreva "Sem pendências identificadas"]

*Próximos passos:*
[liste com ✅]

===EMAIL===
Status Report — ${proj}
Período: ${ds} a ${de}
Status: [frase de status]

Resumo:
[3-4 parágrafos formais e completos baseados nas transcrições]

Pendências/Bloqueios:
[liste com traço - ou "Sem pendências ou bloqueios identificados no período."]

Próximos Passos:
[liste com traço -]`;

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1500,
        messages: [{ role: 'user', content: prompt }]
      })
    });

    const data = await resp.json();
    const text = data.content?.map(i => i.text || '').join('') || '';
    const parts = text.split('===EMAIL===');
    return {
      wa: (parts[0] || '').replace('===WHATSAPP===', '').trim(),
      email: (parts[1] || '').trim()
    };
  } catch(e) {
    return { wa: 'Erro ao gerar. Tente novamente.', email: 'Erro ao gerar. Tente novamente.' };
  }
}

function renderReports(results, dateStart, dateEnd) {
  const container = document.getElementById('genResults');
  container.innerHTML = results.map((r, idx) => `
    <div class="report-result">
      <div class="report-result-header">
        <div>
          <div class="report-proj-name">${r.proj}</div>
          <div class="report-file-count">${r.files} transcrição(ões) analisada(s) · ${formatDate(dateStart)} a ${formatDate(dateEnd)}</div>
        </div>
      </div>
      <div class="report-tabs">
        <button class="report-tab active" onclick="switchTab(${idx}, 'wa', this)">WhatsApp</button>
        <button class="report-tab" onclick="switchTab(${idx}, 'email', this)">E-mail</button>
      </div>
      <div class="report-body" id="body-${idx}">${r.wa}</div>
      <div class="report-footer">
        <button class="btn-copy" id="copy-${idx}" onclick="copyReport(${idx})">Copiar</button>
      </div>
    </div>
  `).join('');

  // Store data for copy
  window._reports = results;
  window._activeTabs = results.map(() => 'wa');
}

function switchTab(idx, tab, btn) {
  const body = document.getElementById('body-' + idx);
  const r = window._reports[idx];
  window._activeTabs[idx] = tab;
  body.textContent = tab === 'wa' ? r.wa : r.email;

  const tabs = btn.closest('.report-tabs').querySelectorAll('.report-tab');
  tabs.forEach(t => t.classList.remove('active'));
  btn.classList.add('active');

  const copyBtn = document.getElementById('copy-' + idx);
  copyBtn.textContent = 'Copiar';
  copyBtn.classList.remove('copied');
}

function copyReport(idx) {
  const r = window._reports[idx];
  const tab = window._activeTabs[idx];
  navigator.clipboard.writeText(tab === 'wa' ? r.wa : r.email).then(() => {
    const btn = document.getElementById('copy-' + idx);
    btn.textContent = 'Copiado!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = 'Copiar'; btn.classList.remove('copied'); }, 2000);
  });
}

// ─── HELPERS ──────────────────────────────────────────────────────────────────
function checkConfig() {
  if (!localStorage.getItem('anthropicKey') || !localStorage.getItem('supabaseUrl')) {
    alert('Configure as credenciais em Configurações antes de continuar.');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelector('[data-page="settings"]').classList.add('active');
    document.getElementById('page-settings').classList.add('active');
    return false;
  }
  if (!supabaseClient) initSupabase();
  return true;
}

function formatDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
}

function showFeedback(id, msg, type) {
  const el = document.getElementById(id);
  el.innerHTML = `<div class="feedback ${type}">${msg}</div>`;
  setTimeout(() => { el.innerHTML = ''; }, 4000);
}
