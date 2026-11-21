#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = ["pyyaml>=6"]
# ///
"""Guardrails: plain pass or fail checks, filed under Lauren Tan's layers, widest first. Never edits the repo.

    uv run guardrails.py init  [repo]        print a proposed checks.yml (writes nothing)
    uv run guardrails.py check [repo]        every check, on or off, with why
    uv run guardrails.py diff  [repo ...]    only what changed since the last run; silent when nothing did
    uv run guardrails.py diff --repos FILE   the same, for each repo path listed in FILE
    uv run guardrails.py friction [repo]     friction tags from the trail log, worst first

State lives in $XDG_STATE_HOME/guardrails (default ~/.local/state/guardrails), never in the repo.
Friction comes from the trail skill's log in $XDG_STATE_HOME/trail.
"""
import fnmatch
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
import tomllib
from pathlib import Path

try:
    import yaml
except ImportError:
    sys.exit("guardrails needs PyYAML. Run it with `uv run guardrails.py`, or `pip install pyyaml`.")

HOME = ".agents/guardrails"
CONFIG = f"{HOME}/checks.yml"
SG = f"{HOME}/sgconfig.yml"
LAYERS = ["codebase", "static analysis", "verification", "prose"]
CHECKS = {
    "gitignore": ("codebase", ".gitignore covers caches, builds, .env and .DS_Store."),
    "no-secrets": ("codebase", "No committed secrets."),
    "lockfile": ("codebase", "The lockfile is committed."),
    "pre-commit": ("static analysis", "A pre-commit hook runs typecheck and lint."),
    "tests-before-merge": ("static analysis", "Tests run before merge to main (CI or a pre-push hook)."),
    "strict-types": ("static analysis", "Types are strict."),
    "lint": ("static analysis", "The linter is configured and passes."),
    "format": ("static analysis", "A formatter checks every commit (pre-commit hook) and the code is formatted."),
    "ast-grep": ("static analysis", "ast-grep YAML rules pass scan and their own tests."),
    "no-comments": ("static analysis", "Code comments are banned: lint runs a ratchet whose counts only go down."),
    "yaml": ("static analysis", "All YAML parses."),
    "verify": ("verification", "A verify command (approved output, snapshot or end-to-end tests) runs before push and passes."),
    "agents-md": ("prose", "AGENTS.md exists and is short."),
}
AGENTS_LINE = "Log friction and decisions with the trail skill."
SECRET = re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----|AKIA[0-9A-Z]{16}|sk-ant-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|xox[abprs]-[A-Za-z0-9-]{10,}")


def sh(repo, cmd, timeout=1800):
    try:
        r = subprocess.run(cmd, shell=True, cwd=repo, capture_output=True, text=True, timeout=timeout)
        return r.returncode, (r.stdout + r.stderr).strip()
    except subprocess.TimeoutExpired:
        return 124, f"timed out after {timeout}s"


def git(repo, *args):
    return subprocess.run(["git", *args], cwd=repo, capture_output=True, text=True).stdout


def tracked(repo):
    return [f for f in git(repo, "ls-files", "-z").split("\0") if f]


def load_config(repo):
    p = Path(repo, CONFIG)
    if not p.exists():
        return {"commands": {}, "checks": {}, "dismissed": []}
    c = yaml.safe_load(p.read_text()) or {}
    c.setdefault("commands", {})
    c["checks"] = {k: v in (True, "on", "true", "yes") for k, v in (c.get("checks") or {}).items()}
    c["dismissed"] = list(c.get("dismissed") or [])
    return c


