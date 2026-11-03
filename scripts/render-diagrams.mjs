// diagrams/<slug>/*.svg → src/assets/posts/<slug>/*.png (2x)
// Pretendard를 불러온 페이지에서 렌더링해 블로그 본문과 같은 폰트로 그림을 만든다.
// 사용: npm run diagrams            (전체)
//       npm run diagrams -- <slug>  (특정 글만)
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const srcRoot = path.join(root, 'diagrams');
const outRoot = path.join(root, 'src/assets/posts');
const fontCss = pathToFileURL(path.join(root, 'node_modules/pretendard/dist/web/variable/pretendardvariable.css')).href;

const only = process.argv[2];
const slugs = (await readdir(srcRoot, { withFileTypes: true }))
	.filter((d) => d.isDirectory() && (!only || d.name === only))
	.map((d) => d.name);

const browser = await chromium.launch();
const page = await browser.newPage({ deviceScaleFactor: 2 });
const tmpHtml = path.join(tmpdir(), `render-diagram-${process.pid}.html`);

for (const slug of slugs) {
	const files = (await readdir(path.join(srcRoot, slug))).filter((f) => f.endsWith('.svg'));
	await mkdir(path.join(outRoot, slug), { recursive: true });
	for (const file of files) {
		const svg = await readFile(path.join(srcRoot, slug, file), 'utf8');
		await writeFile(
			tmpHtml,
			`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${fontCss}">
			<style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`,
		);
		await page.goto(pathToFileURL(tmpHtml).href);
		await page.evaluate(() => document.fonts.ready);
		const out = path.join(outRoot, slug, file.replace(/\.svg$/, '.png'));
		await page.locator('svg').first().screenshot({ path: out, omitBackground: true });
		console.log('✓', path.relative(root, out));
	}
}

await rm(tmpHtml, { force: true });
await browser.close();
