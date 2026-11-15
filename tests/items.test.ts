/**
 * The AI items this plugin carries (ai/ in the package, the manifest's `ai` block), each placed by the
 * installer in the workspace folder of its kind.
 *
 * What is checked here is what a person relies on once they are installed: each item has the shape its
 * folder lists, its body is plain Markdown any AI command-line assistant can follow, and it names nothing
 * that does not exist — what it says about the plugin is held to the plugin's own code, scripts and settings.
 */
import test from 'node:test';
import assert from 'node:assert';
import fs from 'fs';
import os from 'os';
import path from 'path';

import * as plugin from '../src/index';

// Compiled, these tests run from dist/tests, so the package root is one folder further up.
const PKG = fs.existsSync(path.join(__dirname, '..', 'package.json')) ? path.join(__dirname, '..') : path.join(__dirname, '..', '..');
const read = (f: string) => fs.readFileSync(path.join(PKG, f), 'utf8');
const pkg = JSON.parse(read('package.json'));
const manifest = pkg.workspacePlugin;
const P: string = manifest.name;
const { AGENTS, SKILLS, AI_COMMANDS, PROMPTS } = plugin as any;
void os;

// The kinds the workspace knows, and the folder each one lands in (core/workspace-app/plugin-install.js).
const KINDS: Record<string, string> = { agents: 'ai-agents', skills: 'ai-skills', commands: 'ai-commands', prompts: 'ai-prompts' };
const kindList = (kind: string): string[] => manifest.ai[kind] || [];

/** Every file of the package under a path: the file itself, or all the files of a folder (a skill is a folder). */
function filesUnder(rel: string): string[] {
  const abs = path.join(PKG, rel);
  if (!fs.statSync(abs).isDirectory()) return [rel];
  return fs.readdirSync(abs).flatMap((e) => filesUnder(`${rel}/${e}`));
}
const ITEM_FILES: string[] = Object.keys(KINDS).flatMap((kind) => kindList(kind).flatMap(filesUnder));
const MAIN_FILES: string[] = [...kindList('agents'), ...kindList('commands'), ...kindList('prompts'), ...kindList('skills').map((s) => `${s}/SKILL.md`)];
const frontmatter = (src: string) => (src.startsWith('---\n') ? src.split('\n---\n')[0] : '');
const bodyOf = (src: string) => (src.startsWith('---\n') ? src.split('\n---\n').slice(1).join('\n---\n') : src);
// The plugins the manifest needs: a list alone, or the `plugins` of the object that also carries the commands.
const neededPlugins: unknown[] = Array.isArray(manifest.needs) ? manifest.needs : ((manifest.needs && manifest.needs.plugins) || []);
// The sources of the plugin: what an item may be held to.
const walk = (dir: string): string[] => (fs.existsSync(path.join(PKG, dir)) ? fs.readdirSync(path.join(PKG, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(`${dir}/${e.name}`) : [`${dir}/${e.name}`])) : []);
const SOURCES: string = ['src', 'scripts', 'commands', 'lib'].flatMap(walk).map(read).join('\n');
void SOURCES;

test('the manifest carries a list per kind it ships, each item under ai/<kind>/, and needs the folder each kind lands in', () => {
  assert.deepStrictEqual(Object.keys(manifest.ai).sort(), CFG.kinds.slice().sort(), 'the kinds this plugin ships');
  for (const kind of CFG.kinds) {
    const list = kindList(kind);
    assert.ok(list.length > 0, `the plugin ships at least one of ${kind}`);
    for (const f of list) {
      assert.strictEqual(path.dirname(f), `ai/${kind}`, `${f} is in ai/${kind}/`);
      assert.ok(fs.existsSync(path.join(PKG, f)), `${f} is in the package`);
      assert.match(path.basename(f), new RegExp(`^${(CFG as any).prefix || P}-[a-z0-9-]+(\\.md)?$`), `${f} carries the plugin's name, so it never takes the name of another plugin's item`);
    }
    assert.ok(neededPlugins.includes(KINDS[kind]), `it ships ${kind}, so it needs ${KINDS[kind]}`);
  }
  assert.ok(pkg.files.includes('ai'), 'ai/ is published with the package');
  const names = (kind: string, ext = '.md') => kindList(kind).map((f: string) => path.basename(f, ext));
  assert.deepStrictEqual(names('agents'), AGENTS);
  assert.deepStrictEqual(names('skills', ''), SKILLS);
  assert.deepStrictEqual(names('commands'), AI_COMMANDS);
  assert.deepStrictEqual(names('prompts'), PROMPTS);
  // Commands and prompts share one destination when they are installed: a name used by both is lost.
  assert.strictEqual(new Set([...AI_COMMANDS, ...PROMPTS]).size, AI_COMMANDS.length + PROMPTS.length, 'no command and prompt share a name');
});

