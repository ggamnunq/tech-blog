# ggamnunq.log

백엔드 개발을 공부하며 배운 것과 해결한 문제를 기록하는 기술 블로그.

- 주소: https://ggamnunq.github.io/tech-blog/
- 스택: [Astro](https://astro.build) · Markdown · GitHub Pages (GitHub Actions 자동 배포)

## 로컬 실행

```bash
npm install
npm run dev        # http://localhost:4321/tech-blog/
npm run build      # dist/ 생성 (draft 글 제외)
npm run preview    # 빌드 결과 미리보기
```

## 글 쓰기

`src/content/posts/`에 마크다운 파일을 추가하면 됨. 파일 이름이 주소가 됨 (`my-post.md` → `/tech-blog/posts/my-post/`).

```md
---
title: 글 제목
description: 목록과 검색 결과에 보이는 한두 줄 요약
pubDate: 2026-11-03
category: backend        # backend | infra | troubleshooting | retrospective | etc
tags: [Spring, JPA]
thumbnail: ../../assets/thumbnails/welcome.svg   # 선택
draft: false             # true면 로컬에서만 보이고 배포 안 됨
---

본문...
```

- 템플릿: `troubleshooting-template.md`, `concept-template.md`, `retrospective-template.md` (모두 `draft: true`)
- 마크다운 요소 미리보기: `writing-guide.md`
- 카테고리 추가/이름 변경: `src/consts.ts`의 `CATEGORIES`
- 블로그 이름·소개·링크: `src/consts.ts`의 `SITE`
- 색상·폰트: `src/styles/global.css`의 `:root` 변수

## 배포

`main` 브랜치에 push하면 `.github/workflows/deploy.yml`이 빌드 후 GitHub Pages로 배포함.
