import { Router } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const router = Router();

function resolvePublicDir(): string {
  const override = process.env.BACKGROUND_ASSETS_DIR;
  if (override) {
    return path.resolve(override);
  }
  return path.resolve(process.cwd(), '../frontend/public');
}

async function listSvgFiles(dir: string, prefix: string): Promise<string[]> {
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.svg'))
      .map((entry) => `${prefix}/${entry.name}`);
  } catch (error) {
    return [];
  }
}

router.get('/', async (_req, res) => {
  try {
    const publicDir = resolvePublicDir();
    const top = await listSvgFiles(path.join(publicDir, 'top'), '/top');
    const bottom = await listSvgFiles(path.join(publicDir, 'bottom'), '/bottom');
    return res.json({ top, bottom });
  } catch (error) {
    console.error('backgrounds route error', error);
    return res.status(500).json({ top: [], bottom: [] });
  }
});

export default router;