def detect_commands(repo):
    pkg = Path(repo, "package.json")
    if pkg.exists():
        scripts = json.loads(pkg.read_text()).get("scripts", {})
        pm = "pnpm" if Path(repo, "pnpm-lock.yaml").exists() else "yarn" if Path(repo, "yarn.lock").exists() else "bun" if any(Path(repo, f).exists() for f in ("bun.lock", "bun.lockb")) else "npm run"
        cmds = {k: f"{pm} {k}" for k in ("typecheck", "lint", "test") if k in scripts}
        deps = {**json.loads(pkg.read_text()).get("dependencies", {}), **json.loads(pkg.read_text()).get("devDependencies", {})}
        run = "npx" if pm == "npm run" else f"{pm} exec"
        if "format:check" in scripts:
            cmds["format"] = f"{pm} format:check"
        elif "oxfmt" in deps:
            cmds["format"] = f"{run} oxfmt --check ."
        elif "prettier" in deps:
            cmds["format"] = f"{run} prettier --check ."
        elif "@biomejs/biome" in deps:
            cmds["format"] = f"{run} biome format ."
        return cmds
    if Path(repo, "pyproject.toml").exists():
        return {"typecheck": "uv run mypy .", "lint": "uv run ruff check .", "format": "uv run ruff format --check .", "test": "uv run pytest"}
    if Path(repo, "go.mod").exists():
        return {"format": 'test -z "$(gofmt -l .)"', "test": "go test ./..."}
    if Path(repo, "Cargo.toml").exists():
        return {"format": "cargo fmt --check", "test": "cargo test"}
    return {}


def hooks_dir(repo):
    return Path(repo, git(repo, "rev-parse", "--git-path", "hooks").strip())


def hook_runs(repo, name, *cmds):
    h = hooks_dir(repo) / name
    if not h.exists() or not os.access(h, os.X_OK):
        return False, f"no executable {name} hook"
    body = h.read_text(errors="replace")
    missing = [c for c in cmds if c and c not in body]
    return (not missing, f"{name} hook does not run: {', '.join(missing)}" if missing else f"{name} hook runs {', '.join(cmds)}")


def jsonc(text):
    text = re.sub(r'("(?:\\.|[^"\\])*")|//[^\n]*|/\*.*?\*/', lambda m: m.group(1) or "", text, flags=re.S)
    return json.loads(re.sub(r",(\s*[}\]])", r"\1", text))


def ts_strict(repo, path, seen=()):
    if path in seen or not path.exists():
        return None
    cfg = jsonc(path.read_text())
    own = (cfg.get("compilerOptions") or {}).get("strict")
    if own is not None:
        return own
    for ext in [cfg["extends"]] if isinstance(cfg.get("extends"), str) else cfg.get("extends") or []:
        base = (path.parent / ext) if ext.startswith(".") else Path(repo, "node_modules", ext)
        for cand in (base, base.with_suffix(".json"), base / "tsconfig.json"):
            if cand.is_file():
                found = ts_strict(repo, cand, seen + (path,))
                if found is not None:
                    return found
    return None


def ast_grep_bin(repo):
    local = Path(repo, "node_modules", ".bin", "ast-grep")
    return str(local) if local.exists() else shutil.which("ast-grep")


# ---- the checks: each returns (passed, why) ----

def c_pre_commit(repo, cfg):
    cmds = cfg["commands"]
    if not cmds.get("typecheck") or not cmds.get("lint"):
        return False, f"set commands.typecheck and commands.lint in {CONFIG}"
    ok, why = hook_runs(repo, "pre-commit", cmds["typecheck"], cmds["lint"])
    return passes(repo, cmds["typecheck"], cmds["lint"]) if ok else (ok, why)


def passes(repo, *cmds):
    """The hook only counts if what it runs passes today."""
    for cmd in cmds:
        code, out = sh(repo, cmd)
        if code:
            return False, f"{cmd} fails: {out.splitlines()[-1][:160] if out else code}"
    return True, f"{', '.join(cmds)} pass"


def c_tests_before_merge(repo, cfg):
    test = cfg["commands"].get("test")
    if not test:
        return False, f"set commands.test in {CONFIG}"
    wired = any(test in wf.read_text(errors="replace") for wf in Path(repo, ".github", "workflows").glob("*.y*ml"))
    ok, why = (True, "CI runs it") if wired else hook_runs(repo, "pre-push", test)
    return passes(repo, test) if ok else (ok, why)


def c_verify(repo, cfg):
    verify = cfg["commands"].get("verify")
    if not verify:
        return False, f"set commands.verify in {CONFIG}: a command that checks real output"
    wired = any(verify in wf.read_text(errors="replace") for wf in Path(repo, ".github", "workflows").glob("*.y*ml"))
    ok, why = (True, "CI runs it") if wired else hook_runs(repo, "pre-push", verify)
    return passes(repo, verify) if ok else (ok, why)


