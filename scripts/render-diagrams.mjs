// diagrams/<slug>/*.svg → src/assets/posts/<slug>/*.png (2x)
// Pretendard를 불러온 페이지에서 렌더링해 블로그 본문과 같은 폰트로 그림을 만든다.
// 사용: npm run diagrams            (전체)
//       npm run diagrams -- <slug>  (특정 글만)
//
// 아이콘: SVG 안에서 <image href="icon:종류/이름#색" .../> 로 쓰면 렌더할 때 실제 아이콘으로 바꿔 넣음
//   icon:simple/springboot#6DB33F   — simple-icons (CC0) 브랜드 로고, # 뒤 색으로 칠함
//   icon:lucide/user#4E5968          — lucide (ISC) 일반 아이콘 (선 색)
//   icon:devicon/spring/spring-original — devicon (MIT) 원래 색 로고 그대로
//   icon:aws/Arch_Amazon-EC2_48      — AWS 공식 아키텍처 아이콘 (diagrams/_vendor/aws, `npm run aws-icons`로 받음), 색 그대로
// 폴더 이름이 _로 시작하면(시안용) node_modules/.cache/diagram-preview/ 로 출력 (레포에 안 남음)
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
const path_ = path;
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(import.meta.dirname, '..');
const srcRoot = path.join(root, 'diagrams');
const outRoot = path.join(root, 'src/assets/posts');
let awsIndex;
function findAwsIcon(name) {
	if (!awsIndex) {
		awsIndex = new Map();
		const walk = (dir) => {
			for (const e of readdirSync(dir, { withFileTypes: true })) {
				const full = path_.join(dir, e.name);
				if (e.isDirectory()) walk(full);
				else if (e.name.endsWith('.svg')) awsIndex.set(e.name.replace(/\.svg$/, ''), full);
			}
		};
		const base = path_.join(root, 'diagrams/_vendor/aws');
		if (!existsSync(base)) throw new Error('AWS 아이콘이 없음 — npm run aws-icons 로 먼저 받기');
		walk(base);
	}
	const file = awsIndex.get(name);
	if (!file) throw new Error(`AWS 아이콘을 찾을 수 없음: ${name}`);
	return file;
}

function iconDataUri(spec) {
	const [path, color = '191F28'] = spec.split('#');
	const [kind, ...rest] = path.split('/');
	let svg;
	if (kind === 'simple') {
		svg = readFileSync(path_.join(root, 'node_modules/simple-icons/icons', `${rest[0]}.svg`), 'utf8').replace('<svg ', `<svg fill="#${color}" `);
	} else if (kind === 'lucide') {
		svg = readFileSync(path_.join(root, 'node_modules/lucide-static/icons', `${rest[0]}.svg`), 'utf8')
			.replace(/<!--[\s\S]*?-->/, '')
			.replaceAll('currentColor', `#${color}`);
	} else if (kind === 'aws') {
		svg = readFileSync(findAwsIcon(rest[0]), 'utf8');
	} else if (kind === 'devicon') {
		svg = readFileSync(path_.join(root, 'node_modules/devicon/icons', rest[0], `${rest[1]}.svg`), 'utf8');
	} else {
		throw new Error(`unknown icon: ${spec}`);
	}
	return `data:image/svg+xml;base64,${Buffer.from(svg.trim()).toString('base64')}`;
}

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
	const outDir = slug.startsWith('_') ? path.join(root, 'node_modules/.cache/diagram-preview', slug) : path.join(outRoot, slug);
	await mkdir(outDir, { recursive: true });
	for (const file of files) {
		const svg = (await readFile(path.join(srcRoot, slug, file), 'utf8')).replace(/href="icon:([^"]+)"/g, (_, spec) => `href="${iconDataUri(spec)}"`);
		await writeFile(
			tmpHtml,
			`<!doctype html><html><head><meta charset="utf-8"><link rel="stylesheet" href="${fontCss}">
			<style>html,body{margin:0;padding:0;background:transparent}svg{display:block}</style></head><body>${svg}</body></html>`,
		);
		await page.goto(pathToFileURL(tmpHtml).href);
		await page.evaluate(() => document.fonts.ready);
		const out = path.join(outDir, file.replace(/\.svg$/, '.png'));
		await page.locator('svg').first().screenshot({ path: out, omitBackground: true });
		console.log('✓', path.relative(root, out));
	}
}

await rm(tmpHtml, { force: true });
await browser.close();
