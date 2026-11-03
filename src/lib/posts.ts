import { type CollectionEntry, getCollection } from 'astro:content';

export type Post = CollectionEntry<'posts'>;

/** 최신순 정렬된 글 목록. 배포 빌드에서는 draft 글을 제외함 */
export async function getPosts(): Promise<Post[]> {
	const posts = await getCollection('posts', ({ data }) => import.meta.env.DEV || !data.draft);
	return posts.sort((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
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

/** base(/tech-blog)를 붙인 내부 링크 */
export function withBase(path = '/'): string {
	const base = import.meta.env.BASE_URL.replace(/\/$/, '');
	const clean = path.replace(/^\//, '');
	return `${base}/${clean}`;
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