def c_format(repo, cfg):
    fmt = cfg["commands"].get("format")
    if not fmt:
        return False, f"set commands.format in {CONFIG}: the formatter in check mode"
    ok, why = hook_runs(repo, "pre-commit", fmt)
    return passes(repo, fmt) if ok else (ok, why)


def c_strict_types(repo, cfg):
    ts = Path(repo, "tsconfig.json")
    if ts.exists():
        s = ts_strict(repo, ts)
        return bool(s), "tsconfig strict is on" if s else "tsconfig strict is not on"
    py = Path(repo, "pyproject.toml")
    if py.exists():
        tool = tomllib.loads(py.read_text()).get("tool", {})
        if tool.get("mypy", {}).get("strict") is True or tool.get("pyright", {}).get("typeCheckingMode") == "strict":
            return True, "mypy or pyright is strict"
        return False, "set [tool.mypy] strict = true or [tool.pyright] typeCheckingMode = \"strict\""
    return False, "no tsconfig.json or pyproject.toml"


def c_lint(repo, cfg):
    files = tracked(repo)
    has = any(fnmatch.fnmatch(f, p) for f in files for p in ("eslint.config.*", ".eslintrc*", "ruff.toml", ".ruff.toml", "biome.json")) or "[tool.ruff" in (Path(repo, "pyproject.toml").read_text() if Path(repo, "pyproject.toml").exists() else "")
    if not has:
        return False, "no linter config"
    cmd = cfg["commands"].get("lint")
    if not cmd:
        return False, f"set commands.lint in {CONFIG}"
    code, out = sh(repo, cmd)
    return code == 0, f"{cmd} passes" if code == 0 else f"{cmd} fails: {out.splitlines()[-1][:160] if out else code}"


def c_ast_grep(repo, cfg):
    if not Path(repo, SG).exists():
        return False, f"no {SG}"
    exe = ast_grep_bin(repo)
    if not exe:
        return False, "ast-grep is not installed (npm i -D @ast-grep/cli, or brew install ast-grep)"
    if not (yaml.safe_load(Path(repo, SG).read_text()) or {}).get("testConfigs"):
        return False, "sgconfig.yml has no testConfigs, so the rules have no tests"
    for sub in (f"scan -c {SG}", f"test -c {SG} --skip-snapshot-tests"):
        code, out = sh(repo, f"'{exe}' {sub}")
        if code:
            return False, f"ast-grep {sub.split()[0]} fails: {out.splitlines()[-1][:160] if out else code}"
    return True, "ast-grep scan and test pass"


def c_no_comments(repo, cfg):
    script, base = f"{HOME}/check-comments.mjs", f"{HOME}/comments.json"
    if not Path(repo, script).exists() or not Path(repo, base).exists():
        return False, f"no {script} with comments.json: run the delete-comment skill"
    lint = cfg["commands"].get("lint", "")
    wired = "check-comments" in lint or any("check-comments" in Path(repo, f).read_text(errors="replace") for f in ("package.json", "pyproject.toml", "Makefile") if Path(repo, f).exists())
    if not wired:
        return False, f"the lint command does not run node {script}"
    code, out = sh(repo, f"node {script}")
    return code == 0, out.splitlines()[-1][:160] if out else f"node {script} exits {code}"


def c_gitignore(repo, cfg):
    probes = [".env", ".DS_Store"]
    if Path(repo, "package.json").exists():
        probes += ["node_modules/x"]
    if any(f.endswith(".py") for f in tracked(repo)):
        probes += ["__pycache__/x.pyc"]
    missing = [p for p in probes if subprocess.run(["git", "check-ignore", "-q", "--no-index", p], cwd=repo).returncode]
    builds = [b for b in ("dist/x", "build/x", ".output/x", "out/x") if not subprocess.run(["git", "check-ignore", "-q", "--no-index", b], cwd=repo).returncode]
    if not builds:
        missing.append("a build folder (dist, build, .output or out)")
    return not missing, "caches, builds, .env and .DS_Store are ignored" if not missing else "not ignored: " + ", ".join(m.removesuffix("/x") for m in missing)