test('an agent is named after its file, says when to use it, and names its model and tools', () => {
  for (const f of kindList('agents')) {
    const head = frontmatter(read(f));
    assert.match(head, new RegExp(`^name: ${path.basename(f, '.md')}$`, 'm'));
    assert.match(head, /^description: Use this agent .{80,}$/m, `${f} says what it does and when to use it`);
    assert.match(head, /^model: fable$/m);
    assert.match(head, /^tools:\n( {2}- \S+\n?)+/m, `${f} lists its tools`);
  }
});

test('a skill is a folder with a SKILL.md named after it, and says when to use it', () => {
  for (const f of kindList('skills')) {
    assert.ok(fs.statSync(path.join(PKG, f)).isDirectory(), `${f} is a folder`);
    const head = frontmatter(read(`${f}/SKILL.md`));
    assert.match(head, new RegExp(`^name: ${path.basename(f)}$`, 'm'));
    assert.match(head, /^description: .{80,}$/m, `${f} says what it does and when to use it`);
    assert.match(head, /Use when/, `${f} names the requests it answers to`);
  }
});

test('a command is a slash command: a description, an argument hint, $ARGUMENTS, and the arguments said in words', () => {
  for (const f of kindList('commands')) {
    const src = read(f);
    const head = frontmatter(src);
    assert.match(head, /^description: .{40,}$/m, `${f} is described in the command list`);
    assert.match(head, /^argument-hint: .+$/m, `${f} says what to type after it`);
    assert.doesNotMatch(head, /^name:/m, `${f} is named by its file`);
    assert.ok(src.includes('$ARGUMENTS'), `${f} reads what was typed after the command`);
    assert.match(bodyOf(src), /The (first word|argument) is /, `${f} says in words what the arguments are, for an assistant that does not fill $ARGUMENTS in`);
  }
});

test('a prompt is a line that says what it is for, then the whole launch command, and says the text works in another AI assistant', () => {
  for (const f of kindList('prompts')) {
    const src = read(f);
    assert.doesNotMatch(src, /^---\n/, `${f} has no frontmatter: it is not installed as a command`);
    assert.match(src.split('\n')[0], /^[A-Z].{20,}\.$/, `${f} opens with one sentence`);
    // The two expressions the dashboard reads a prompt with (core/workspace-app/screens.js).
    const flags = src.match(/^\s*claude\s+([^\n]*?)\s*"""\s*$/m);
    const text = src.match(/claude[^\n]*"""\n([\s\S]*?)\n"""/);
    assert.ok(flags && flags[1].trim() === '--permission-mode bypassPermissions', `${f} carries the default launch command`);
    assert.ok(text && text[1].trim().length > 100, `${f} carries the prompt`);
    assert.match(text![1], /<[a-z|]+>/, `${f} has placeholders to fill in`);
    assert.match(text![1], /^# .*container-based \(DDEV by default\)/m, `${f} says where it runs`);
    assert.match(src, /^The text between the triple quotes is plain: it can be given to another AI command-line assistant as it is\.$/m, `${f} says its text is not tied to one assistant`);
  }
});

test('the body of every item is plain Markdown: it names no tool or feature of one AI command-line assistant', () => {
  for (const f of ITEM_FILES.filter((x) => x.endsWith('.md'))) {
    // What is left once the default launch line of a prompt is taken out: the words an assistant is asked to follow.
    const body = bodyOf(read(f)).replace(/^\s*claude --permission-mode bypassPermissions """\s*$/m, '');
    for (const m of body.matchAll(/\b(Bash|Read|Write|Edit|Grep|Glob|Task|Agent|Skill|TodoWrite|WebFetch) tool\b|\bsubagents?\b|bypassPermissions|\bClaude\b|\bclaude -p\b|\.claude\/|\bMCP\b|mcp__/g)) {
      assert.fail(`${f}: "${m[0]}" belongs to one AI assistant; the body is for any of them`);
    }
  }
});

// ---- What is specific to this plugin ---------------------------------------------------------------
// The sample projects the items are written for, and which verbs they treat how (tests/fixtures/items-runtime.json).
const RT = JSON.parse(read('tests/fixtures/items-runtime.json')) as { export: string; find: string; readonly: string[]; handover: string[]; helper: string[]; variants: { title: string; sample: any }[] };
const runtime = (plugin as any)[RT.export];
const CLI: string = runtime.cli;
const CFG = {
  kinds: ['agents', 'skills', 'commands', 'prompts'],
  pluginCommands: {} as Record<string, string[]>,           // it places no cmd-*.sh: the entries of the menu are the commands
  worksWith: new RegExp(`\\b${CLI} `),
  addresses: /@example\.(com|org)$/,
  checkpoints: [] as string[],
};
type Verb = { key: string; label: string; kind: string; danger: boolean; cmd: string };
const verbsOf = (sample: any): Verb[] => Object.entries(runtime.verbs as Record<string, any>).map(([key, v]) => ({ key, label: v.label, kind: v.kind, danger: !!v.danger, cmd: v.cmd(sample, sample.name) }));
const ALL: Verb[] = RT.variants.flatMap((v) => verbsOf(v.sample));
const SKILL = `ai/skills/${P}-menu/SKILL.md`;

