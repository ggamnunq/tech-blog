// 블로그 전역 설정 — 이름·소개·링크는 여기서만 바꾸면 전체에 반영됨
export const SITE = {
	title: 'ggamnunq.log',
	heroTitle: '배운 것을 기록하고\n부딪힌 문제를 나눕니다',
	description: '백엔드 개발을 공부하며 배운 것과 해결한 문제를 기록하는 기술 블로그',
	author: 'junyong',
	github: 'https://github.com/ggamnunq',
	avatar: 'https://github.com/ggamnunq.png',
	lang: 'ko',
} as const;

// 카테고리는 여기서 추가/삭제 — 글 frontmatter의 category는 slug 값을 씀
export const CATEGORIES = [
	{ slug: 'backend', label: 'Backend' },
	{ slug: 'infra', label: 'Infra' },
	{ slug: 'troubleshooting', label: '트러블슈팅' },
	{ slug: 'retrospective', label: '회고' },
	{ slug: 'etc', label: '기타' },
] as const;

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

export function categoryLabel(slug: string): string {
	return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
