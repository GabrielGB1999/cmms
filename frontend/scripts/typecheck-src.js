// Type-check src/ only: plain `tsc` stops at parse errors in node_modules/i18next typings (TS 4.7 vs
// i18next 25) and never reaches src, so it reports nothing even when src is broken.
// Usage: cd frontend && node scripts/typecheck-src.js
const ts = require(process.cwd() + '/node_modules/typescript');
const cfg = ts.getParsedCommandLineOfConfigFile('tsconfig.json', {}, { ...ts.sys, onUnRecoverableConfigFileDiagnostic: () => {} });
const program = ts.createProgram(cfg.fileNames, { ...cfg.options, noEmit: true });
let n = 0;
for (const sf of program.getSourceFiles()) {
  if (sf.fileName.includes('node_modules') || !sf.fileName.includes('/src/')) continue;
  for (const d of [...program.getSyntacticDiagnostics(sf), ...program.getSemanticDiagnostics(sf)]) {
    const { line } = sf.getLineAndCharacterOfPosition(d.start || 0);
    console.log(`${sf.fileName.split('/src/')[1]}:${line + 1} ${ts.flattenDiagnosticMessageText(d.messageText, ' ')}`);
    n++;
  }
}
console.log(n + ' errors in src');
