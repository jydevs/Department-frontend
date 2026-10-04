#!/usr/bin/env node
// Ejecuta un comando con las variables de un archivo .env (perfil QA sin depender de NODE_ENV).
// Uso: node scripts/with-env.mjs .env.development -- next build
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const [file, sep, ...cmd] = process.argv.slice(2);
if (!file || sep !== "--" || cmd.length === 0) {
  console.error("Uso: node scripts/with-env.mjs <archivo.env> -- <comando…>");
  process.exit(1);
}
if (!existsSync(file)) {
  console.error(`No existe ${file}`);
  process.exit(1);
}
process.loadEnvFile(file);
const child = spawn(cmd[0], cmd.slice(1), { stdio: "inherit", env: process.env, shell: process.platform === "win32" });
child.on("exit", (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
