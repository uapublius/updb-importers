import path from 'path';
import fs from 'fs/promises';
import Piscina from 'piscina';
import { Knex } from 'knex';
import { JSDOM } from 'jsdom';
import { createReport, createReference } from '../../report';
import { cleanText, walk } from '../../utils';
import config from '../../config.json';

let queue = new Piscina({ filename: __dirname + '/../../out/importers/ufodna/build.js' });

async function buildReferencesMap(sources, createReferenceFn) {
  let referencesMap = {};

  for (const file of sources) {
    if (!file.endsWith(".htm")) return;

    let id = path.parse(file).name.replace(".htm", "");
    let html = await fs.readFile(file, { encoding: "utf8" });
    let { window } = new JSDOM(html);
    let nodes = window.document.querySelector('body > table > tbody > tr > td > table > tbody > tr:nth-child(2) > td > h1').childNodes;

    let lines = [...nodes].map(node => {
      let text = node.textContent.trim();

      if (node["tagName"] === "A") {
        if (text === "...On the Web Here...") text = node["href"];
        else if (!node["href"].includes("amazon.com")) text += "\n" + node["href"];
      }
      else if (node["tagName"] === "BR") {
        // text += "\n";
      }

      return text;
    }).filter(n => n);

    lines = lines.map(f => f
      .split('\n')
      .map(ff => ff
        .replace(/^,/, '')
        .replace(/,$/, '')
      )
    ).flat();

    let sourceText = lines.join('\n');
    sourceText = cleanText(sourceText);

    if (sourceText) {
      let record = await createReferenceFn(sourceText);
      referencesMap[id] = parseInt(record.id);
    }
  }

  return referencesMap;
}

export default async function start(connection: Knex<any, unknown>) {
  console.log('[UFODNA] Starting...');

  let failed = [];
  let sources = await walk(config.sources.ufodna.sourcesPath);
  let createReferenceFn = createReference(connection);
  let referencesMap = await buildReferencesMap(sources, createReferenceFn);
  let addFn = createReport(connection);
  let completed = 0;

  queue.on('drain', async () => {
    await fs.writeFile('failed/failed-ufodna.json', JSON.stringify(failed, null, 2));
  });

  let dirs = await fs.readdir(config.sources.ufodna.path, { withFileTypes: true });
  dirs = dirs.filter(dir => dir.name.startsWith('uf'));
  let files = [];

  setInterval(() => {
    console.log(`[UFODNA] Completed: ${completed}/${files.length}`);
  }, 3000);

  for (const dir of dirs) {
    let fullPath = path.join(config.sources.ufodna.path, dir.name);
    files = files.concat(await walk(fullPath));
    console.log(`[UFODNA] [${dir.name}] ${files.length} files parsed.`);
  }

  for (const file of files) {
    try {
      let report = await queue.run({ file, referencesMap });
      await addFn(report);
    } catch (error) {
      failed.push([error.message, file]);
    } finally {
      completed++;
    }
  }
}
