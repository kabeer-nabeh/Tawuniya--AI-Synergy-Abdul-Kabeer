import { cp, mkdir, rm } from 'node:fs/promises';

const output = new URL('../dist/', import.meta.url);
await rm(output, { recursive: true, force: true });
await mkdir(output);
for (const name of ['index.html', 'sign-in.html', 'demo.html', 'demo.css', 'public', 'src']) {
  await cp(new URL('../' + name, import.meta.url), new URL(name, output), { recursive: true, filter: source => !source.endsWith('/synergy-epmo-background.png') });
}
