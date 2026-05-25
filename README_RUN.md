# Certificate Generator v0.7.0 DOUBLE_CLICK_SAFE_SPLIT

기준 파일: Certificate_Generator_v0.6.3A_NUMBERING_WORKSPACE_SPLIT_REVIEWED_FIXED.html

목적:
- 단일 6MB HTML을 분리해서 수정 편의성을 높입니다.
- 더블클릭 실행 가능성을 유지하기 위해 PDF 기준 도면은 실제 PDF 파일이 아니라 `js/90_pdf_embedded_assets.js`에 base64로 격리했습니다.
- 넘버링 bootstrap은 기존 `EMBEDDED_PDF_P1_B64`, `EMBEDDED_PDF_P2_B64` 상수명을 유지하므로 v0.6.3A와 동일한 흐름으로 동작해야 합니다.

실행:
- `index.html`을 더블클릭해서 실행합니다.
- 브라우저 보안 설정/환경에 따라 문제가 있으면 로컬 서버도 가능합니다: `python -m http.server 8000` 후 `http://localhost:8000/index.html` 접속.

수정 기준:
- 디자인/CSS: `css/app.css`
- XLSX/PDF.js/ExcelJS 라이브러리: `vendor/`
- 내장 PDF base64: `js/90_pdf_embedded_assets.js` — 임의 삭제 금지
- 핵심 업무/분석/넘버링 로직: `js/app_core.js`, `js/80_direct_fix.js`, `js/85_numbering_workspace_helper.js`
- 로그인/권한/로그: `js/99_auth_logs.js`

주의:
- `js/90_pdf_embedded_assets.js`는 용량이 크지만, 현재 버전에서는 넘버링 bootstrap에 필요합니다.
- 실제 `/assets/*.pdf` 분리 구조는 더블클릭 실행에서 fetch 제약이 있어 이번 버전에서는 적용하지 않았습니다.


## v0.7.1 Reference Position Map Applied
- Added `js/91_reference_position_map_80871631.js`.
- Uses `80871631_넘버링도면(4).pdf` pink/red markers as the answer-key position map.
- Overrides auto-estimated marker coordinates after auto-numbering generation.