test('the tables of the skill are the verbs of the runtime: every entry of the menu, with the command the plugin runs', () => {
  // A pipe inside a command is written \\| in a table cell, so that the table still reads as one.
  const rows = [...read(SKILL).matchAll(/^\| \*\*([^*]+)\*\* \| `([^`]+)` \|$/gm)].map((m) => [m[1], m[2].replace(/\\\|/g, '|')]);
  assert.deepStrictEqual(rows, ALL.map((v) => [v.label, v.cmd]), 'in the order of the plugin, for each kind of project it recognises');
  const skill = read(SKILL);
  assert.ok(skill.includes(`The ${runtime.label} menu`), 'the menu by its label');
  assert.ok(skill.includes(`**${runtime.init.label}**`), 'the option of the New folder form');
  assert.ok(skill.includes(`"${runtime.menuNote}"`), 'the note the menu ends with');
  assert.ok(skill.includes(runtime.cliHint), 'where the CLI comes from');
  for (const caption of ['`up`', '`down`', '`?`']) assert.ok(skill.includes(`| ${caption} |`), `the caption ${caption}`);
});

test('an item runs only commands of the menu; what destroys data is never a step of a command or a prompt', () => {
  const allowed = new Set(ALL.map((v) => v.cmd));
  const danger = new Set(ALL.filter((v) => v.danger).map((v) => v.cmd));
  const waits = new Set(ALL.filter((v) => RT.handover.includes(v.key)).map((v) => v.cmd));
  const reads = new Set(ALL.filter((v) => RT.readonly.includes(v.key)).map((v) => v.cmd));
  const starts = new RegExp(`^(${[CLI, ...RT.helper].join('|')}) `);
  let ran = 0;
  for (const f of MAIN_FILES) {
    let fenced = false;
    let section = '';
    for (const line of read(f).split('\n')) {
      if (/^\s*```/.test(line)) { fenced = !fenced; continue; }
      if (/^## /.test(line)) section = line;
      const text = line.trim().replace(/^([A-Z][A-Za-z ,()/.]*: )/, '');
      if (!(fenced || f.startsWith('ai/prompts/')) || !starts.test(text)) continue;
      assert.ok(allowed.has(text), `${f}: "${text}" is not a command of the ${runtime.label} menu`);
      ran += 1;
      if (danger.has(text)) assert.ok(f.startsWith('ai/agents/') && /Only when the person asked/.test(section), `${f}: "${text}" destroys data`);
      if (waits.has(text)) assert.ok(f.startsWith('ai/agents/') && /Hand over/.test(section), `${f}: "${text}" waits for a person`);
      if (f.startsWith('ai/commands/')) assert.ok(reads.has(text), `${f}: "${text}" changes the project`);
    }
  }
  assert.ok(ran >= 8, `the items show the commands of the menu (${ran} checked)`);
  for (const f of [...kindList('agents')]) if (danger.size) assert.match(read(f), /never runs the command that destroys data/, `${f} says so in its description`);
});

test('the files a project is recognised by are the ones the runtime detects', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `${P}-items-`));
  // Every file the items look for, made one at a time: the runtime must recognise each.
  const files = RT.find.replace(/^ls (-d )?/, '').replace(/ 2>\/dev\/null$/, '').split(' ');
  for (const [i, file] of files.entries()) {
    const dir = path.join(root, `p${i}`);
    fs.mkdirSync(path.dirname(path.join(dir, file)), { recursive: true });
    if (file.endsWith('/')) fs.mkdirSync(path.join(dir, file), { recursive: true }); else fs.writeFileSync(path.join(dir, file), '');
    assert.ok(runtime.detect(dir), `the runtime recognises a project that carries ${file}`);
    assert.ok(read(SKILL).includes(`\`${file}\``), `the skill names ${file}`);
  }
  fs.mkdirSync(path.join(root, 'plain'));
  assert.strictEqual(runtime.detect(path.join(root, 'plain')), null, 'and nothing else');
  fs.rmSync(root, { recursive: true, force: true });
});

// The workspace's own commands an item may name (github.com/webship/workspace), with the flags it may give them.
const CORE_COMMANDS: Record<string, string[]> = {
  'cmd-tools-testing.sh': ['--run', '--path', '--tags', '--dry-run'],
  'cmd-tools-remove.sh': [],
};
const PLUGINS_SH = ['--list', '--require', '--activate', '--install', '--configure', '--deactivate', '--uninstall', '--check', '--with-needs'];

