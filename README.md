# 검사성적서 자동 생성기 - GitHub Pages 배포 패키지

## 구성 목적

업로드된 단독 HTML 파일을 GitHub Pages에 바로 올릴 수 있는 정적 웹사이트 구조로 정리한 패키지입니다.

원본 파일명:

```text
Certificate_Generator_v0.4.0L_FINAL_POSITION_MAP_WORKFLOW(1).html
```

배포용 진입 파일:

```text
index.html
```

## 폴더 구조

```text
certificate-generator-github-pages/
├─ index.html
├─ .nojekyll
├─ .gitignore
├─ CNAME.example
├─ README.md
├─ assets/
│  └─ README.md
└─ docs/
   └─ DOTHOME_GITHUB_PAGES_DOMAIN_GUIDE.md
```

## 변환 내용

- 원본 단독 HTML을 `index.html`로 변경했습니다.
- UTF-8 BOM은 제거했습니다.
- CSS와 JavaScript는 원본처럼 HTML 내부에 유지했습니다.
- 외부 `script src`, 외부 `link href`, 외부 `img src` 의존성은 발견되지 않았습니다.
- GitHub Pages에서 Jekyll 처리를 피하기 위해 `.nojekyll`을 추가했습니다.
- 닷홈 도메인 연결 안내 문서를 `docs/`에 추가했습니다.
- 커스텀 도메인용 예시 파일 `CNAME.example`을 추가했습니다.

## 점검 결과

| 항목 | 결과 |
|---|---:|
| HTML 크기 | 약 6.34 MB |
| inline `<style>` 개수 | 2 |
| inline `<script>` 개수 | 7 |
| 외부 script src | 0 |
| 외부 link href | 0 |
| 외부 img src | 0 |
| index.html SHA-256 | `071374f30ec23cccb2f2512af47e9536e48d646fdbe4b9c4bb5ec81abe0b8b50` |

## GitHub 업로드 방법

1. GitHub에서 새 저장소를 만듭니다.
2. 이 패키지 안의 파일들을 저장소 루트에 업로드합니다.
3. `Settings → Pages`로 이동합니다.
4. 아래처럼 설정합니다.

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

5. 저장 후 GitHub Pages 기본 주소에서 사이트를 확인합니다.

```text
https://<github-id>.github.io/<repository-name>/
```

## 도메인 연결

닷홈 도메인 연결은 아래 문서를 보세요.

```text
docs/DOTHOME_GITHUB_PAGES_DOMAIN_GUIDE.md
```

## 주의

이 프로그램은 브라우저에서 실행되는 정적 HTML 애플리케이션입니다.
GitHub 공개 저장소에 업로드하면 HTML/JavaScript 코드도 공개됩니다.
업무용 내부 로직이나 기준정보가 포함되어 있다면 저장소 공개 범위를 신중히 결정하세요.
