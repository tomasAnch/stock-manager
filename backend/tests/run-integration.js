import '../src/lib/load-env.js';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { requireTestDatabase } from './test-database.js';

const url = requireTestDatabase();
const require = createRequire(import.meta.url);
const cwd = fileURLToPath(new URL('..', import.meta.url));
const cli = join(dirname(require.resolve('prisma/package.json')), 'build/index.js');
const env = { ...process.env, DATABASE_URL: url, TEST_DATABASE_URL: url, NODE_ENV: 'test' };
for (const args of [[cli, 'migrate', 'deploy'], ['--import', 'tsx', '--test', 'tests/integration/database.test.js']]) {
  const result = spawnSync(process.execPath, args, { cwd, env, stdio: 'inherit' });
  if (result.error || result.status !== 0) process.exit(result.status || 1);
}
