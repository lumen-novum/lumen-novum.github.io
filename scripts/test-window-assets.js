const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");

const root = join(__dirname, "..");
const assets = ["close", "minimize", "maximize"];

for (const name of assets) {
  test(`${name} artwork is a transparent 32px PNG`, () => {
    const image = readFileSync(join(root, "assets/imgs/jaguar-trafficlights", `${name}.png`));
    assert.deepEqual(image.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    assert.equal(image.subarray(12, 16).toString(), "IHDR");
    assert.equal(image.readUInt32BE(16), 32);
    assert.equal(image.readUInt32BE(20), 32);
    assert.equal(image[24], 8);
    assert.equal(image[25], 6);
  });
}

for (const layout of ["default", "barebones"]) {
  test(`${layout} uses the supplied artwork instead of drawn controls`, () => {
    const html = readFileSync(join(root, "_layouts", `${layout}.html`), "utf8");
    const controls = html.match(/<div class="window-controls" aria-hidden="true">([\s\S]*?)<\/div>/)?.[1];
    assert(controls, "Decorative control group is missing");
    assert.equal((controls.match(/<img\s/g) || []).length, 3);
    assert(!controls.includes("<svg"));
    assert(!controls.includes("<button"));
    for (const name of assets) {
      assert(controls.includes(`"/assets/imgs/jaguar-trafficlights/${name}.png" | relative_url`));
    }
    assert.equal((controls.match(/alt=""/g) || []).length, 3);
  });
}

test("artwork ships with artist, source, license, and export attribution", () => {
  const credits = readFileSync(join(root, "assets/imgs/jaguar-trafficlights/ATTRIBUTION.md"), "utf8");
  assert(credits.includes("P0T4T0x"));
  assert(credits.includes("OS-X-Jaguar-TrafficLights-511549320"));
  assert(credits.includes("https://creativecommons.org/licenses/by/3.0/"));
  assert(credits.includes("converted to transparent"));
});

test("source PSD is excluded from the published site", () => {
  const config = readFileSync(join(root, "_config.yml"), "utf8");
  assert(config.includes("  - os_x_jaguar_trafficlights_by_p0t4t0x_d8gk9zc.psd"));
});
