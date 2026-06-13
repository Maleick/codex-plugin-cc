import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import process from "node:process";
import { spawnSync } from "node:child_process";

// Tests rely on temp-backed state directories. If the ambient environment
// points CLAUDE_PLUGIN_DATA at a real plugin-data dir (as Claude Code does),
// resolveStateDir() routes state there and breaks those assumptions — and the
// mismatch between this process and the child processes it spawns surfaces as
// "no jobs recorded". Clear it so every test process, and the children that
// inherit this environment, fall back to the default os.tmpdir() location.
delete process.env.CLAUDE_PLUGIN_DATA;

export const WINDOWS = process.platform === "win32";

// Creating symlinks is forbidden in some environments (notably Windows without
// Developer Mode or admin rights). Probe once so symlink-dependent tests can
// skip with a reason instead of failing with EPERM. On CI (Linux) this is true.
export const SYMLINKS_SUPPORTED = (() => {
  let probeDir;
  try {
    probeDir = fs.mkdtempSync(path.join(os.tmpdir(), "codex-symlink-probe-"));
    fs.symlinkSync("probe-target", path.join(probeDir, "probe-link"));
    return true;
  } catch {
    return false;
  } finally {
    if (probeDir) {
      try {
        fs.rmSync(probeDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup failures
      }
    }
  }
})();

export function makeTempDir(prefix = "codex-plugin-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

export function writeExecutable(filePath, source) {
  fs.writeFileSync(filePath, source, { encoding: "utf8", mode: 0o755 });
}

export function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    input: options.input,
    shell: process.platform === "win32" && !path.isAbsolute(command),
    windowsHide: true
  });
}

export function initGitRepo(cwd) {
  run("git", ["init", "-b", "main"], { cwd });
  run("git", ["config", "user.name", "Codex Plugin Tests"], { cwd });
  run("git", ["config", "user.email", "tests@example.com"], { cwd });
  run("git", ["config", "commit.gpgsign", "false"], { cwd });
  run("git", ["config", "tag.gpgsign", "false"], { cwd });
}
