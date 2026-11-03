// @ts-check
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	site: 'https://ggamnunq.github.io',
	base: '/tech-blog',
	trailingSlash: 'ignore',
	integrations: [sitemap({ filter: (page) => !/\/(403|404)\/?$/.test(page) })],
	devToolbar: { enabled: false },
	markdown: {
		shikiConfig: {
			theme: 'github-light',
			wrap: false,
		},
	},
});