def c_no_secrets(repo, cfg):
    files = tracked(repo)
    named = [f for f in files if re.search(r"(^|/)(\.env(\.[^/]*)?|id_rsa[^/]*|[^/]*\.pem|[^/]*\.p12)$", f) and not re.search(r"\.(example|sample|template)$", f)]
    hits = sorted({line.split(":", 1)[0] for line in git(repo, "grep", "-lIE", "-e", SECRET.pattern).splitlines()})
    bad = named + [h for h in hits if h not in named]
    return not bad, "no secrets found" if not bad else "possible secrets in: " + ", ".join(bad[:10])


def c_agents_md(repo, cfg):
    p = next((Path(repo, n) for n in ("AGENTS.md", "CLAUDE.md") if Path(repo, n).exists()), None)
    if not p:
        return False, "no AGENTS.md"
    n = len(p.read_text().splitlines())
    return n <= 200, f"{p.name} is {n} lines" + ("" if n <= 200 else ", over 200")


def c_lockfile(repo, cfg):
    files = set(tracked(repo))
    if "package.json" in files:
        ok = files & {"pnpm-lock.yaml", "package-lock.json", "yarn.lock", "bun.lock", "bun.lockb"}
    elif "pyproject.toml" in files:
        ok = files & {"uv.lock", "poetry.lock", "pdm.lock", "requirements.txt"}
    else:
        return True, "no package manifest"
    return bool(ok), f"{', '.join(sorted(ok))} committed" if ok else "no lockfile committed"


def c_yaml(repo, cfg):
    bad = []
    for f in tracked(repo):
        p = Path(repo, f)
        try:
            if f.endswith((".yml", ".yaml")) and not f.endswith("lock.yaml"):
                list(yaml.safe_load_all(p.read_text()))
            elif f.endswith("SKILL.md"):
                parts = p.read_text().split("---", 2)
                if len(parts) == 3:
                    yaml.safe_load(parts[1])
        except (yaml.YAMLError, UnicodeDecodeError) as e:
            bad.append(f"{f} ({str(e).splitlines()[0][:80]})")
    return not bad, "all YAML parses" if not bad else "does not parse: " + "; ".join(bad[:5])


RUN = {k: globals()["c_" + k.replace("-", "_")] for k in CHECKS}


def run_checks(repo, names, cfg):
    return {n: RUN[n](repo, cfg) for n in names}


# ---- commands ----

def init(repo):
    cmds = detect_commands(repo)
    res = run_checks(repo, CHECKS, {"commands": cmds, "checks": {}, "dismissed": []})
    lines = ["# Guardrails. on runs a check; off skips it. Re-run the guardrails skill to check again.", "commands:"]
    lines += [f"  {k}: {json.dumps(v)}" for k, v in cmds.items()] or ["  {}"]
    lines += ["checks:"] + [f"  {k}: on  # {'pass' if ok else 'fail'}: {why}" for k, (ok, why) in res.items()]
    lines += ["dismissed: []", f"# AGENTS.md line: {AGENTS_LINE}"]
    print("\n".join(lines))


def check(repo):
    cfg = load_config(repo)
    failed = False
    for layer in LAYERS:
        names = [n for n, (l, _) in CHECKS.items() if l == layer]
        on = [n for n in names if cfg["checks"].get(n, False)]
        print(f"{layer}: {len(on)} on" + ("" if on else ", empty: nothing guards this layer yet"))
        for name in names:
            ok, why = RUN[name](repo, cfg)
            failed |= name in on and not ok
            print(f"  {'PASS' if ok else 'FAIL'}  {'on ' if name in on else 'off'}  {name}: {why}")
    print("Prose can be skipped. A rule agents keep breaking moves up: an ast-grep ban, a type, or a test.")
    sys.exit(1 if failed else 0)


def state_root(name):
    return Path(os.environ.get("XDG_STATE_HOME") or Path.home() / ".local" / "state") / name


