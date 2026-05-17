# 닷홈 도메인 + GitHub Pages 연결 안내

## 1. GitHub Pages 배포 확인

GitHub 저장소에 아래 파일이 루트에 있어야 합니다.

```text
index.html
.nojekyll
README.md
```

저장소에서 다음 메뉴로 이동합니다.

```text
Settings → Pages → Build and deployment
```

권장 설정:

```text
Source: Deploy from a branch
Branch: main
Folder: /root
```

배포 후 먼저 GitHub 기본 주소에서 정상 작동을 확인합니다.

```text
https://<github-id>.github.io/<repository-name>/
```

---

## 2. 커스텀 도메인 입력

GitHub 저장소에서:

```text
Settings → Pages → Custom domain
```

권장 입력값:

```text
www.보유도메인.com
```

저장하면 GitHub가 `CNAME` 파일을 생성할 수 있습니다.
직접 관리하려면 `CNAME.example`을 `CNAME`으로 바꾸고 첫 줄에 도메인 하나만 적으세요.

---

## 3. 닷홈 DNS 설정

닷홈에서:

```text
마이닷홈 → DNS 관리 → 해당 도메인 → DNS 레코드 관리
```

### 루트 도메인용 A 레코드

| 타입 | 이름/호스트 | 값 |
|---|---|---|
| A | @ 또는 빈칸 | 185.199.108.153 |
| A | @ 또는 빈칸 | 185.199.109.153 |
| A | @ 또는 빈칸 | 185.199.110.153 |
| A | @ 또는 빈칸 | 185.199.111.153 |

### www 서브도메인용 CNAME

| 타입 | 이름/호스트 | 값 |
|---|---|---|
| CNAME | www | <github-id>.github.io |

예시:

```text
www → playmkre.github.io
```

주의: CNAME 값에는 `/repository-name` 같은 경로를 넣지 않습니다.

---

## 4. HTTPS 적용

DNS 반영 후 GitHub Pages 설정에서:

```text
Enforce HTTPS
```

를 체크합니다.

처음에는 비활성화되어 있을 수 있으므로 DNS 반영 후 다시 확인하세요.
