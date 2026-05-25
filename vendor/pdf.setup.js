/* PDF.js double-click-safe bootstrap. Creates Blob URLs from local JS strings. */
(async()=>{
  try{
    const wText = window.PDFJS_WORKER_SOURCE;
    const lText = window.PDFJS_LIB_SOURCE;
    if(!wText || !lText){
      console.warn('pdfjs: source strings missing');
      return;
    }
    const wURL=URL.createObjectURL(new Blob([wText],{type:'application/javascript'}));
    const lURL=URL.createObjectURL(new Blob([lText],{type:'application/javascript'}));
    const mod=await import(lURL);
    window.pdfjsLib=mod.default||mod;
    window.pdfjsLib.GlobalWorkerOptions.workerSrc=wURL;
    window._pdfjsReady=true;
    window.dispatchEvent(new Event('pdfjsReady'));
  }catch(e){console.warn('pdfjs:',e);}
})();
