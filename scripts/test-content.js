const assert = require("node:assert/strict");
const { readFileSync, readdirSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");
const read = (path) => readFileSync(join(root, path), "utf8");
const home = read("index.html");
const data = read("_data/projects.yml");
const archive = read("projects.html");
const cases = ["prnt", "stepper-controller", "potion-police"];

// These checks deliberately need no third-party YAML or Liquid dependency.
function field(source, name) {
  const match = source.match(new RegExp(`^\\s*${name}:\\s*(.+)$`, "m"));
  assert.ok(match, `Missing ${name}`);
  return match[1].trim().replace(/^"|"$/g, "");
}

test("featured data and approved case studies agree on links, dates, and status", () => {
  const entries = data.split(/(?=^- title:)/m).filter((entry) => entry.trim());
  assert.equal(entries.length, 3);
  for (const [index, slug] of cases.entries()) {
    const entry = entries[index];
    const detail = read(`_projects/${slug}.md`);
    const frontmatter = detail.split("---")[1];
    assert.equal(field(entry, "url"), `/projects/${slug}/`);
    for (const name of ["date", "date_label", "status"]) {
      assert.equal(field(entry, name), field(frontmatter, name));
    }
    assert.equal(field(frontmatter, "portfolio"), "true");
    for (const heading of ["Problem", "My role", "Approach"]) {
      assert.ok(detail.includes(`## ${heading}`));
    }
  }
  const dates = entries.map((entry) => field(entry, "date"));
  assert.deepEqual(dates, [...dates].sort().reverse());
});

test("home and archive sort newest first and keep their distinct Jekyll sources", () => {
  assert.match(home, /site\.data\.projects \| sort: "date" \| reverse/);
  assert.match(home, /project\.url \| relative_url/);
  assert.match(archive, /site\.projects \| where: "portfolio", true \| sort: "date" \| reverse/);
  const promoted = readdirSync(join(root, "_projects"))
    .filter((name) => /^portfolio: true$/m.test(read(`_projects/${name}`)))
    .map((name) => name.replace(/\.md$/, "")).sort();
  assert.deepEqual(promoted, [...cases].sort());
});

test("public content excludes private contact details and résumé links", () => {
  const paths = ["index.html", "projects.html", "_data/projects.yml",
    ...readdirSync(join(root, "_layouts")).map((name) => `_layouts/${name}`),
    ...readdirSync(join(root, "_projects")).map((name) => `_projects/${name}`)];
  for (const path of paths) {
    assert.doesNotMatch(read(path), /mailto:|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\b\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\b\d{5}(?:-\d{4})?\b|resume\.(?:tex|pdf)/i, path);
  }
  assert.match(read("_config.yml"), /^\s+- resume\.tex$/m);
  assert.match(read(".gitignore"), /^\/resume\.tex$/m);
  assert.match(home, /College Station, Texas/);
});

test("content reflects current major, submitted paper, and honest project scope", () => {
  assert.match(home, /Computer Engineering/);
  assert.doesNotMatch(home, /general engineering/i);
  for (const id of ["projects", "research", "background", "experience", "credentials", "contact"]) {
    assert.ok(home.includes(`id="${id}"`));
  }
  assert.match(home, /Manuscript submitted:/);
  assert.match(home, /Not yet published/);
  assert.match(read("_projects/prnt.md"), /status: "In progress"/);
  const potion = read("_projects/potion-police.md");
  assert.doesNotMatch(home + data + potion, /23%|predictive capabilities/);
  assert.match(potion, /Forecasting.*\*\*future work\*\*/);
  assert.ok(potion.includes("https://devpost.com/software/the-potion-police"));
  assert.ok(potion.includes("https://github.com/calla-goeun-lee/ThePotionPolice"));
});

test("homepage and menu fragment links refer to existing homepage sections", () => {
  const markup = home + read("_layouts/default.html");
  for (const match of markup.matchAll(/href="[^"\n]*#([a-z-]+)"/g)) {
    assert.ok(home.includes(`id="${match[1]}"`), `Missing section ${match[1]}`);
  }
});
