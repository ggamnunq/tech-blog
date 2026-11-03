import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { CATEGORY_SLUGS } from './consts';

const posts = defineCollection({
	loader: glob({ base: './src/content/posts', pattern: '**/*.md' }),
	schema: ({ image }) =>
		z.object({
			title: z.string(),
			description: z.string(),
			pubDate: z.coerce.date(),
			updatedDate: z.coerce.date().optional(),
			category: z.enum(CATEGORY_SLUGS),
			tags: z.array(z.string()).default([]),
			thumbnail: image().optional(),
			// true면 로컬(npm run dev)에서만 보이고 배포에는 빠짐
			draft: z.boolean().default(false),
		}),
});

export const collections = { posts };
