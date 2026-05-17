# 배포 전 체크리스트

## 파일 구조

- [ ] 저장소 루트에 `index.html`이 있다.
- [ ] 저장소 루트에 `.nojekyll`이 있다.
- [ ] 메인 HTML 파일명이 다른 이름으로 남아 있지 않다.
- [ ] GitHub Pages 설정이 `main / root`로 되어 있다.

## 기능 확인

- [ ] GitHub Pages 기본 주소에서 첫 화면이 뜬다.
- [ ] DXF/PDF 업로드 버튼이 보인다.
- [ ] XLSX 업로드 버튼이 보인다.
- [ ] 고급 모드 버튼이 동작한다.
- [ ] 다크모드 버튼이 동작한다.
- [ ] 실제 DXF/PDF + XLSX 샘플 파일로 분석이 실행된다.
- [ ] XLSX 다운로드가 생성된다.
- [ ] 넘버링 PDF 다운로드가 생성된다.

## 도메인 연결

- [ ] GitHub Pages Custom domain에 `www.도메인`을 입력했다.
- [ ] 닷홈 DNS에 A 레코드 4개를 추가했다.
- [ ] 닷홈 DNS에 `www` CNAME을 추가했다.
- [ ] DNS 전파 후 `Enforce HTTPS`를 켰다.
- [ ] `https://www.도메인`으로 접속된다.
- [ ] `https://도메인` 접속 시 대표 주소로 연결된다.
