import { type CollectionEntry, getCollection } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 디자인 확인용 목데이터 폴더 (src/content/posts/mock/) — 로컬에서만 보임 */
export const isMock = (post: Post) => post.id.startsWith('mock/');

/** 목데이터는 로컬에서도 기본으로 숨김. `npm run dev:mock`(SHOW_MOCK=true)일 때만 보임 */
const showMock = import.meta.env.DEV && process.env.SHOW_MOCK === 'true';

/** 공개 대상인지: 배포 빌드에서는 draft·목데이터 제외, 로컬에서는 draft는 보이고 목데이터는 옵션 */
export function isVisible(post: Post): boolean {
	if (isMock(post)) return showMock;
	return import.meta.env.DEV || !post.data.draft;
}

/** 최신순 정렬된 글 목록 */
export async function getPosts(): Promise<Post[]> {
	const posts = await getCollection('posts', isVisible);
	return posts.sort(
		(a, b) =>
			b.data.pubDate.valueOf() - a.data.pubDate.valueOf() ||
			// 같은 날짜면 시리즈 번호가 큰(나중) 글이 위로
			(b.data.seriesOrder ?? 0) - (a.data.seriesOrder ?? 0) ||
			a.id.localeCompare(b.id),
	);
}

/** 숨겨진 글(배포에서 빠진 draft) — 403 판별용. 주소는 해시로만 내보냄 */
export async function getHiddenPostIds(): Promise<string[]> {
	const posts = await getCollection('posts', (post) => !isMock(post) && !isVisible(post));
	return posts.map((p) => p.id);
}

/** 한국어 기준 분당 약 500자로 읽는 시간 계산 (코드 블록은 절반 가중치) */
export function readingMinutes(body = ''): number {
	const code = (body.match(/```[\s\S]*?```/g) ?? []).join('');
	const text = body.replace(/```[\s\S]*?```/g, '').replace(/[#>*`_\-[\]()!|]/g, '');
	const chars = text.replace(/\s+/g, '').length + code.replace(/\s+/g, '').length / 2;
	return Math.max(1, Math.round(chars / 500));
}

export function formatDate(date: Date): string {
	const parts = new Intl.DateTimeFormat('ko-KR', {
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		timeZone: 'Asia/Seoul',
	}).formatToParts(date);
	const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
	return `${get('year')}.${get('month')}.${get('day')}`;
}

export function isoDate(date: Date): string {
	return date.toISOString();
}

/** frontmatter 날짜(YYYY-MM-DD)를 한국 시간 기준 ISO 문자열로 — 구조화 데이터·article 메타용 */
export function isoDateKst(date: Date): string {
	return `${date.toISOString().slice(0, 10)}T00:00:00+09:00`;
}

/** base(/tech-blog)를 붙인 내부 링크 */
export function withBase(path = '/'): string {
	const base = import.meta.env.BASE_URL.replace(/\/$/, '');
	const clean = path.replace(/^\//, '');
	return `${base}/${clean}`;
}

/** 같은 시리즈 글을 seriesOrder 순으로 */
export function seriesPosts(posts: Post[], series: string): Post[] {
	return posts
		.filter((p) => p.data.series === series)
		.sort((a, b) => (a.data.seriesOrder ?? 0) - (b.data.seriesOrder ?? 0));
}

export function tagSlug(tag: string): string {
	return tag.trim().toLowerCase().replace(/\s+/g, '-');
}

export function collectTags(posts: Post[]): { tag: string; slug: string; count: number }[] {
	const map = new Map<string, { tag: string; slug: string; count: number }>();
	for (const post of posts) {
		for (const tag of post.data.tags) {
			const slug = tagSlug(tag);
			const entry = map.get(slug) ?? { tag, slug, count: 0 };
			entry.count += 1;
			map.set(slug, entry);
		}
	}
	return [...map.values()].sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'ko'));
}
