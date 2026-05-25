/* ==========================================================================
 * v0.4.0K DIRECT FIX - invalid marker hard removal
 * Purpose:
 *  - 69/71/72/73/105/106/107 are not valid drawing anchors.
 *  - They must NOT render as normal PDF markers, PNG markers, or PDF markers.
 *  - They stay in a manual placement queue until the user explicitly places them.
 *  - K2: user visual QA added normal-color suspect IDs 7/25/44/56 to REVIEW.
 * ========================================================================== */
(function(){
  'use strict';
  // v0.4.0M: do not hard-remove any of the 112 markers. Questionable anchors become REVIEW markers instead.
  const DIRECT_INVALID_NOS = new Set([]);
  const DIRECT_REVIEW_NOS  = new Set([5,6,7,8,25,37,42,44,56,68,69,70,71,72,73,74,76,77,79,80,83,84,85,87,105,106,107]);
  const VERIFIED_STATUSES = new Set(['ANCHOR_VALIDATED','USER_CONFIRMED','USER_REPOSITIONED','POSITION_LOCKED']);
  const REVIEW_STATUS = 'POSITION_REVIEW_REQUIRED';
  const INVALID_STATUS = 'FALLBACK_POSITION_INVALID';

  function itemNoOf(it){
    const n = Number(it && (it.itemNo != null ? it.itemNo : it.number));
    return Number.isFinite(n) ? n : null;
  }
  function allItems(){
    return (window.STATE && STATE.dxfNumbering && Array.isArray(STATE.dxfNumbering.items)) ? STATE.dxfNumbering.items : [];
  }
  function defaultChecks(){
    return {nearTargetValue:false, nearLeaderEndpoint:false, visuallyConnectedToFeature:false, noCollision:false, immediatelyUnderstandable:false};
  }
  function ensureAnchor(it){
    if(!it.positionAnchor){
      const c = it.pdfOutputCoord || it;
      it.positionAnchor = {
        anchorType:'MANUAL', anchorText: it.finalSpec || it.referenceSpec || '',
        anchorPageNo: c.pageNo || it.pageNo || null,
        anchorSheetId: c.sheetId || it.sheetId || null,
        anchorXNorm: Number.isFinite(c.xNorm) ? c.xNorm : null,
        anchorYNorm: Number.isFinite(c.yNorm) ? c.yNorm : null,
        markerXNorm: Number.isFinite(c.xNorm) ? c.xNorm : null,
        markerYNorm: Number.isFinite(c.yNorm) ? c.yNorm : null,
        visualRelation:'UNKNOWN', collisionStatus:'UNKNOWN', readabilityStatus:'AMBIGUOUS',
        anchorValidationStatus: REVIEW_STATUS
      };
    }
    if(!it.positionChecks) it.positionChecks = defaultChecks();
  }
  function setInvalid(it, reason){
    ensureAnchor(it);
    it.positionReviewStatus = INVALID_STATUS;
    it.status = INVALID_STATUS;
    it.failureReason = reason || '정확한 도면 anchor 없음 — 수동 위치 지정 필요';
    it.requiredAction = '미배치 대기 목록에서 선택 후 실제 수치/지시선/형상 옆에 수동 배치';
    if(it.pdfOutputCoord){
      it.pdfOutputCoord.positionStatus = INVALID_STATUS;
      it.pdfOutputCoord.renderable = false;
      it.pdfOutputCoord._holdingStrip = true;
    }
    it.positionAnchor.anchorValidationStatus = INVALID_STATUS;
    it.positionAnchor.visualRelation = 'FLOATING_EMPTY_SPACE';
    it.positionAnchor.readabilityStatus = 'AMBIGUOUS';
    it.positionAnchor.collisionStatus = 'UNKNOWN';
    it.positionChecks = defaultChecks();
  }
  function setReview(it, reason){
    ensureAnchor(it);
    if(VERIFIED_STATUSES.has(it.positionReviewStatus)) return;
    it.positionReviewStatus = REVIEW_STATUS;
    it.status = REVIEW_STATUS;
    it.failureReason = reason || '수치/지시선/형상 anchor 검토 필요';
    it.requiredAction = '위치 확인 후 5개 조건 체크 및 anchor 검증';
    if(it.pdfOutputCoord){
      it.pdfOutputCoord.positionStatus = REVIEW_STATUS;
      it.pdfOutputCoord.renderable = true;
      delete it.pdfOutputCoord._holdingStrip;
    }
    it.positionAnchor.anchorValidationStatus = REVIEW_STATUS;
    if(!it.positionChecks) it.positionChecks = defaultChecks();
  }
  function applyDirectInvalidRemoval(items){
    items = items || allItems();
    for(const it of items){
      if(!it) continue;
      const n = itemNoOf(it);
      if(n == null) continue;
      if(DIRECT_INVALID_NOS.has(n)){
        if(it._userManuallyPlaced === true || VERIFIED_STATUSES.has(it.positionReviewStatus)){
          // After explicit user placement, keep it visible but still require QA unless fully verified.
          if(!VERIFIED_STATUSES.has(it.positionReviewStatus)) setReview(it, '사용자 수동 배치됨 — anchor 검증 필요');
        }else{
          setInvalid(it, '자동 좌표가 빈 공간/도장/무근거 영역에 배치됨');
        }
      }else if(DIRECT_REVIEW_NOS.has(n)){
        setReview(it, '자동 좌표 검토 필요');
      }
    }
    return items;
  }
  function isInvalidItem(it){
    return !!it && (it.positionReviewStatus === INVALID_STATUS || (it.pdfOutputCoord && it.pdfOutputCoord.positionStatus === INVALID_STATUS) || DIRECT_INVALID_NOS.has(itemNoOf(it)) && it._userManuallyPlaced !== true && !VERIFIED_STATUSES.has(it.positionReviewStatus));
  }
  function isReviewItem(it){
    return !!it && (it.positionReviewStatus === REVIEW_STATUS || (it.pdfOutputCoord && it.pdfOutputCoord.positionStatus === REVIEW_STATUS));
  }
  function getPdfCoord(it){
    if(!it) return null;
    if(it.pdfOutputCoord && Number.isFinite(it.pdfOutputCoord.xNorm) && Number.isFinite(it.pdfOutputCoord.yNorm)) return it.pdfOutputCoord;
    if(it.coordSpace === 'pdf' && Number.isFinite(it.xNorm) && Number.isFinite(it.yNorm)) return it;
    return null;
  }
  function sheetIdForCoord(c){ return c && (c.sheetId || (c.pageNo ? ('sheet_pdf_p'+c.pageNo) : null)); }
  function sheetInvalids(sheet){
    const sid = sheet && sheet.sheetId;
    return allItems().filter(it => {
      if(!isInvalidItem(it)) return false;
      const c = getPdfCoord(it);
      if(!sid || !c) return true;
      return sheetIdForCoord(c) === sid;
    }).sort((a,b)=>(itemNoOf(a)||0)-(itemNoOf(b)||0));
  }
  function removeInvalidMarkerDivs(){
    const overlay = document.getElementById('dxfPdfOverlay');
    if(!overlay) return;
    overlay.querySelectorAll('.pdf-marker').forEach(div=>{
      const n = Number((div.textContent||'').trim());
      if(DIRECT_INVALID_NOS.has(n)) div.remove();
    });
  }
  function renderManualQueue(sheet){
    const wrap = document.getElementById('dxfPdfCanvasWrap');
    if(!wrap) return;
    let q = document.getElementById('manualPlacementQueuePanel');
    if(q) q.remove();
    const invalids = sheetInvalids(sheet);
    if(!invalids.length) return;
    q = document.createElement('div');
    q.id = 'manualPlacementQueuePanel';
    q.style.cssText = 'position:absolute;top:8px;left:8px;z-index:30;max-width:310px;background:rgba(255,255,255,0.96);border:2px solid #dc2626;border-radius:8px;padding:8px 10px;box-shadow:0 2px 10px rgba(0,0,0,.18);font-size:11px;color:#7f1d1d;';
    q.innerHTML = '<div style="font-weight:800;margin-bottom:6px">⛔ 수동 배치 필요 — 도면 위 정상 마커 제거됨</div>';
    const rowWrap = document.createElement('div');
    rowWrap.style.cssText = 'display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px';
    invalids.forEach(it=>{
      const b = document.createElement('button');
      const n = itemNoOf(it);
      b.textContent = String(n);
      b.title = (it.failureReason||'anchor 없음') + '\n클릭 후 PDF의 실제 위치를 찍으세요.';
      b.style.cssText = 'padding:3px 7px;border:1px dashed #dc2626;background:#fee2e2;color:#7f1d1d;border-radius:999px;font-weight:800;cursor:pointer';
      b.onclick = function(ev){
        ev.stopPropagation();
        if(!window.STATE || !STATE.dxfNumbering) return;
        STATE.dxfNumbering.selectedId = it.id;
        STATE.dxfNumbering.pendingAction = {kind:'place', targetId:it.id};
        if(typeof window.renderDXFNumberingUI === 'function') window.renderDXFNumberingUI();
        alert('번호 '+n+' 위치 지정 모드입니다.\nPDF에서 실제 수치/지시선/형상 옆을 클릭하세요.');
      };
      rowWrap.appendChild(b);
    });
    q.appendChild(rowWrap);
    const info = document.createElement('div');
    info.textContent = '해당 번호는 현재 anchor가 없어 PNG/PDF에 출력하지 않습니다.';
    q.appendChild(info);
    wrap.appendChild(q);
  }

  // Patch helpers into global scope for debugging
  window.kDirectApplyInvalidRemoval = applyDirectInvalidRemoval;
  window.kDirectInvalidMarkerNos = Array.from(DIRECT_INVALID_NOS);

  const prevBuild = window.buildPdfOutputCoordinatesForAllItems;
  if(typeof prevBuild === 'function'){
    window.buildPdfOutputCoordinatesForAllItems = function(items){
      const ret = prevBuild.apply(this, arguments);
      applyDirectInvalidRemoval(items || allItems());
      return ret;
    };
  }

  const prevGenerate = window.generateAutoNumberingFromItems;
  if(typeof prevGenerate === 'function'){
    window.generateAutoNumberingFromItems = function(){
      const ret = prevGenerate.apply(this, arguments);
      applyDirectInvalidRemoval(allItems());
      if(typeof window.renderDXFNumberingUI === 'function') window.renderDXFNumberingUI();
      return ret;
    };
  }

  const prevRenderUi = window.renderDXFNumberingUI;
  if(typeof prevRenderUi === 'function'){
    window.renderDXFNumberingUI = function(){
      applyDirectInvalidRemoval(allItems());
      return prevRenderUi.apply(this, arguments);
    };
  }

  const prevRender = window.renderPDFMarkers;
  if(typeof prevRender === 'function'){
    window.renderPDFMarkers = function(sheet){
      applyDirectInvalidRemoval(allItems());
      const ret = prevRender.apply(this, arguments);
      removeInvalidMarkerDivs();
      renderManualQueue(sheet);
      return ret;
    };
  }

  const prevClick = window.handlePDFOverlayClick;
  if(typeof prevClick === 'function'){
    window.handlePDFOverlayClick = function(evt, sheet){
      const selectedId = STATE && STATE.dxfNumbering ? STATE.dxfNumbering.selectedId : null;
      const before = selectedId ? allItems().find(x=>x && x.id === selectedId) : null;
      const wasInvalid = isInvalidItem(before);
      const ret = prevClick.apply(this, arguments);
      const after = selectedId ? allItems().find(x=>x && x.id === selectedId) : null;
      if(after && wasInvalid){
        after._userManuallyPlaced = true;
        after.positionReviewStatus = REVIEW_STATUS;
        after.status = REVIEW_STATUS;
        if(after.pdfOutputCoord){
          after.pdfOutputCoord.positionStatus = REVIEW_STATUS;
          after.pdfOutputCoord.renderable = true;
          delete after.pdfOutputCoord._holdingStrip;
        }
        ensureAnchor(after);
        after.positionAnchor.anchorValidationStatus = REVIEW_STATUS;
        after.positionChecks = after.positionChecks || defaultChecks();
        if(typeof window.renderPDFMarkers === 'function') window.renderPDFMarkers(sheet);
        if(typeof window.renderDXFNumberingUI === 'function') window.renderDXFNumberingUI();
      }
      return ret;
    };
  }

  // Export PNG using the same hard filter. Invalid markers are never drawn.
  window._exportSinglePDFPage = async function(sheet){
    if(!sheet || !sheet.pageProxy) return;
    applyDirectInvalidRemoval(allItems());
    const EXPORT_SCALE = 2.0;
    const offCanvas = document.createElement('canvas');
    try{
      await renderPDFSheetToCanvas(sheet, offCanvas, EXPORT_SCALE);
    }catch(e){
      console.error('[v0.4.0K direct fix exportPNG] render failed:', e);
      alert('PNG 저장 실패: ' + (e && e.message ? e.message : e));
      return;
    }
    const ctx = offCanvas.getContext('2d');
    const W = offCanvas.width, H = offCanvas.height;
    const items = allItems().filter(it=>{
      if(isInvalidItem(it)) return false;
      const c = getPdfCoord(it);
      return c && sheetIdForCoord(c) === sheet.sheetId;
    });
    for(const it of items){
      const c = getPdfCoord(it);
      const cx = c.xNorm * W, cy = c.yNorm * H;
      const r = Math.max(14, Math.min(22, W * 0.013));
      const label = it.number != null ? String(it.number) : String(it.itemNo || '');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI*2);
      if(isReviewItem(it)){ ctx.fillStyle='rgba(255,237,213,0.94)'; ctx.strokeStyle='#f59e0b'; }
      else { ctx.fillStyle='rgba(252,190,200,0.92)'; ctx.strokeStyle='#c0392b'; }
      ctx.fill(); ctx.lineWidth=Math.max(1.5, r*0.12); ctx.stroke();
      ctx.fillStyle = isReviewItem(it) ? '#92400e' : '#7d0000';
      ctx.font = `bold ${Math.round(r*1.1)}px "Malgun Gothic", "맑은 고딕", sans-serif`;
      ctx.textAlign='center'; ctx.textBaseline='middle'; ctx.fillText(label, cx, cy);
    }
    const pageLabel = (sheet.sheetName || sheet.sheetId || 'PDF').replace(/[\/\s]+/g,'-').replace(/[^a-zA-Z0-9가-힣\-_]/g,'');
    const filename = `${APP_VERSION_SHORT}_${pageLabel}_넘버링.png`;
    offCanvas.toBlob(blob=>{
      if(!blob){ console.error('[v0.4.0K direct fix exportPNG] toBlob null'); return; }
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href=url; a.download=filename; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(()=>URL.revokeObjectURL(url),2000);
    }, 'image/png');
    console.log(`[v0.4.0K direct fix] Exported ${items.length} renderable markers on ${sheet.sheetName}`);
  };

  window.exportPDFPageWithMarkers = async function(format='png'){
    const activeId = STATE && STATE.activeSheetId;
    const sheet = (STATE.pdfReferenceSheets || []).find(s=>s.sheetId===activeId) || (STATE.pdfReferenceSheets || [])[0];
    if(!sheet){ alert('PDF 시각 기준이 등록되지 않았습니다.'); return; }
    await window._exportSinglePDFPage(sheet);
  };
  window.exportAllPDFPagesWithMarkers = async function(){
    const sheets = STATE.pdfReferenceSheets || [];
    if(!sheets.length){ alert('PDF 시각 기준이 등록되지 않았습니다.'); return; }
    for(const sheet of sheets){
      await window._exportSinglePDFPage(sheet);
      await new Promise(r=>setTimeout(r,350));
    }
  };

  const prevUpdateReady = window.updatePdfDownloadReadyState;
  window.updatePdfDownloadReadyState = function(){
    applyDirectInvalidRemoval(allItems());
    const btn = document.getElementById('dlPdfBtn');
    if(!btn){ if(typeof prevUpdateReady==='function') return prevUpdateReady.apply(this, arguments); return; }
    const items = allItems();
    const invalids = items.filter(isInvalidItem);
    const reviews = items.filter(it=>it && it.positionReviewStatus===REVIEW_STATUS);
    const verified = items.filter(it=>it && VERIFIED_STATUSES.has(it.positionReviewStatus));
    const ready = !!(STATE && STATE.analysisRun) && (STATE.pdfReferenceSheets||[]).length >= 2 && items.length === 112 && invalids.length === 0;
    btn.disabled = !ready;
    btn.title = ready
      ? (reviews.length || verified.length < 112 ? `검수용 PDF 저장 가능: review ${reviews.length}개, verified ${verified.length}/112` : '최종 PDF 1/2 + 2/2 넘버링 저장')
      : `PDF 저장 불가: invalid ${invalids.length}개, review ${reviews.length}개, verified ${verified.length}/112`;
    const q = document.getElementById('pdfQaSummary');
    if(q){
      const invNos = invalids.map(itemNoOf).filter(Boolean).join(', ');
      q.innerHTML = `Anchor 검증 ${verified.length}/112 · invalid ${invalids.length} · review ${reviews.length}` + (invNos ? `<br><span style="color:#dc2626">미배치: ${invNos}</span>` : '');
    }
  };

  const prevExportPDF = window.exportNumberingPDF;
  if(typeof prevExportPDF === 'function'){
    window.exportNumberingPDF = async function(){
      applyDirectInvalidRemoval(allItems());
      const invalids = allItems().filter(isInvalidItem);
      const reviews = allItems().filter(it=>it && it.positionReviewStatus===REVIEW_STATUS);
      if(invalids.length || reviews.length){
        const inv = invalids.map(itemNoOf).filter(Boolean).join(', ') || '-';
        const rev = reviews.map(itemNoOf).filter(Boolean).join(', ') || '-';
        alert('PDF 다운로드 차단\n\n도면 anchor 검증이 끝나지 않았습니다.\n\n미배치 invalid: ' + inv + '\n검토필요 review: ' + rev + '\n\n수동 배치/검수 후 다시 저장하세요.');
        return;
      }
      return await prevExportPDF.apply(this, arguments);
    };
  }

  window.addEventListener('load', function(){
    setTimeout(function(){
      applyDirectInvalidRemoval(allItems());
      if(typeof window.updatePdfDownloadReadyState === 'function') window.updatePdfDownloadReadyState();
      if(typeof window.renderDXFNumberingUI === 'function') window.renderDXFNumberingUI();
      const sheet = (STATE && STATE.pdfReferenceSheets || []).find(s=>s.sheetId===STATE.activeSheetId);
      if(sheet && typeof window.renderPDFMarkers === 'function') window.renderPDFMarkers(sheet);
      console.log('[v0.4.0K DIRECT FIX] invalid marker hard removal active:', Array.from(DIRECT_INVALID_NOS));
    }, 0);
  });
})();
