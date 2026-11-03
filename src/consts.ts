// 블로그 전역 설정 — 이름·소개·링크는 여기서만 바꾸면 전체에 반영됨
export const SITE = {
	title: 'ggamnunq.log',
	heroTitle: '배운 것을 기록하고\n부딪힌 문제를 나눕니다',
	description: '백엔드 개발을 공부하며 배운 것, 해결한 문제, 프로젝트와 활동 이야기를 기록합니다',
	author: 'junyong',
	github: 'https://github.com/ggamnunq',
	avatar: 'avatar.jpg', // public/avatar.jpg — 외부(github.com) 요청 없이 직접 제공
	lang: 'ko',
} as const;

// 카테고리는 여기서 추가/삭제 — 글 frontmatter의 categories에는 slug 값을 씀 (첫 번째가 대표)
export const CATEGORIES = [
	{ slug: 'backend', label: 'Backend' },
	{ slug: 'infra', label: 'Infra' },
	{ slug: 'troubleshooting', label: '트러블슈팅' },
	{ slug: 'project', label: '프로젝트' },
	{ slug: 'activity', label: '활동' },
	{ slug: 'retrospective', label: '회고' },
	{ slug: 'etc', label: '기타' },
] as const;

// 시리즈 — 글 frontmatter에 series: <slug>, seriesOrder: <번호>
export const SERIES = [
	{
		slug: 'whylog-voice',
		title: 'WhyLog 실시간 음성 회의 구현기',
		description: '다자간 음성 회의를 만들며 설계하고 부딪힌 문제를 정리한 시리즈',
	},
] as const;

export type SeriesSlug = (typeof SERIES)[number]['slug'];

export const SERIES_SLUGS = SERIES.map((s) => s.slug) as [SeriesSlug, ...SeriesSlug[]];

export function findSeries(slug: string) {
	return SERIES.find((s) => s.slug === slug);
}

export type CategorySlug = (typeof CATEGORIES)[number]['slug'];

export const CATEGORY_SLUGS = CATEGORIES.map((c) => c.slug) as [CategorySlug, ...CategorySlug[]];

export function categoryLabel(slug: string): string {
	return CATEGORIES.find((c) => c.slug === slug)?.label ?? slug;
}
