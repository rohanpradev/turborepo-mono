import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";

type TurboTask = {
  cache?: {
    source?: string;
    status?: string;
    timeSaved?: number;
  };
  execution?: {
    endTime?: number;
    exitCode?: number;
    startTime?: number;
  };
  package?: string;
  task?: string;
  taskId?: string;
};

type TurboRunSummary = {
  envMode?: string;
  execution?: {
    attempted?: number;
    cached?: number;
    command?: string;
    endTime?: number;
    exitCode?: number;
    failed?: number;
    startTime?: number;
    success?: number;
  };
  id?: string;
  packages?: Array<string>;
  tasks?: Array<TurboTask>;
  turboVersion?: string;
};

const runsDir = path.join(process.cwd(), ".turbo", "runs");
const outputPath = path.join(process.cwd(), "docs", "turbo-report.md");

const formatMs = (value?: number) => {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "n/a";
  }

  if (value < 1000) {
    return `${Math.round(value)}ms`;
  }

  return `${(value / 1000).toFixed(2)}s`;
};

const duration = (startTime?: number, endTime?: number) =>
  typeof startTime === "number" && typeof endTime === "number"
    ? Math.max(0, endTime - startTime)
    : undefined;

const formatDate = (value?: number) =>
  typeof value === "number" ? new Date(value).toISOString() : "n/a";

const tableCell = (value: unknown) =>
  String(value ?? "n/a")
    .replaceAll("|", "\\|")
    .replaceAll("\n", " ");

const latestRunPath = async () => {
  const entries = await readdir(runsDir).catch(() => []);
  const jsonFiles = entries.filter((entry) => entry.endsWith(".json"));

  const candidates = await Promise.all(
    jsonFiles.map(async (entry) => {
      const filePath = path.join(runsDir, entry);
      return {
        filePath,
        modifiedAt: (await stat(filePath)).mtimeMs,
      };
    }),
  );

  return candidates.sort((left, right) => right.modifiedAt - left.modifiedAt)[0]
    ?.filePath;
};

const readLatestSummary = async () => {
  const filePath = await latestRunPath();

  if (!filePath) {
    return { filePath: null, summary: null };
  }

  return {
    filePath,
    summary: (await Bun.file(filePath).json()) as TurboRunSummary,
  };
};

const buildReport = (summary: TurboRunSummary, sourcePath: string) => {
  const tasks = summary.tasks ?? [];
  const attempted = summary.execution?.attempted ?? tasks.length;
  const cached =
    summary.execution?.cached ??
    tasks.filter((task) => task.cache?.status === "HIT").length;
  const executed = Math.max(0, attempted - cached);
  const failed =
    summary.execution?.failed ??
    tasks.filter((task) => task.execution?.exitCode !== 0).length;
  const cacheHitRate =
    attempted > 0 ? `${Math.round((cached / attempted) * 100)}%` : "n/a";
  const totalDuration = duration(
    summary.execution?.startTime,
    summary.execution?.endTime,
  );
  const sortedTasks = [...tasks].sort(
    (left, right) =>
      (duration(right.execution?.startTime, right.execution?.endTime) ?? 0) -
      (duration(left.execution?.startTime, left.execution?.endTime) ?? 0),
  );

  const rows = sortedTasks.map((task) =>
    [
      task.taskId,
      task.cache?.status ?? "MISS",
      task.cache?.source ?? "EXECUTED",
      formatMs(duration(task.execution?.startTime, task.execution?.endTime)),
      formatMs(task.cache?.timeSaved),
    ]
      .map(tableCell)
      .join(" | "),
  );

  return [
    "# Turbo Run Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Summary: ${sourcePath}`,
    "",
    "## Run",
    "",
    `- Command: \`${summary.execution?.command ?? "unknown"}\``,
    `- Turbo: ${summary.turboVersion ?? "unknown"}`,
    `- Env mode: ${summary.envMode ?? "unknown"}`,
    `- Started: ${formatDate(summary.execution?.startTime)}`,
    `- Duration: ${formatMs(totalDuration)}`,
    `- Packages: ${summary.packages?.length ?? 0}`,
    "",
    "## Cache",
    "",
    `- Tasks: ${attempted}`,
    `- Cached: ${cached}`,
    `- Executed: ${executed}`,
    `- Failed: ${failed}`,
    `- Cache hit rate: ${cacheHitRate}`,
    "",
    "## Tasks",
    "",
    "| Task | Cache | Source | Duration | Time saved |",
    "| --- | --- | --- | --- | --- |",
    ...(rows.length > 0
      ? rows.map((row) => `| ${row} |`)
      : ["| n/a | n/a | n/a | n/a | n/a |"]),
    "",
  ].join("\n");
};

const main = async () => {
  const { filePath, summary } = await readLatestSummary();

  if (!filePath || !summary) {
    const report = [
      "# Turbo Run Report",
      "",
      `Generated: ${new Date().toISOString()}`,
      "",
      "No Turbo run summaries were found. Run `bun run turbo:summary` first.",
      "",
    ].join("\n");

    await mkdir(path.dirname(outputPath), { recursive: true });
    await Bun.write(outputPath, report);
    console.log(report);
    return;
  }

  const report = buildReport(summary, path.relative(process.cwd(), filePath));
  await mkdir(path.dirname(outputPath), { recursive: true });
  await Bun.write(outputPath, report);
  console.log(report);
};

await main();
