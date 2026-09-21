// Renders an `alx sync --json` summary as a GitHub step summary on stdout and as workflow
// annotations on stderr. Kept out of action.yml so it can be read and changed as JavaScript.
const summary = JSON.parse(process.argv[2]);
const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

const headline = summary.dry_run
  ? `Dry run: ${plural(summary.files, 'file', 'files')}, ${summary.bytes} bytes, ` +
    `${plural(summary.batches, 'batch', 'batches')}. Nothing was sent.`
  : `${summary.created} created, ${summary.changed} changed, ${summary.unchanged} unchanged, ` +
    `${summary.removed} removed, across ${plural(summary.batches, 'batch', 'batches')}.`;

const lines = [
  `### Alexandria sync`,
  ``,
  `\`${summary.dir}\` into \`${summary.space}\``,
  ``,
  headline,
  ``,
];
// A dry run mints a run id it never sends, so naming it would invite a search for a run that
// never reached the server.
if (!summary.dry_run && summary.run_id) lines.push(`Run \`${summary.run_id}\``, ``);
for (const jobId of summary.job_ids ?? []) lines.push(`Job \`${jobId}\``, ``);

for (const skipped of summary.skipped ?? []) {
  process.stderr.write(
    `::warning file=${skipped.path}::skipped, ${skipped.bytes} bytes is over ${skipped.limit} of ${skipped.max}\n`,
  );
}
for (const issue of summary.issues ?? []) {
  process.stderr.write(`::warning file=${issue.path}::${issue.code}: ${issue.message}\n`);
}

const reported = [...(summary.skipped ?? []), ...(summary.issues ?? [])];
if (reported.length > 0) {
  lines.push(
    `<details><summary>${plural(reported.length, 'reported path', 'reported paths')}</summary>`,
    ``,
  );
  for (const skipped of summary.skipped ?? [])
    lines.push(
      `- \`${skipped.path}\` skipped, ${skipped.bytes} bytes over ${skipped.limit} of ${skipped.max}`,
    );
  for (const issue of summary.issues ?? [])
    lines.push(`- \`${issue.path}\` ${issue.code}: ${issue.message}`);
  lines.push(``, `</details>`, ``);
}

process.stdout.write(`${lines.join('\n')}\n`);
