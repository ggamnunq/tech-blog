import rss from '@astrojs/rss';
import { SITE } from '../consts';
import { getPosts, withBase } from '../lib/posts';

export async function GET(context) {
	const posts = await getPosts();
	return rss({
		title: SITE.title,
		description: SITE.description,
		site: context.site,
		items: posts.map((post) => ({
			title: post.data.title,
			description: post.data.description,
			pubDate: post.data.pubDate,
			categories: [...post.data.categories, ...post.data.tags],
			link: withBase(`posts/${post.id}/`),
		})),
		customData: '<language>ko</language>',
	});
}
