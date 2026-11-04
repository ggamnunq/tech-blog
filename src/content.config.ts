import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORY_SLUGS, SERIES_SLUGS } from './consts';

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
	schema: ({ image }) =>
		z
			.object({
				title: z.string(),
				// 검색 결과·공유용 제목 (화면의 제목과 다르게 하고 싶을 때만). 없으면 title 사용
				seoTitle: z.string().optional(),
				description: z.string(),
				pubDate: z.coerce.date(),
				// 실제로 작업한 시기 (게시일과 별개). 예: "2026.04", "2026.03 ~ 04"
				workPeriod: z.string().optional(),
				updatedDate: z.coerce.date().optional(),
				// 여러 개면 categories: [troubleshooting, backend] — 첫 번째가 대표 카테고리
				categories: z.array(z.enum(CATEGORY_SLUGS)).min(1).optional(),
				// 하나만 쓸 땐 category: backend 도 가능
				category: z.enum(CATEGORY_SLUGS).optional(),
				tags: z.array(z.string()).default([]),
				// 시리즈 글이면 series(slug)와 seriesOrder(1부터)를 함께 적음
				series: z.enum(SERIES_SLUGS).optional(),
				seriesOrder: z.number().int().positive().optional(),
				thumbnail: image().optional(),
				// true면 로컬(npm run dev)에서만 보이고 배포에는 빠짐
				draft: z.boolean().default(false),
			})
			.refine((d) => d.categories || d.category, {
				message: 'categories 또는 category 중 하나는 꼭 적어야 합니다',
			})
			.refine((d) => !d.series || d.seriesOrder, {
				message: 'series를 적었다면 seriesOrder도 적어야 합니다',
			})
			.transform(({ category, categories, ...rest }) => ({
				...rest,
				categories: [...new Set(categories ?? (category ? [category] : []))],
			})),
});

export const collections = { posts };
