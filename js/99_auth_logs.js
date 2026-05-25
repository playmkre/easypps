(function(){
  'use strict';
  const PATCH = 'v0.7.0_DOUBLE_CLICK_SAFE_SPLIT';
  const LS = {
    accounts:'certgen.v060.auth.accounts',
    current:'certgen.v060.auth.currentUser',
    login:'certgen.v060.logs.login',
    analysis:'certgen.v060.logs.analysis',
    download:'certgen.v060.logs.download'
  };
  const PERM_KEYS = [
    'canUploadFiles','canRunAnalysis','canDownloadXlsx','canDownloadPdf','canDownloadReport','canDownloadLog',
    'canUseNumbering','canSavePositionMap','canLoadPositionMap','canViewAdvancedMode','canViewLogs','canManageAccounts','canEditPermissions'
  ];
  const ROLE_PERMS = {
    SUPER_ADMIN:Object.fromEntries(PERM_KEYS.map(k=>[k,true])),
    ADMIN:{canUploadFiles:true,canRunAnalysis:true,canDownloadXlsx:true,canDownloadPdf:true,canDownloadReport:true,canDownloadLog:true,canUseNumbering:true,canSavePositionMap:true,canLoadPositionMap:true,canViewAdvancedMode:true,canViewLogs:true,canManageAccounts:false,canEditPermissions:false},
    USER:{canUploadFiles:true,canRunAnalysis:true,canDownloadXlsx:true,canDownloadPdf:true,canDownloadReport:false,canDownloadLog:false,canUseNumbering:true,canSavePositionMap:true,canLoadPositionMap:true,canViewAdvancedMode:false,canViewLogs:true,canManageAccounts:false,canEditPermissions:false}
  };
  const ROLE_LABELS = {SUPER_ADMIN:'슈퍼 관리자', ADMIN:'관리자', USER:'일반 사용자'};
  const PERM_LABELS = {
    canUploadFiles:'파일 업로드', canRunAnalysis:'분석 실행', canDownloadXlsx:'검사성적서 XLSX 다운로드',
    canDownloadPdf:'넘버링 PDF 다운로드', canDownloadReport:'분석 리포트 다운로드', canDownloadLog:'생성 로그 다운로드',
    canUseNumbering:'넘버링 사용', canSavePositionMap:'위치맵 저장', canLoadPositionMap:'위치맵 불러오기',
    canViewAdvancedMode:'고급모드 접근', canViewLogs:'로그 조회', canManageAccounts:'계정 관리', canEditPermissions:'권한 편집'
  };
  const STATUS_LABELS = {attempt:'시도', success:'성공', fail:'실패'};
  const ACTION_LABELS = {
    login:'로그인', logout:'로그아웃', runAnalysis:'분석 실행', onDxfFile:'도면 파일 업로드', onXlsxFile:'성적서 양식 업로드',
    pdf_reference_upload:'PDF 시각 기준 추가', generateAutoNumberingFromItems:'자동 넘버링 생성', regenerateAutoNumbering:'자동 넘버링 재생성',
    importPositionMapJSON:'위치맵 불러오기', account_add:'계정 추가', account_delete:'계정 삭제', permission_update:'권한 수정', password_reset:'비밀번호 초기화'
  };
  function roleLabel(role){ return ROLE_LABELS[role] || role || '-'; }
  function statusLabel(status){ return STATUS_LABELS[status] || status || '-'; }
  function actionLabel(action){ return ACTION_LABELS[action] || action || '-'; }
  function isSuperAccountId(id){ const a = byId(id); return id === 'super' || (a && a.role === 'SUPER_ADMIN'); }
  function visibleAccountsFor(viewer){
    viewer = viewer || current();
    const rows = getAccounts();
    if(!viewer) return [];
    if(viewer.role === 'SUPER_ADMIN') return rows;
    if(viewer.role === 'ADMIN') return rows.filter(a => a.role !== 'SUPER_ADMIN');
    return rows.filter(a => a.id === viewer.id);
  }
  function canSeeLogRow(row, viewer){
    viewer = viewer || current();
    if(!viewer) return false;
    if(viewer.role === 'SUPER_ADMIN') return true;
    const rowUser = row && row.userId;
    const rowRole = row && row.role;
    if(viewer.role === 'ADMIN') return rowRole !== 'SUPER_ADMIN' && !isSuperAccountId(rowUser);
    return rowUser === viewer.id;
  }
  const $ = id => document.getElementById(id);
  const KST_TZ = 'Asia/Seoul';
  const now = () => new Date().toISOString();
  function kstParts(dateLike){
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
    const parts = new Intl.DateTimeFormat('ko-KR', {
      timeZone: KST_TZ, year:'numeric', month:'2-digit', day:'2-digit',
      hour:'2-digit', minute:'2-digit', second:'2-digit', hour12:false
    }).formatToParts(d).reduce((acc,p)=>{ acc[p.type]=p.value; return acc; }, {});
    return parts;
  }
  function kstFormat(dateLike){
    const d = dateLike instanceof Date ? dateLike : new Date(dateLike || Date.now());
    if(Number.isNaN(d.getTime())) return '';
    const p = kstParts(d);
    return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} KST`;
  }
  function logMs(row){
    const n = Number(row && row.timestampMs);
    if(Number.isFinite(n) && n > 0) return n;
    const t = Date.parse(row && (row.timestamp || row.createdAt || row.updatedAt));
    return Number.isFinite(t) ? t : 0;
  }
  function displayLogTime(row){ return (row && row.timestampKST) || kstFormat(logMs(row)); }
  function kstDateKeyFromMs(ms){
    if(!ms) return '';
    const p = kstParts(new Date(ms));
    return `${p.year}-${p.month}-${p.day}`;
  }
  function safeJsonGet(key, fallback){ try{ const raw=localStorage.getItem(key); return raw?JSON.parse(raw):fallback; }catch(e){ return fallback; } }
  function safeJsonSet(key, value){ localStorage.setItem(key, JSON.stringify(value)); }
  function seedAccounts(){
    let acc = safeJsonGet(LS.accounts, null);
    if(Array.isArray(acc) && acc.length) return acc;
    acc = [
      {id:'super',name:'슈퍼 관리자',password:'super1234',role:'SUPER_ADMIN',active:true,createdAt:now(),updatedAt:now(),lastLogin:'',permissionsOverride:{}},
      {id:'admin',name:'관리자',password:'admin1234',role:'ADMIN',active:true,createdAt:now(),updatedAt:now(),lastLogin:'',permissionsOverride:{}},
      {id:'user',name:'일반 사용자',password:'user1234',role:'USER',active:true,createdAt:now(),updatedAt:now(),lastLogin:'',permissionsOverride:{}}
    ];
    safeJsonSet(LS.accounts, acc);
    return acc;
  }
  function getAccounts(){ return seedAccounts(); }
  function setAccounts(acc){ safeJsonSet(LS.accounts, acc); }
  function current(){ return safeJsonGet(LS.current, null); }
  function setCurrent(u){ if(u) safeJsonSet(LS.current,u); else localStorage.removeItem(LS.current); }
  function byId(id){ return getAccounts().find(a=>a.id===id); }
  function effectivePerms(u){
    if(!u) return {};
    const acc = byId(u.id) || u;
    const base = Object.assign({}, ROLE_PERMS[acc.role] || {});
    Object.assign(base, acc.permissionsOverride || {});
    if(acc.role !== 'SUPER_ADMIN') { base.canEditPermissions = !!base.canEditPermissions && acc.role === 'ADMIN'; if(acc.role==='USER') base.canManageAccounts=false; }
    if(acc.role === 'SUPER_ADMIN') Object.assign(base, ROLE_PERMS.SUPER_ADMIN);
    return base;
  }
  function can(key){ const u=current(); return !!effectivePerms(u)[key]; }
  function logKey(type){ return type==='login'?LS.login:type==='download'?LS.download:LS.analysis; }
  function getLogs(type){ return safeJsonGet(logKey(type), []); }
  function setLogs(type, rows){ safeJsonSet(logKey(type), rows.slice(-2000)); }
  function record(type, payload){
    payload = payload || {};
    const u = current();
    const d = new Date();
    const row = Object.assign({
      timestamp:d.toISOString(),
      timestampMs:d.getTime(),
      timestampKST:kstFormat(d),
      timeZone:'Asia/Seoul',
      userId:u&&u.id||payload.userId||'-',
      role:u&&u.role||payload.role||'-',
      status:payload.status||'success'
    }, payload);
    const rows = getLogs(type);
    rows.unshift(row);
    rows.sort((a,b)=>logMs(b)-logMs(a));
    setLogs(type, rows);
  }
  function deny(msg){ if(typeof showAlert==='function') showAlert('권한 없음', msg || '현재 계정에는 이 기능을 사용할 권한이 없습니다.'); else alert(msg || '권한 없음'); }
  function requireCan(key){ if(!current()){ $('v060LoginOverlay')?.classList.remove('v060-hidden'); return false; } if(!can(key)){ deny(); return false; } return true; }
  function updateUI(){
    const u = current();
    const logged = !!u;
    const overlay = $('v060LoginOverlay'); if(overlay) overlay.classList.toggle('v060-hidden', logged);
    const badge = $('v060AuthBadge'); if(badge) badge.style.display = logged ? 'flex' : 'none';
    const name = $('v060UserName'); if(name) name.textContent = u ? (u.name || u.id) : '-';
    const role = $('v060UserRole'); if(role && u){ role.textContent = roleLabel(u.role); role.className = 'v060-role ' + u.role; }
    const accBtn = $('v060AccountsBtn'); if(accBtn) accBtn.style.display = logged && can('canManageAccounts') ? 'inline-flex' : 'none';
    const logsBtn = $('v060LogsBtn'); if(logsBtn) logsBtn.style.display = logged && can('canViewLogs') ? 'inline-flex' : 'none';
    const numBtn = $('v060NumberingBtn'); if(numBtn) numBtn.style.display = logged && can('canUseNumbering') ? 'inline-flex' : 'none';
    const logoutBtn = $('v060LogoutBtn'); if(logoutBtn) logoutBtn.style.display = logged ? 'inline-flex' : 'none';
    const advBtn = $('advBtn'); if(advBtn) advBtn.style.display = logged && can('canViewAdvancedMode') ? 'inline-flex' : 'none';
    const clearBtn = $('v060ClearLogsBtn'); if(clearBtn) clearBtn.style.display = can('canManageAccounts') ? 'inline-flex' : 'none';
  }
  window.v060FillLogin = function(id,pw){ $('v060LoginId').value=id; $('v060LoginPw').value=pw; };
  window.v060Login = function(){
    const id = ($('v060LoginId')?.value || '').trim(); const pw = $('v060LoginPw')?.value || '';
    const err = $('v060LoginErr'); if(err) err.textContent='';
    const accs = getAccounts(); const acc = accs.find(a=>a.id===id);
    if(!acc || acc.password !== pw || !acc.active){ record('login',{userId:id,role:acc&&acc.role||'-',status:'fail',action:'login',reason:!acc?'NO_ACCOUNT':acc.password!==pw?'BAD_PASSWORD':'INACTIVE'}); if(err) err.textContent='로그인 정보가 맞지 않거나 비활성 계정입니다.'; return; }
    acc.lastLogin = now(); acc.updatedAt = now(); setAccounts(accs);
    setCurrent({id:acc.id,name:acc.name,role:acc.role,loginAt:now()});
    record('login',{userId:acc.id,role:acc.role,status:'success',action:'login'});
    updateUI();
    v060ClosePages();
  };
  window.v060Logout = function(){ const u=current(); if(u) record('login',{status:'success',action:'logout'}); setCurrent(null); updateUI(); };
  window.v060ClosePages = function(){ ['v060AccountsPage','v060LogsPage','numberingPage'].forEach(id=>$(id)?.classList.remove('open')); document.body.classList.remove('v060-page-open'); };
  window.v060ReturnToMain = function(){
    v060ClosePages();
    const userMode = $('userMode');
    const advMode = $('advMode');
    if(userMode) userMode.style.display = 'block';
    if(advMode) advMode.style.display = 'none';
    try{ if(typeof isAdvanced !== 'undefined') isAdvanced = false; }catch(e){}
    const mt = $('modeTag');
    if(mt){ mt.className = 'mode-tag user'; mt.textContent = '사용자'; }
    const advBtn = $('advBtn');
    if(advBtn) advBtn.style.color = '';
    try{ if(typeof renderDXFPreview === 'function') renderDXFPreview(); }catch(e){}
    try{ if(typeof renderDXFNumberingUI === 'function') renderDXFNumberingUI(); }catch(e){}
    try{ nwsUpdateMainSummary(); }catch(e){}
  };
  window.v060ShowAccounts = function(){ if(!requireCan('canManageAccounts')) return; v060ClosePages(); renderAccounts(); $('v060AccountsPage')?.classList.add('open'); document.body.classList.add('v060-page-open'); };
  window.v060ShowLogs = function(){ if(!requireCan('canViewLogs')) return; v060ClosePages(); renderLogUserFilter(); v060RenderLogs(); $('v060LogsPage')?.classList.add('open'); document.body.classList.add('v060-page-open'); };
  window.v060ShowNumbering = function(){
    if(!requireCan('canUseNumbering')) return;
    v060ClosePages();
    $('numberingPage')?.classList.add('open');
    document.body.classList.add('v060-page-open');
    // 작업실 진입 시 렌더링 갱신
    try{ if(typeof renderDXFPreview==='function') renderDXFPreview(); }catch(e){}
    try{ if(typeof renderDXFNumberingUI==='function') renderDXFNumberingUI(); }catch(e){}
    try{ nwsUpdateHeaderStats(); }catch(e){}
  };
  window.v060AddAccount = function(){
    if(!requireCan('canManageAccounts')) return;
    const id=($('v060NewId')?.value||'').trim(); const name=($('v060NewName')?.value||id).trim(); const pw=$('v060NewPw')?.value||''; const role=$('v060NewRole')?.value||'USER';
    if(!id || !pw){ alert('ID와 비밀번호를 입력하세요.'); return; }
    const accs=getAccounts(); if(accs.some(a=>a.id===id)){ alert('이미 존재하는 ID입니다.'); return; }
    accs.push({id,name,password:pw,role,active:true,createdAt:now(),updatedAt:now(),lastLogin:'',permissionsOverride:{}}); setAccounts(accs); record('analysis',{action:'account_add',targetUser:id,status:'success'}); renderAccounts();
  };
  function renderAccounts(){
    const body=$('v060AccountsTbody'); if(!body) return;
    const viewer=current();
    const rows=visibleAccountsFor(viewer);
    body.innerHTML = rows.map(acc=>{
      const base = ROLE_PERMS[acc.role] || ROLE_PERMS.USER;
      const checks = PERM_KEYS.map(k=>`<label><input type="checkbox" ${effectivePerms(acc)[k]?'checked':''} ${acc.role==='SUPER_ADMIN'?'disabled':''} onchange="v060SetPerm('${esc(acc.id)}','${k}',this.checked)"> ${PERM_LABELS[k]||k}</label>`).join('');
      const disableSuper = acc.id==='super' ? 'disabled' : '';
      return `<tr><td><b>${esc(acc.id)}</b><br><span style="font-size:10px;color:var(--text-dim)">${esc(acc.lastLogin||'로그인 기록 없음')}</span></td><td><input class="v060-mini" value="${escAttr(acc.name||'')}" onchange="v060SetAccountName('${esc(acc.id)}',this.value)"></td><td><select class="v060-mini" ${disableSuper} onchange="v060SetRole('${esc(acc.id)}',this.value)"><option value="USER" ${acc.role==='USER'?'selected':''}>일반 사용자</option><option value="ADMIN" ${acc.role==='ADMIN'?'selected':''}>관리자</option><option value="SUPER_ADMIN" ${acc.role==='SUPER_ADMIN'?'selected':''}>슈퍼 관리자</option></select><br><label style="font-size:11px"><input type="checkbox" ${acc.active?'checked':''} ${disableSuper} onchange="v060SetActive('${esc(acc.id)}',this.checked)"> ${acc.active?'활성':'비활성'}</label></td><td><div class="v060-perm-grid">${checks}</div></td><td><button class="btn btn-secondary" onclick="v060ResetPw('${esc(acc.id)}')">비밀번호 초기화</button> ${acc.id==='super'?'':`<button class="btn btn-secondary" style="color:#dc2626;border-color:#dc2626" onclick="v060DeleteAccount('${esc(acc.id)}')">삭제</button>`}</td></tr>`;
    }).join('');
  }
  window.v060SetAccountName=function(id,name){ const a=getAccounts(); const x=a.find(v=>v.id===id); if(x){x.name=name;x.updatedAt=now();setAccounts(a);updateUI();} };
  window.v060SetRole=function(id,role){ const a=getAccounts(); const x=a.find(v=>v.id===id); if(x&&id!=='super'){x.role=role;x.permissionsOverride={};x.updatedAt=now();setAccounts(a);renderAccounts();updateUI();} };
  window.v060SetActive=function(id,active){ const a=getAccounts(); const x=a.find(v=>v.id===id); if(x&&id!=='super'){x.active=!!active;x.updatedAt=now();setAccounts(a);renderAccounts();} };
  window.v060SetPerm=function(id,key,val){ if(!requireCan('canManageAccounts')) return; const a=getAccounts(); const x=a.find(v=>v.id===id); if(!x||x.role==='SUPER_ADMIN') return; x.permissionsOverride=x.permissionsOverride||{}; x.permissionsOverride[key]=!!val; x.updatedAt=now(); setAccounts(a); record('analysis',{action:'permission_update',targetUser:id,permission:key,value:!!val,status:'success'}); updateUI(); };
  window.v060ResetPw=function(id){ const pw=prompt('새 비밀번호', 'temp1234'); if(!pw) return; const a=getAccounts(); const x=a.find(v=>v.id===id); if(x){x.password=pw;x.updatedAt=now();setAccounts(a);record('analysis',{action:'password_reset',targetUser:id,status:'success'});} };
  window.v060DeleteAccount=function(id){ if(id==='super') return; if(!confirm(id+' 계정을 삭제할까요?')) return; setAccounts(getAccounts().filter(a=>a.id!==id)); record('analysis',{action:'account_delete',targetUser:id,status:'success'}); renderAccounts(); };
  let logTab='login';
  window.v060SwitchLogTab=function(tab,btn){ logTab=tab; document.querySelectorAll('.v060-tab').forEach(b=>b.classList.remove('active')); if(btn) btn.classList.add('active'); v060RenderLogs(); };
  function renderLogUserFilter(){ const sel=$('v060LogUser'); if(!sel) return; const u=current(); const accs=visibleAccountsFor(u); if(u && u.role==='USER'){ sel.innerHTML=`<option value="${escAttr(u.id)}">${esc(u.name||u.id)}</option>`; sel.value=u.id; sel.disabled=true; } else { sel.disabled=false; sel.innerHTML='<option value="">전체 사용자</option>'+accs.map(a=>`<option value="${escAttr(a.id)}">${esc(a.name||a.id)} (${roleLabel(a.role)})</option>`).join(''); } }
  function filteredLogs(){
    const u=current();
    const q=($('v060LogSearch')?.value||'').toLowerCase();
    const user=$('v060LogUser')?.value||'';
    const st=$('v060LogStatus')?.value||'';
    const from=$('v060LogFrom')?.value||'';
    const to=$('v060LogTo')?.value||'';
    return getLogs(logTab).slice().sort((a,b)=>logMs(b)-logMs(a)).filter(r=>{
      if(!canSeeLogRow(r,u)) return false;
      if(u && u.role==='USER' && r.userId!==u.id) return false;
      if(user && r.userId!==user) return false;
      if(st && r.status!==st) return false;
      const day = kstDateKeyFromMs(logMs(r));
      if(from && day && day < from) return false;
      if(to && day && day > to) return false;
      if(q && !JSON.stringify(Object.assign({}, r, {timeKST:displayLogTime(r)})).toLowerCase().includes(q)) return false;
      return true;
    });
  }
  window.v060RenderLogs=function(){
    const head=$('v060LogHead'), body=$('v060LogTbody'), count=$('v060LogCount'); if(!head||!body) return;
    const rows=filteredLogs();
    const cols=logTab==='login'
      ? ['timeKST','userId','role','action','status','reason']
      : logTab==='download'
        ? ['timeKST','userId','role','downloadType','fileName','status','message']
        : ['timeKST','userId','role','action','fileName','fileType','status','message'];
    const labels={timeKST:'시간(KST)',userId:'사용자',role:'권한',action:'동작',status:'결과',reason:'사유',downloadType:'다운로드 유형',fileName:'파일명',fileType:'파일유형',message:'메시지'};
    const cell=(r,c)=> c==='timeKST' ? displayLogTime(r) : c==='role' ? roleLabel(r[c]) : c==='status' ? statusLabel(r[c]) : c==='action' ? actionLabel(r[c]) : String(r[c]??'');
    head.innerHTML='<tr>'+cols.map(c=>`<th>${labels[c]||c}</th>`).join('')+'</tr>';
    body.innerHTML=rows.map(r=>'<tr>'+cols.map(c=>`<td>${esc(cell(r,c))}</td>`).join('')+'</tr>').join('') || `<tr><td colspan="${cols.length}">로그 없음</td></tr>`;
    if(count) count.textContent = rows.length+'건 · 한국시간 최신순 · 권한 범위 적용';
  };
  window.v060ExportLogsCsv=function(){ if(!requireCan('canViewLogs')) return; const rows=filteredLogs(); const baseCols=Object.keys(rows[0]||{timestampKST:'',timestamp:'',userId:'',role:'',status:''}); const cols=['timeKST'].concat(baseCols.filter(c=>c!=='timeKST')); const csv=[cols.join(',')].concat(rows.map(r=>cols.map(c=>'"'+String(c==='timeKST'?displayLogTime(r):(r[c]??'')).replace(/"/g,'""')+'"').join(','))).join('\n'); const filename=`v061A_${logTab}_logs_KST.csv`; if(typeof dlTxt==='function') dlTxt(csv,filename,'text/csv'); else { const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=filename; a.click(); } record('download',{downloadType:'LOG_CSV',fileName:filename,status:'success'}); };
  window.v060ClearCurrentLogs=function(){ if(!requireCan('canManageAccounts')) return; if(!confirm('현재 탭 로그를 삭제할까요?')) return; setLogs(logTab,[]); v060RenderLogs(); };
  function esc(s){ return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
  function escAttr(s){ return esc(s).replace(/`/g,'&#96;'); }
  function wrap(name, permKey, logType, metaFn){
    const orig = window[name]; if(typeof orig!=='function' || orig.__v060Wrapped) return;
    const wrapped = async function(){
      if(!requireCan(permKey)) return;
      const meta = typeof metaFn==='function' ? (metaFn.apply(this, arguments)||{}) : {};
      const isDownload = logType==='download';
      record(logType,{status:'attempt',action:name,downloadType:isDownload?name:undefined,...meta});
      try{ const res = await orig.apply(this, arguments); record(logType,{status:'success',action:name,downloadType:isDownload?name:undefined,...meta}); return res; }
      catch(e){ record(logType,{status:'fail',action:name,downloadType:isDownload?name:undefined,message:e&&e.message||String(e),...meta}); throw e; }
    };
    wrapped.__v060Wrapped = true; wrapped.__v060Original = orig; window[name]=wrapped;
  }
  function fileMeta(input){ const f=input&&input.files&&input.files[0]; return f?{fileName:f.name,fileType:(f.name.split('.').pop()||'').toLowerCase()}:{}; }
  function applyWrappers(){
    wrap('onDxfFile','canUploadFiles','analysis',fileMeta);
    wrap('onXlsxFile','canUploadFiles','analysis',fileMeta);
    wrap('onPDFReferenceFilesPicked','canUploadFiles','analysis',()=>({action:'pdf_reference_upload'}));
    wrap('runAnalysis','canRunAnalysis','analysis',()=>({action:'runAnalysis'}));
    wrap('generateAutoNumberingFromItems','canUseNumbering','analysis',()=>({action:'generateAutoNumberingFromItems'}));
    wrap('regenerateAutoNumbering','canUseNumbering','analysis',()=>({action:'regenerateAutoNumbering'}));
    wrap('exportPositionMapJSON','canSavePositionMap','download',()=>({downloadType:'POSITION_MAP_JSON'}));
    wrap('importPositionMapJSON','canLoadPositionMap','analysis',()=>({action:'importPositionMapJSON'}));
    wrap('downloadXLSX','canDownloadXlsx','download',()=>({downloadType:'XLSX'}));
    wrap('exportNumberingPDF','canDownloadPdf','download',()=>({downloadType:'NUMBERING_PDF'}));
    wrap('downloadReport','canDownloadReport','download',()=>({downloadType:'ANALYSIS_REPORT'}));
    wrap('downloadLog','canDownloadLog','download',()=>({downloadType:'GENERATION_LOG'}));
    const origToggle = window.toggleAdv;
    if(typeof origToggle==='function' && !origToggle.__v060Wrapped){
      const w = function(){ if(!requireCan('canViewAdvancedMode')) return; return origToggle.apply(this, arguments); };
      w.__v060Wrapped=true; w.__v060Original=origToggle; window.toggleAdv=w;
    }
  }
  window.v060Diagnostics = function(){ return {patch:PATCH,currentUser:current(),perms:effectivePerms(current()),accounts:getAccounts().map(a=>({id:a.id,role:a.role,active:a.active,override:a.permissionsOverride})),logs:{login:getLogs('login').length,analysis:getLogs('analysis').length,download:getLogs('download').length},numbering:{items:window.STATE&&STATE.dxfNumbering&&STATE.dxfNumbering.items&&STATE.dxfNumbering.items.length,pdfSheets:window.STATE&&STATE.pdfReferenceSheets&&STATE.pdfReferenceSheets.length,analysisRun:window.STATE&&STATE.analysisRun}}; };
  window.addEventListener('load', function(){ seedAccounts(); setTimeout(function(){ applyWrappers(); updateUI(); },0); });
})();
