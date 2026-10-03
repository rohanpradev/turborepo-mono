// Runs only against compose.integration.yml. Never accepts application DB URLs.
const prefix = [
  "docker",
  "compose",
  "-f",
  "compose.integration.yml",
  "exec",
  "-T",
];
const run = async (args: string[], input?: Uint8Array) => {
  const child = Bun.spawn([...prefix, ...args], {
    stdin: input ?? "ignore",
    stdout: "pipe",
    stderr: "pipe",
  });
  const [output, error, code] = await Promise.all([
    new Response(child.stdout).arrayBuffer(),
    new Response(child.stderr).text(),
    child.exited,
  ]);
  if (code !== 0)
    throw new Error(`Recovery command failed (${args[0]}): ${error}`);
  return new Uint8Array(output);
};
const sql = (database: string, query: string) =>
  run([
    "postgres",
    "psql",
    "-U",
    "postgres",
    "-d",
    database,
    "-v",
    "ON_ERROR_STOP=1",
    "-Atc",
    query,
  ]);
const mongo = (javascript: string) =>
  run(["mongo", "mongosh", "--quiet", "--eval", javascript]);
const suffix = crypto.randomUUID().replaceAll("-", "");
const database = `drill_${suffix}_restore_test`;
const marker = `recovery-${suffix}`;
let postgresCreated = false;
let mongoCreated = false;
const started = performance.now();
try {
  await sql(
    "commerce_test",
    `INSERT INTO payment.rate_limit(key,window_start,count) VALUES('${marker}',now(),7)`,
  );
  const pgArchive = await run([
    "postgres",
    "pg_dump",
    "-U",
    "postgres",
    "-d",
    "commerce_test",
    "-Fc",
  ]);
  await sql("postgres", `CREATE DATABASE ${database}`);
  postgresCreated = true;
  await run(
    [
      "postgres",
      "pg_restore",
      "-U",
      "postgres",
      "-d",
      database,
      "--exit-on-error",
      "--no-owner",
    ],
    pgArchive,
  );
  const value = new TextDecoder()
    .decode(
      await sql(
        database,
        `SELECT count FROM payment.rate_limit WHERE key='${marker}'`,
      ),
    )
    .trim();
  if (value !== "7")
    throw new Error("Restored PostgreSQL marker did not match.");
  const tables = new TextDecoder()
    .decode(
      await sql(
        database,
        "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('payment','inventory')",
      ),
    )
    .trim();
  if (Number(tables) < 9)
    throw new Error(
      "Expected payment and inventory tables in restored backup.",
    );
  await mongo(
    `db.getSiblingDB('commerce_test').recovery_probe.insertOne({_id:'${marker}',value:7})`,
  );
  const mongoArchive = await run([
    "mongo",
    "mongodump",
    "--db",
    "commerce_test",
    "--archive",
    "--gzip",
  ]);
  // Unique restore destination; no --drop and no connection to an application database.
  mongoCreated = true;
  await run(
    [
      "mongo",
      "mongorestore",
      "--archive",
      "--gzip",
      "--nsFrom",
      "commerce_test.*",
      "--nsTo",
      `${database}.*`,
    ],
    mongoArchive,
  );
  await mongo(
    `if(db.getSiblingDB('${database}').recovery_probe.findOne({_id:'${marker}'})?.value!==7)quit(2)`,
  );
  console.log(
    JSON.stringify(
      {
        result: "passed",
        durationSeconds: Number(
          ((performance.now() - started) / 1000).toFixed(2),
        ),
        postgresArchiveBytes: pgArchive.length,
        mongoArchiveBytes: mongoArchive.length,
        scope:
          "Disposable PostgreSQL and MongoDB backup/restore; not production RPO/RTO",
      },
      null,
      2,
    ),
  );
} finally {
  await sql(
    "commerce_test",
    `DELETE FROM payment.rate_limit WHERE key='${marker}'`,
  );
  await mongo(
    `db.getSiblingDB('commerce_test').recovery_probe.deleteOne({_id:'${marker}'})`,
  );
  if (postgresCreated) await sql("postgres", `DROP DATABASE ${database}`);
  if (mongoCreated)
    await mongo(`db.getSiblingDB('${database}').dropDatabase()`);
}
