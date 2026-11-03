import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORY_SLUGS } from './consts';

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
	schema: ({ image }) =>
		z
			.object({
				title: z.string(),
				description: z.string(),
				pubDate: z.coerce.date(),
				updatedDate: z.coerce.date().optional(),
				// 여러 개면 categories: [troubleshooting, backend] — 첫 번째가 대표 카테고리
				categories: z.array(z.enum(CATEGORY_SLUGS)).min(1).optional(),
				// 하나만 쓸 땐 category: backend 도 가능
				category: z.enum(CATEGORY_SLUGS).optional(),
				tags: z.array(z.string()).default([]),
				thumbnail: image().optional(),
				// true면 로컬(npm run dev)에서만 보이고 배포에는 빠짐
				draft: z.boolean().default(false),
			})
			.refine((d) => d.categories || d.category, {
				message: 'categories 또는 category 중 하나는 꼭 적어야 합니다',
			})
			.transform(({ category, categories, ...rest }) => ({
				...rest,
				categories: [...new Set(categories ?? (category ? [category] : []))],
			})),
});

export const collections = { posts };
