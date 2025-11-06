// admin-settings.js
// 功能: 实时编辑 /[rest]/config, 管理桌号 PIN & 人数, 生成二维码

(function(){
  const qs = new URLSearchParams(location.search);
  const rest = qs.get('rest');
  const token = qs.get('token'); // 可用于简单鉴权 (可扩展)
  const restInput = document.getElementById('restInput');
  const restTitle = document.getElementById('restTitle');
  restInput.value = rest || '';
  restTitle.textContent = rest ? `(${rest})` : '';

  if(!rest){ toast('缺少 ?rest= 参数', 'error'); return; }
  if(!firebase?.database){ toast('Firebase 未初始化', 'error'); return; }

  const db = firebase.database();
  const configRef = db.ref(`/${rest}/config`);

  // ---- i18n -----------------------------------------------------------
  const i18nDict = {
    nl: {
      title: 'Restaurant Config Beheer',
      detail_title: 'Tafel details',
      reload: 'Herlaad',
      global_config: 'Globale configuratie (realtime)',
      round_time_label: 'round_time (minuten)',
      allow_self_order_label: 'allow_self_order',
      server_access_label: 'server_access',
      titleImage_label: 'titleImage',
      autosave_hint: 'Wijzigingen worden automatisch opgeslagen (500ms)',
      table_mgmt: 'Tafelbeheer',
      clear: 'Leeg',
      bulk_random_pin: 'Alle random PIN',
      bulk_set_pin: 'Alle vaste PIN',
      bulk_fixed_ph: 'Vaste waarde',
      search_tables_ph: 'Zoek tafel...',
      rest_input_ph: '?rest= parameter',
      pincode_label: 'Pincode',
      persons_label: 'Personen (aantal)',
      download_qr: 'Download QR',
      open_link: 'Open link',
      save: 'Opslaan',
      close: 'Sluiten'
    },
    zh: {
      title: '餐厅配置管理',
      detail_title: '桌详情',
      reload: '刷新',
      global_config: '全局配置 (实时)',
      round_time_label: 'round_time (分钟)',
      allow_self_order_label: 'allow_self_order',
      server_access_label: 'server_access',
      titleImage_label: 'titleImage',
      autosave_hint: '字段改动 500ms 后自动写入 /[rest]/config',
      table_mgmt: '桌号管理',
      clear: '清空',
      bulk_random_pin: '全部随机 PIN',
      bulk_set_pin: '全部设为值',
      bulk_fixed_ph: '固定值',
      search_tables_ph: '搜索 tafel...',
      rest_input_ph: '?rest= 参数',
      pincode_label: 'Pincode',
      persons_label: '人数 (Persons)',
      download_qr: '下载 QR',
      open_link: '打开链接',
      save: '保存',
      close: '关闭'
    }
  };
  let currentLang = (localStorage.getItem('admin_lang') || 'zh');
  const langSelect = document.getElementById('langSelect');
  if(langSelect){ langSelect.value = currentLang; langSelect.addEventListener('change', ()=>{ currentLang = langSelect.value; localStorage.setItem('admin_lang', currentLang); applyI18n(); }); }

  function applyI18n(){
    const dict = i18nDict[currentLang] || i18nDict.zh;
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      if(dict[key]) el.innerHTML = dict[key] + (el.id==='restTitle' ? ' ' : '');
    });
    document.querySelectorAll('[data-i18n-ph]').forEach(el=>{
      const key = el.getAttribute('data-i18n-ph'); if(dict[key]) el.setAttribute('placeholder', dict[key]); });
    const titleDyn = document.querySelector('[data-i18n-dyn="detail_title"]');
    if(titleDyn){ const table = titleDyn.getAttribute('data-table')||''; titleDyn.textContent = (dict.detail_title|| (currentLang==='zh'?'桌详情':'Tafel details')) + (table? ' '+table:''); }
    // Update main heading (contains restTitle span)
    const mainTitle = document.querySelector('h1[data-i18n="title"]');
    if(mainTitle){ const span = mainTitle.querySelector('#restTitle'); const restText = span? span.outerHTML : ''; mainTitle.innerHTML = dict.title + ' ' + restText; }
  }
  applyI18n();

  // 桌号列表 (静态 + 可后续扩展为动态)
  const TABLES = [
    'Tafel-1','Tafel-2','Tafel-3','Tafel-4','Tafel-5','Tafel-5A','Tafel-6','Tafel-7','Tafel-8','Tafel-9','Tafel-10','Tafel-10A','Tafel-11','Tafel-12','Tafel-13','Tafel-14','Tafel-15','Tafel-16','Tafel-17','Tafel-18','Tafel-19','Tafel-21','Tafel-22','Tafel-23','Tafel-24','Tafel-25','Tafel-25A','Tafel-31','Tafel-31A','Tafel-32','Tafel-32A','Tafel-33','Tafel-34','Tafel-35','Tafel-35A','Tafel-36','Tafel-41','Tafel-42','Tafel-43','Tafel-44','Tafel-45','Tafel-46','Tafel-47','Tafel-51','Tafel-52','Tafel-53','Tafel-54','Tafel-55','Tafel-56','Tafel-61','Tafel-62','Tafel-63','Tafel-64','Tafel-65','Tafel-65A','Tafel-66','Tafel-66A','Tafel-67','Tafel-67A','Tafel-68','Tafel-69','Tafel-71','Tafel-72','Tafel-73','Tafel-74','Tafel-75','Tafel-76','Tafel-76A','Tafel-77','Tafel-78','Tafel-79','Tafel-81','Tafel-82','Tafel-83','Tafel-84','Tafel-85','Tafel-91','Tafel-92'
  ];

  // 简单鉴权 (可扩展) - 如果 config.server_access 有值则需要匹配
  let serverAccessRequired = null;
  configRef.child('server_access').once('value').then(s=>{ serverAccessRequired = s.val(); if(serverAccessRequired && token!==serverAccessRequired){ toast('未授权 (token mismatch)', 'error'); } });

  // 表单字段
  const FIELD_MAP = {
    round_time: document.getElementById('cfg_round_time'),
    allow_self_order: document.getElementById('cfg_allow_self_order'),
    server_access: document.getElementById('cfg_server_access'),
    titleImage: document.getElementById('cfg_titleImage')
  };

  // 监听 config 实时更新
  configRef.on('value', snap => {
    const val = snap.val()||{};
    Object.entries(FIELD_MAP).forEach(([k,el])=>{
      if(!el) return; const current = el.value; const incoming = val[k] ?? '';
      if(current != incoming){ el.value = incoming; }
    });
  });

  // Debounce 写入
  let debounceTimer = null;
  function scheduleWrite(){
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(()=>{ writeConfig(); }, 500);
  }
  function writeConfig(){
  const payload = {};
    Object.entries(FIELD_MAP).forEach(([k,el])=>{ if(el) payload[k] = normalizeValue(el); });
    configRef.update(payload).then(()=> toast('配置已保存', 'ok')).catch(e=> toast('保存失败: '+e.message,'error'));
  }
  function normalizeValue(el){
    if(!el) return '';
    if(el.type === 'number'){ const v = el.value.trim(); return v===''? null : Number(v); }
    return el.value.trim();
  }
  Object.values(FIELD_MAP).forEach(el=>{ if(!el) return; ['input','change'].forEach(evt=> el.addEventListener(evt, scheduleWrite)); });

  // 桌号列表渲染
  const tableListEl = document.getElementById('tableList');
  const searchEl = document.getElementById('tableSearch');
  const clearSearchBtn = document.getElementById('clearSearch');
  function renderTables(){
    const q = searchEl.value.trim().toLowerCase();
    tableListEl.innerHTML = '';
    TABLES.filter(t=> !q || t.toLowerCase().includes(q)).forEach(t=>{
      const div = document.createElement('div');
      div.className = 'table-item';
      div.dataset.table = t;
      div.innerHTML = `<span class="code">${t}</span><div class="badges" id="badges-${t}"></div>`;
      div.addEventListener('click', ()=> selectTable(t, div));
      tableListEl.appendChild(div);
      hydrateBadges(t);
    });
  }
  searchEl.addEventListener('input', renderTables);
  clearSearchBtn.addEventListener('click', ()=>{ searchEl.value=''; renderTables(); });

  function hydrateBadges(table){
    const ref = db.ref(`/${rest}/tafel/${table}`);
    ref.once('value').then(async s=>{
      let data = s.val()||{};
      // Migration: if legacy 'Personen' exists but 'Persons' missing, migrate
      if(data.Personen != null && data.Persons == null){
        try { await ref.update({ Persons: data.Personen }); data.Persons = data.Personen; } catch(e){ console.warn('Migrate Personen->Persons failed', e); }
      }
      const badges = [];
      if(data.Pincode) badges.push(`<span class='badge'>PIN:${data.Pincode}</span>`);
      if(data.Persons!=null) badges.push(`<span class='badge'>P:${data.Persons}</span>`);
      const el = document.getElementById(`badges-${table}`);
      if(el) el.innerHTML = badges.join('');
    });
  }

  renderTables();

  // 详情面板
  const panel = document.getElementById('detailPanel');
  const detailTitle = document.getElementById('detailTitle');
  const detailPincode = document.getElementById('detailPincode');
  const detailPersonen = document.getElementById('detailPersonen');
  const saveDetail = document.getElementById('saveDetail');
  const closeDetail = document.getElementById('closeDetail');
  const qrCanvas = document.getElementById('qrCanvas');
  const qrLinkEl = document.getElementById('qrLink');
  const downloadQRBtn = document.getElementById('downloadQR');
  const openLinkBtn = document.getElementById('openLink');

  let currentTable = null;

  function selectTable(table, el){
    currentTable = table;
  detailTitle.setAttribute('data-table', table);
  const dict = i18nDict[currentLang] || i18nDict.zh;
  const base = dict.detail_title || (currentLang==='zh'?'桌详情':'Tafel details');
  detailTitle.textContent = base + ' ' + table;
  panel.style.display = 'block';
  if(window.matchMedia('(max-width:900px)').matches){ panel.classList.add('mobile-open'); }
    document.querySelectorAll('.table-item.active').forEach(n=> n.classList.remove('active'));
    if(el) el.classList.add('active');

    const ref = db.ref(`/${rest}/tafel/${table}`);
    ref.once('value').then(async s=>{
      let data = s.val()||{};
      if(data.Personen != null && data.Persons == null){
        try { await ref.update({ Persons: data.Personen }); data.Persons = data.Personen; } catch(e){ console.warn('Migrate Personen->Persons failed', e); }
      }
      detailPincode.value = data.Pincode || '';
      detailPersonen.value = data.Persons != null ? data.Persons : '';
      buildQR();
    });
  }

  function buildQR(){
    if(!currentTable) return;
    const params = new URLSearchParams();
    params.set('rest', rest);
    params.set('tafel', currentTable.replace('Tafel-',''));
    if(detailPincode.value.trim()) params.set('pincode', detailPincode.value.trim());
    const url = `${location.origin}/index.html?${params.toString()}`;
    qrLinkEl.textContent = url;
    const size = window.matchMedia('(max-width:900px)').matches ? 260 : 220;
    // 使用qrcode.js生成二维码
    // 清除旧二维码
    const qrBox = qrCanvas.parentNode;
    let oldDiv = qrBox.querySelector('.qrcodejs');
    if(oldDiv) oldDiv.remove();
    // 创建新div用于qrcodejs
    const qrDiv = document.createElement('div');
    qrDiv.className = 'qrcodejs';
    qrDiv.style.display = 'inline-block';
    qrBox.insertBefore(qrDiv, qrCanvas);
    // 生成二维码
    new QRCode(qrDiv, {
      text: url,
      width: size,
      height: size,
      colorDark : "#000000",
      colorLight : "#ffffff",
      correctLevel : QRCode.CorrectLevel.H
    });
    // 隐藏原canvas
    qrCanvas.style.display = 'none';
  }
  detailPincode.addEventListener('input', buildQR);

  saveDetail.addEventListener('click', ()=>{
    if(!currentTable) return;
    const pin = detailPincode.value.trim();
    if(pin && !/^\d{3,4}$/.test(pin)){ toast('PIN 必须 3-4 位数字','error'); return; }
    const personenRaw = detailPersonen.value.trim();
    const personen = personenRaw===''? null : Number(personenRaw);
  const payload = {};
    if(pin) payload.Pincode = pin; else payload.Pincode = null;
  if(personen!=null && !isNaN(personen)) payload.Persons = personen; else payload.Persons = null;
    db.ref(`/${rest}/tafel/${currentTable}`).update(payload).then(()=>{
      toast('桌数据已保存','ok');
      hydrateBadges(currentTable);
    }).catch(e=> toast('保存失败: '+e.message,'error'));
  });
  closeDetail.addEventListener('click', ()=>{ 
    panel.classList.remove('mobile-open');
    panel.style.display='none'; currentTable=null; document.querySelectorAll('.table-item.active').forEach(n=> n.classList.remove('active')); 
  });
  // 点击外部关闭 (仅移动端底部抽屉打开时)
  document.addEventListener('click', (e)=>{
    if(!panel.classList.contains('mobile-open')) return;
    if(panel.contains(e.target)) return;
    if(e.target.closest('.table-item')) return;
    panel.classList.remove('mobile-open');
    setTimeout(()=>{ if(!panel.classList.contains('mobile-open')) panel.style.display='none'; }, 350);
  });
  window.addEventListener('resize', ()=>{ if(currentTable) buildQR(); });

  downloadQRBtn.addEventListener('click', ()=>{
    if(!qrCanvas) return; const a = document.createElement('a'); a.download = `${currentTable||'tafel'}-qr.png`; a.href = qrCanvas.toDataURL('image/png'); a.click(); });
  openLinkBtn.addEventListener('click', ()=>{ if(qrLinkEl.textContent) window.open(qrLinkEl.textContent, '_blank'); });

  // 批量 PIN 功能
  const bulkRandomPinBtn = document.getElementById('bulkRandomPin');
  const bulkSetPinBtn = document.getElementById('bulkSetPin');
  const bulkFixedValue = document.getElementById('bulkFixedValue');

  bulkRandomPinBtn.addEventListener('click', async ()=>{
    if(!confirm('确认将所有桌 PIN 重置为随机 4 位?')) return;
    await Promise.all(TABLES.map(t=>{
      const pin = randPin();
      return db.ref(`/${rest}/tafel/${t}`).update({ Pincode: pin });
    }));
    toast('全部随机 PIN 完成','ok');
    renderTables();
  });

  bulkSetPinBtn.addEventListener('click', async ()=>{
    const val = bulkFixedValue.value.trim();
    if(!/^\d{3,4}$/.test(val)){ toast('请输入 3-4 位数字做固定 PIN','error'); return; }
    if(!confirm(`确认将所有桌 PIN 设为 ${val}?`)) return;
    await Promise.all(TABLES.map(t=> db.ref(`/${rest}/tafel/${t}`).update({ Pincode: val }) ));
    toast('全部固定 PIN 更新完成','ok');
    renderTables();
  });

  function randPin(){ return String(Math.floor(1000 + Math.random()*9000)); }

  // 简易 QR 生成 (不依赖外部库) - 采用 tiny-qr (简化版)
  // 这里使用一个非常简单的二维码编码库实现 (支持短链接)
  function drawQR(canvas, text, size){
    // 为了快速实现，这里使用一个内嵌的最小 QR 实现: 若失败则写入 fallback 文本
    try {
      const qr = simpleQR(text);
      const ctx = canvas.getContext('2d');
      const count = qr.length; const scale = Math.floor(size / count);
      canvas.width = canvas.height = count * scale;
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,canvas.width, canvas.height);
      ctx.fillStyle = '#000';
      for(let y=0;y<count;y++){
        for(let x=0;x<count;x++){
          if(qr[y][x]) ctx.fillRect(x*scale, y*scale, scale, scale);
        }
      }
    } catch(e){
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#fff'; ctx.fillRect(0,0,size,size);
      ctx.fillStyle = '#000'; ctx.font = '14px monospace'; ctx.fillText('QR ERR', 10, 20);
      console.warn('QR generation failed', e);
    }
  }

  // 极简 QR 生成 (示意; 非完整 QR 容错，仅适合短 & ASCII 内容). 可替换为正式库。
  function simpleQR(text){
    // 为避免实现完整算法，这里伪造一个 pattern (非真正 QR CODE)。
    // TODO: 如需正式二维码请替换为成熟库，例如 QRious / qrcode.js。
    const size = Math.min(41, Math.max(21, Math.ceil(text.length/2)+20));
    const m = Array.from({length:size}, ()=> Array.from({length:size}, ()=>0));
    // 边框探测图形
    function box(x,y){ for(let i=0;i<7;i++){ m[y][x+i]=1; m[y+6][x+i]=1; m[y+i][x]=1; m[y+i][x+6]=1; } }
    box(0,0); box(size-7,0); box(0,size-7);
    // 内容散列涂点
    let hash = 0; for(let i=0;i<text.length;i++){ hash = (hash*33 + text.charCodeAt(i))>>>0; }
    for(let i=0;i<hash % 500 + 300; i++){
      const x = (hash + i*13) % size; const y = (hash + i*29) % size;
      if(m[y][x]===0) m[y][x] = 1;
    }
    return m;
  }

  // Toast
  function toast(msg, type='info', ttl){
    // Default durations: error 8s, ok/info 5s
    if(typeof ttl!=='number') ttl = (type==='error'? 8000 : 5000);
    const zone = document.getElementById('toast-zone');
    const div = document.createElement('div');
    div.className = 'toast';
    div.style.borderLeftColor = type==='error'? '#d33' : (type==='ok'? 'gold' : '#555');
    div.textContent = msg;
    zone.appendChild(div);
    let hideTimer = setTimeout(()=>{ hide(); }, ttl);
    function hide(){
      div.style.opacity='0';
      div.style.transition='opacity .4s';
      setTimeout(()=> div.remove(), 400);
    }
    div.addEventListener('click', ()=>{
      clearTimeout(hideTimer);
      hide();
    });
  }
  window.__adminToast = toast;

  // Reload button
  document.getElementById('reloadBtn').addEventListener('click', ()=> location.reload());
})();
