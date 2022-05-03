import path from "path";
import fs from "fs/promises";
import Piscina from "piscina";
import { Knex } from "knex";
import { JSDOM } from "jsdom";
import Logger from "js-logger";
import { createReport, createReference } from "../../report";
import { cleanText, walk } from "../../utils";
import config from "../../config.json";

let queue = new Piscina({ filename: __dirname + "/build.js", concurrentTasksPerWorker: 4 });

async function buildReferencesMap(sources, createReferenceFn) {
  let referencesMap = {};

  for (const file of sources) {
    if (!file.endsWith(".htm")) return;

    let id = path.parse(file).name.replace(".htm", "");
    let html = await fs.readFile(file, { encoding: "utf8" });
    let { window } = new JSDOM(html);
    let nodes = window.document.querySelector(
      "body > table > tbody > tr > td > table > tbody > tr:nth-child(2) > td > h1"
    ).childNodes;

    let lines = [...nodes]
      .map(node => {
        let text = node.textContent.trim();

        if (node["tagName"] === "A") {
          if (text === "...On the Web Here...") text = node["href"];
          else if (!node["href"].includes("amazon.com")) text += "\n" + node["href"];
        } else if (node["tagName"] === "BR") {
          // text += "\n";
        }

        return text;
      })
      .filter(n => n);

    lines = lines.map(f => f.split("\n").map(ff => ff.replace(/^,/, "").replace(/,$/, ""))).flat();

    let sourceText = lines.join("\n");
    sourceText = cleanText(sourceText);

    if (sourceText) {
      let record = await createReferenceFn(sourceText);
      referencesMap[id] = parseInt(record.id);
    }
  }

  return referencesMap;
}

export default async function start(connection: Knex<any, unknown>) {
  Logger.info("[UFODNA] Starting...");

  let targetSources = path.join(config.sources.prefix, config.sources.ufodna.sourcesPath);
  let sources = await walk(targetSources);
  let createReferenceFn = createReference(connection);
  let referencesMap = await buildReferencesMap(sources, createReferenceFn);
  let addFn = createReport(connection);
  let completed = 0;

  let target = path.join(config.sources.prefix, config.sources.ufodna.path);
  let dirs = await fs.readdir(target, { withFileTypes: true });
  dirs = dirs.filter(dir => dir.name.startsWith("uf"));
  let files = [];

  setInterval(() => {
    Logger.info(`[UFODNA] Completed: ${completed}/${files.length}`);
  }, 3000);

  for (const dir of dirs) {
    let fullPath = path.join(config.sources.prefix, config.sources.ufodna.path, dir.name);
    files = files.concat(await walk(fullPath));
    Logger.info(`[UFODNA] [${dir.name}] ${files.length} files parsed.`);
  }

  for (const file of files) {
    try {
      let report = await queue.run({ file, referencesMap });
      if (report) await addFn(report);
    } catch (error) {
      Logger.error(error.message);
    } finally {
      completed++;
    }
  }
}