def state_file(repo):
    root = state_root("guardrails")
    root.mkdir(parents=True, exist_ok=True)
    real = str(Path(repo).resolve())
    return root / f"{Path(real).name}-{hashlib.sha1(real.encode()).hexdigest()[:8]}.json"


def trail_rows(repo):
    """Friction rows from the trail log. Worktrees share their main repo's log."""
    common = git(repo, "rev-parse", "--path-format=absolute", "--git-common-dir").strip()
    real = str(Path(common).parent.resolve() if common else Path(repo).resolve())
    f = state_root("trail") / f"{Path(real).name}-{hashlib.sha1(real.encode()).hexdigest()[:8]}.tsv"
    if not f.exists():
        return []
    head, *rows = [l.split("\t") for l in f.read_text().splitlines() if l]
    return [dict(zip(head, r)) for r in rows]


def rank(rows):
    """Friction tags, worst first: times seen x minutes lost, so repeats score higher."""
    tags = {}
    for r in rows:
        if r.get("kind") == "friction":
            tags.setdefault(r.get("tag") or "untagged", []).append(r)
    out = []
    for tag, rs in tags.items():
        mins = sum(max(int(m), 1) if (m := r.get("cost_min", "")).isdigit() else 1 for r in rs)
        fixes = sorted({r["fix"] for r in rs if r.get("fix")})
        ev = [r["evidence"] for r in rs if r.get("evidence")][-3:]
        out.append((len(rs) * mins, f"{tag}: score {len(rs) * mins} ({len(rs)}x, {mins} min)" + (f"; fix: {' / '.join(fixes)}" if fixes else "") + (f"; evidence: {', '.join(ev)}" if ev else "")))
    return [line for _, line in sorted(out, key=lambda x: -x[0])]


def diff(repo):
    """Only what changed since the last run. Same state prints nothing."""
    cfg = load_config(repo)
    sf = state_file(repo)
    last = json.loads(sf.read_text()) if sf.exists() else {"results": {}, "suggested": []}
    trail = trail_rows(repo)
    on = [n for n, v in cfg["checks"].items() if v and n in RUN]
    res = run_checks(repo, on, cfg)
    now = {n: ok for n, (ok, _) in res.items()}
    out = []
    for n, (ok, why) in res.items():
        before = last["results"].get(n)
        if before is None and not ok:
            out.append(f"{CHECKS[n][0]}: failing: {n} ({why})")
        elif before is True and not ok:
            out.append(f"{CHECKS[n][0]}: newly failing: {n} ({why})")
        elif before is False and ok:
            out.append(f"{CHECKS[n][0]}: newly passing: {n}")
    out += [f"no longer checked: {n}" for n in last["results"] if n not in now]
    fresh = [n for n in CHECKS if not cfg["checks"].get(n) and n not in cfg["dismissed"] and n not in last["suggested"]]
    out += [f"suggestion: turn on {n} ({CHECKS[n][0]}): {CHECKS[n][1]}" for n in fresh]
    out += [f"friction: {line}" for line in rank(trail[last.get("trail", 0):])]
    sf.write_text(json.dumps({"repo": str(Path(repo).resolve()), "results": now, "suggested": sorted(set(last["suggested"]) | set(fresh)), "trail": len(trail)}, indent=1))
    return out


def main(argv):
    if not argv or argv[0] not in ("init", "check", "diff", "friction"):
        sys.exit(__doc__)
    cmd, rest = argv[0], argv[1:]
    if cmd == "diff":
        repos = [l.strip() for l in Path(rest[1]).read_text().splitlines() if l.strip() and not l.startswith("#")] if rest[:1] == ["--repos"] else rest or ["."]
        for repo in repos:
            changes = diff(os.path.expanduser(repo))
            if changes:
                print(f"{repo}\n" + "\n".join(f"  {c}" for c in changes))
        return
    repo = rest[0] if rest else "."
    if cmd == "friction":
        print("\n".join(rank(trail_rows(repo))) or "no friction logged")
        return
    init(repo) if cmd == "init" else check(repo)


if __name__ == "__main__":
    main(sys.argv[1:])
