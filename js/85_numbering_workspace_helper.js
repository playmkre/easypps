/* ═══════════════════════════════════════════
   v0.7.0 넘버링 작업실 — 상태/진단 동기화 헬퍼
   - 넘버링 알고리즘 변경 없음
   - 기존 renderDXFNumberingUI 호출 뒤 진단/요약만 갱신
   ═══════════════════════════════════════════ */
(function(){
  function items(){
    try{ return (window.STATE && STATE.dxfNumbering && Array.isArray(STATE.dxfNumbering.items)) ? STATE.dxfNumbering.items : []; }
    catch(e){ return []; }
  }
  function setEl(id, val){ const e = document.getElementById(id); if(e) e.textContent = val; }
  function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
  function hasDxfCoord(it){ return it && Number.isFinite(Number(it.x)) && Number.isFinite(Number(it.y)); }
  function hasPdfCoord(it){ return it && it.pdfOutputCoord && Number.isFinite(Number(it.pdfOutputCoord.xNorm)) && Number.isFinite(Number(it.pdfOutputCoord.yNorm)); }
  function statusOf(it){ return String((it && (it.status || it.positionReviewStatus || it.placementStatus)) || ''); }
  function confidenceOf(it){ return num(it && (it.confidence ?? it.matchConfidence ?? it.conf)); }
  function pageOf(it){
    if(!it) return '-';
    if(it.pageNo || it.page) return it.pageNo || it.page;
    if(it.pdfOutputCoord && it.pdfOutputCoord.sheetId) return String(it.pdfOutputCoord.sheetId).replace('sheet_pdf_p','PDF ');
    if(it.sheetId) return String(it.sheetId).replace('sheet_pdf_p','PDF ');
    return '-';
  }
  function specOf(it){ return (it && (it.finalSpec || it.spec || it.referenceSpec || it.sourceRawText || it.itemName)) || '-'; }
  function zoneOf(it){ return (it && (it.drawingZone || it.zone || it.targetZone)) || '-'; }
  function noOf(it, idx){ return (it && (it.number || it.itemNo || it.no || it.index)) || (idx + 1); }
  function isReview(it){
    const st = statusOf(it);
    return /AMBIGUOUS|REVIEW|review|required/i.test(st) || /review/i.test(String(it && it.positionReviewStatus || ''));
  }
  function isConfirmed(it){
    const st = statusOf(it);
    const pr = String(it && it.positionReviewStatus || '');
    return /CONFIRMED|LOCKED|USER_REPOSITIONED|MANUAL_PLACED|confirmed|locked/i.test(st) || /confirmed|locked/i.test(pr);
  }
  function isFailed(it){
    const st = statusOf(it);
    return /FAILED|MISSING|NO_ANCHOR|AUTO_PLACE_FAILED/i.test(st) || (!hasDxfCoord(it) && !hasPdfCoord(it));
  }
  function isAuto(it){ return /AUTO_PLACED/i.test(statusOf(it)) && !isReview(it) && !isFailed(it); }
  function grade(it){
    const c = confidenceOf(it);
    const hasCoord = hasDxfCoord(it) || hasPdfCoord(it);
    if(isFailed(it)) return ['C','좌표 또는 앵커가 없어 수동 위치 지정 필요'];
    if(isReview(it)) return ['B','자동 후보는 있으나 검토/중복/애매한 배치 상태'];
    if(isConfirmed(it)) return ['A','사용자 확정 또는 고정된 위치'];
    if(hasCoord && c >= 0.75) return ['A','좌표와 신뢰도가 충분한 자동 배치 후보'];
    if(hasCoord) return ['B','좌표는 있으나 신뢰도 확인 필요'];
    return ['D','도면 표기 여부 또는 기준정보성 항목 확인 필요'];
  }
  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function nwsGetStats(){
    const rows = items();
    const total = rows.length;
    const auto = rows.filter(isAuto).length;
    const review = rows.filter(isReview).length;
    const failed = rows.filter(isFailed).length;
    const confirmed = rows.filter(isConfirmed).length;
    return { total, auto, review, failed, confirmed };
  }

  window.nwsUpdateHeaderStats = function(){
    const s = nwsGetStats();
    setEl('nwsHdrAuto', s.auto);
    setEl('nwsHdrReview', s.review);
    setEl('nwsHdrFailed', s.failed);
    setEl('nwsHdrConfirmed', s.confirmed);
  };

  window.nwsUpdateMainSummary = function(){
    const s = nwsGetStats();
    setEl('nwsMainTotal', s.total);
    setEl('nwsMainAuto', s.auto);
    setEl('nwsMainReview', s.review);
    setEl('nwsMainFailed', s.failed);
  };

  window.nwsRenderDiagTable = function(){
    const body = document.getElementById('nwsDiagTbody');
    if(!body) return;
    const rows = items();
    if(!rows.length){
      body.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-dim);padding:14px">분석 후 자동 넘버링을 생성하면 진단표가 표시됩니다.</td></tr>';
      return;
    }
    body.innerHTML = rows.map((it, idx) => {
      const g = grade(it);
      const c = confidenceOf(it);
      return '<tr onclick="if(window.selectDXFNumberById&&\''+esc(it.id||'')+'\')selectDXFNumberById(\''+esc(it.id||'')+'\')">'
        + '<td><b>'+esc(noOf(it,idx))+'</b></td>'
        + '<td><span class="nws-grade nws-grade-'+esc(g[0])+'">'+esc(g[0])+'</span></td>'
        + '<td>'+esc(statusOf(it) || '-')+'</td>'
        + '<td>'+esc(pageOf(it))+'</td>'
        + '<td>'+esc(zoneOf(it))+'</td>'
        + '<td>'+esc(specOf(it))+'</td>'
        + '<td>'+(c ? Math.round(c*100)+'%' : '-')+'</td>'
        + '<td class="nws-diag-reason">'+esc(g[1])+'</td>'
        + '</tr>';
    }).join('');
  };

  const _prevRenderUI = window.renderDXFNumberingUI;
  window.renderDXFNumberingUI = function(){
    if(typeof _prevRenderUI === 'function') _prevRenderUI.apply(this, arguments);
    try{ nwsUpdateHeaderStats(); nwsUpdateMainSummary(); nwsRenderDiagTable(); }catch(e){}
  };
  window.addEventListener('load', function(){
    setTimeout(function(){
      try{ nwsUpdateHeaderStats(); nwsUpdateMainSummary(); nwsRenderDiagTable(); }catch(e){}
    }, 0);
  });
})();

/* v0.6.3A NUMBERING_WORKSPACE_SPLIT_REVIEWED_FIXED CHANGELOG
 * BASELINE: v0.6.3_NUMBERING_WORKSPACE_SPLIT
 * - Fixed broken changelog comment that caused a JavaScript syntax error in the v0.6.3 helper script.
 * - Fixed visible version labels: title, app header, login subtitle, APP_VERSION, APP_VERSION_SHORT, auth PATCH label.
 * - Fixed CSS typo rgba(37,99,235,04) → rgba(37,99,235,.04).
 * - Restricted the numbering workspace button/open action by canUseNumbering permission.
 * - Added a non-invasive 112-item numbering diagnostic table without changing the v0.4.0N numbering algorithm.
 */
