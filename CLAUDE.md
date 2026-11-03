# ggamnunq.log — 기술 블로그

Astro 7 정적 사이트. GitHub Pages(`https://ggamnunq.github.io/tech-blog/`)로 배포.
레포: `ggamnunq/tech-blog` (공개)

## 구조

| 경로 | 내용 |
|---|---|
| `src/content/posts/*.md` | 실제 글 (파일 이름 = URL slug) |
| `src/content/posts/mock/` | 디자인 확인용 목데이터 — **로컬 전용. `.gitignore`로 레포에 안 올라감 + `getPosts()`에서도 배포 시 제외** |
| `src/consts.ts` | 블로그 이름·소개(`SITE`), 카테고리 목록(`CATEGORIES`) |
| `src/content.config.ts` | frontmatter 스키마 |
| `src/lib/posts.ts` | `getPosts()`(draft·mock 필터 + 최신순), `withBase()`, 읽는 시간, 날짜 포맷 |
| `src/styles/global.css` | 색상·폰트·간격 변수(`:root`), 공통 칩/태그 |
| `src/styles/prose.css` | 글 본문 타이포그래피, 코드 블록 |
| `src/assets/thumbnails/` | 썸네일 이미지 |
| `.github/workflows/deploy.yml` | `main` push 시 빌드·배포 |

## 글 frontmatter

```md
---
title: "제목"                 # 콜론(:) 들어가면 반드시 따옴표
description: "목록·검색 결과에 보이는 요약"
pubDate: 2026-11-03
categories: [troubleshooting, backend]   # 여러 개 가능, 첫 번째 = 대표(카드에 표시)
# category: backend                      # 하나만 쓸 땐 이것도 허용
tags: [JPA, 성능]
thumbnail: ../../assets/thumbnails/xxx.svg  # 선택. 글 파일 기준 상대 경로 (mock/ 안이면 ../../../)
draft: false                  # true면 로컬에서만 보임
---
```

- 카테고리 slug: `backend` `infra` `troubleshooting` `project` `activity` `retrospective` `etc` — 추가·변경은 `src/consts.ts`에서만
- 썸네일 권장: 3:2 비율, 1200×800 이상 (모바일에선 정사각형으로 잘림 → 핵심은 가운데)
- 템플릿: `troubleshooting-template.md` `concept-template.md` `retrospective-template.md`, 마크다운 요소 미리보기 `writing-guide.md` (모두 `draft: true`)

## 반드시 지킬 것

- **내부 링크는 항상 `withBase()`로** 만듦 — `base: '/tech-blog'`라서 `/posts/...`처럼 직접 쓰면 배포 시 404
- **글 목록은 항상 `getPosts()`로** 가져옴 — `getCollection()` 직접 쓰면 draft·mock 글이 배포에 섞임
- 카테고리 배열은 `post.data.categories` (스키마 transform으로 항상 배열). `post.data.category`는 없음
- 목데이터는 `mock/` 폴더 밖으로 옮기지 않음. 실제 글과 섞지 않음
- 레포가 공개라 draft 글도 GitHub 소스에는 보임 — 공개되면 곤란한 내용은 넣지 않음 (mock은 gitignore라 안 올라감)
- 실제 경험에 없는 내용을 실제 글(`mock/` 밖, `draft: false`)로 쓰지 않음 — 사용자 이름으로 공개되는 글임
- 디자인은 토스·우아한형제들 기술 블로그 "느낌"만 참고 — 로고·고유 색·문구를 그대로 가져오지 않음

## 개발

```bash
npm run dev          # 포그라운드 (http://localhost:4321/tech-blog/)
npx astro dev --background   # 백그라운드 — 관리: astro dev stop | status | logs
npx astro check      # 타입 검사
npm run build        # 배포용 빌드 (draft·mock 제외)
```

- 수정 후 `npx astro check` 0 errors + `npm run build` 성공 확인
- 화면 변경은 스크린샷으로 데스크톱(1280)·모바일(390) 둘 다 확인
- **스키마(`content.config.ts`)를 바꾼 뒤 dev 화면이 깨지면** 콘텐츠 캐시가 남은 것 — `astro dev stop` → `rm -rf .astro node_modules/.astro` → 재시작

## Git / 배포

- 커밋 작성자: `junyong <rlawnsdyd530@gmail.com>` (레포 로컬 config에 설정돼 있음)
- `main`에 push하면 GitHub Actions(`withastro/action`)가 자동 배포 — push 전 사용자 확인
- 배포 확인: `gh run list -L1`, 사이트 200 응답