test('every workspace command an item names exists, with the flags it is given', () => {
  const own: string[] = ((manifest.commands && manifest.commands.files) || []).map((f: string) => path.basename(f));
  assert.deepStrictEqual(own.sort(), Object.keys(CFG.pluginCommands).sort(), 'the cmd-*.sh this plugin places');
  const known: Record<string, string[]> = { ...CORE_COMMANDS, ...CFG.pluginCommands };
  let used = 0;
  // The README of a plugin whose command runs other commands shows them as examples: there, only the items are held to the list.
  for (const f of [...ITEM_FILES, ...((CFG as any).readmeShowsOtherCommands ? [] : ['README.md'])]) {
    for (const line of read(f).split('\n')) {
      for (const m of line.matchAll(/(cmd-[a-z0-9<>-]+\.sh)((?:(?!cmd-)[^`|#;])*)/g)) {
        assert.ok(known[m[1]], `${f}: ${m[1]} is not a command of the plugin or of the workspace`);
        for (const flag of m[2].match(/(?<![\w-])--[a-z][a-z-]*/g) || []) assert.ok(known[m[1]].includes(flag), `${f}: ${m[1]} has no ${flag}`);
        used += 1;
      }
      for (const m of line.matchAll(/plugins\.sh((?:[^`|#;])*)/g)) {
        for (const flag of m[1].match(/(?<![\w-])--[a-z][a-z-]*/g) || []) assert.ok(PLUGINS_SH.includes(flag), `${f}: plugins.sh has no ${flag}`);
        used += 1;
      }
    }
  }
  assert.ok(used > 3, 'the items show the workspace commands');
});

test('every settings key an item names is in the settings template, and the skill describes every key of it', () => {
  if (!manifest.settingsTemplate) {
    for (const f of MAIN_FILES) assert.doesNotMatch(read(f), /core\/config\/plugin\.[a-z-]+\.settings\.yml/, `${f}: this plugin has no settings file`);
    return;
  }
  const template = read(manifest.settingsTemplate);
  const keys = [...new Set([...template.matchAll(/^\s*([a-z][a-z0-9_]*):/gm)].map((m) => m[1]))];
  assert.ok(keys.length > 0);
  const named = new Set<string>();
  for (const f of MAIN_FILES) {
    for (const m of read(f).matchAll(/`([a-z][a-z0-9_]*):`/g)) {
      assert.ok(keys.includes(m[1]), `${f}: ${manifest.settingsFile} has no key ${m[1]}`);
      named.add(m[1]);
    }
  }
  assert.deepStrictEqual([...named].sort(), [...keys].sort(), 'the items describe every key of the template');
  assert.ok(kindList('skills').some((s) => read(`${s}/SKILL.md`).includes(`core/config/${manifest.settingsFile}`)), 'the skill says which file the keys are in');
});

test('the items say container-based, name the plugin they come with, and carry no personal value', () => {
  for (const f of ITEM_FILES) {
    const src = read(f);
    assert.doesNotMatch(src, /DDEV-only/i, `${f}: the workspace is container-based, DDEV by default`);
    assert.doesNotMatch(src, /\/home\/(?!YOUR_USER)[a-z]/, `${f} carries no personal path`);
    for (const m of src.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+\.[a-z]{2,}/g) || []) assert.match(m, CFG.addresses, `${f}: ${m} is not an example address`);
    assert.doesNotMatch(src, /CHANGE_ME|gh[pousr]_[A-Za-z0-9]{8,}|github_pat_|glpat-[A-Za-z0-9_-]{8,}|ATATT[A-Za-z0-9]/, `${f} carries no token and no placeholder of one`);
  }
  for (const f of MAIN_FILES) {
    assert.match(read(f).replace(/\s+/g, ' '), /container-based (workspace )?\(DDEV by default\)|container-based, DDEV by default/, `${f} says what the workspace runs on`);
    assert.match(read(f), CFG.worksWith, `${f} names what the plugin works with`);
    assert.ok(read(f).includes(pkg.name) || f.startsWith('ai/prompts/'), `${f} says which plugin it comes with`);
  }
  for (const f of CFG.checkpoints) {
    assert.match(read(f), /Reviewed by a human/, `${f} carries the Checkpoints rule`);
    assert.match(read(f), /[Nn]ever tick/, `${f}: the two human-review boxes are never ticked by an assistant`);
  }
  const readme = read('README.md');
  for (const name of [...AGENTS, ...SKILLS, ...AI_COMMANDS, ...PROMPTS]) assert.ok(readme.includes(name), `the README lists ${name}`);
});
