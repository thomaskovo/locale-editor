import {readdir} from 'node:fs/promises';
import path from 'node:path'
import {dialog, ipcMain} from 'electron'


async function findLocalesDirs(dir: string, results: string[] = []): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });

  const defaultExcludes = ['node_modules', '.git', 'dist', 'build'];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (defaultExcludes.includes(entry.name)) continue;
    if (entry.isDirectory()) {
      if (entry.name === 'locales') {
        results.push(fullPath);
      } else {
        await findLocalesDirs(fullPath, results); // recursive call
      }
    }
  }

  return results;
}

export const findLocalesPaths = () => {
  ipcMain.handle("find-locales-dirs", async () => {
    const { filePaths, canceled } = await dialog.showOpenDialog({
      properties: ["openDirectory"],
    });

    if (canceled || filePaths.length === 0) {
      return { error: "No directory selected" };
    }

    const selectedDir = filePaths[0];
    try {
      const localesDirs = await findLocalesDirs(selectedDir);
      return {
        selectedDir,
        localesDirs
      };
    } catch (error) {
      console.error("Error searching for 'locales' directories:", error);
      return { error: "Failed to search for 'locales' directories" };
    }
  });
}
