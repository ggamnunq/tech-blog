---
title: 글쓰기 가이드 — 마크다운 요소 미리보기
description: 이 블로그에서 쓸 수 있는 제목, 목록, 인용, 코드 블록, 표 같은 마크다운 요소가 실제로 어떻게 보이는지 확인하는 샘플 글입니다.
pubDate: 2026-11-02
category: etc
tags: [가이드, 마크다운]
draft: true
---

이 글은 `draft: true`라서 **로컬에서만 보이고 배포되지 않습니다.** 새 글을 쓸 때 스타일을 확인하는 용도로 쓰세요.

## 제목 (h2)

본문 문단입니다. 한국어 글은 줄 간격을 넉넉하게 두어야 읽기 편합니다. [링크는 이렇게](https://github.com/ggamnunq) 보이고, **굵은 글씨**와 `인라인 코드`도 쓸 수 있습니다.

### 소제목 (h3)

- 순서 없는 목록
- 두 번째 항목
  - 들여쓴 항목

1. 순서 있는 목록
2. 두 번째 항목

> 인용문은 이렇게 보입니다. 핵심 결론이나 참고 문서를 강조할 때 쓰세요.

## 코드 블록

```java
@Service
@RequiredArgsConstructor
public class PostService {

    private final PostRepository postRepository;

    @Transactional(readOnly = true)
    public PostResponse findById(Long id) {
        Post post = postRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("게시글이 없습니다. id=" + id));
        return PostResponse.from(post);
    }
}
```

```yaml
spring:
  datasource:
    url: jdbc:mysql://localhost:3306/blog
  jpa:
    open-in-view: false
```

```bash
./gradlew clean build
docker compose up -d
```

## 표

| 항목 | 설명 | 비고 |
|---|---|---|
| 제목 | `title` | 필수 |
| 요약 | `description` | 목록·검색 결과에 노출 |
| 카테고리 | `category` | `backend`, `infra`, `troubleshooting`, `retrospective`, `etc` |
| 썸네일 | `thumbnail` | 선택 |

---

구분선 아래 마지막 문단입니다.
