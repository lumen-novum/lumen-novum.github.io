View my portfolio at [lumen-novum.github.io](https://lumen-novum.github.io/)!

## Panther theme

The portfolio is inspired by Mac OS X 10.3 Panther: a top menu bar, an Apple navigation menu, brushed-metal title bars, pinstriped content, and Aqua buttons. It uses system fonts and CSS/SVG styling without external font or wallpaper downloads.

The Apple button toggles portfolio navigation. Use Enter or Space to open it, Tab to move through links, and Escape to close it and return focus. Clicking outside, selecting a link, or moving focus outside also closes it. Window traffic lights use local PNG exports of P0T4T0x's OS X Jaguar TrafficLights artwork (CC BY 3.0), not CSS/SVG recreations. Asset credits and export details are in `assets/imgs/jaguar-trafficlights/ATTRIBUTION.md`. They are decorative and do not close or hide the portfolio. Windows remain in document flow so long pages are scrollable, and the introduction stacks on narrow screens.

Profile text, project collections, and contact destinations are preserved. Featured projects still come from `_data/projects.yml`; the archive and detail pages use the `projects` collection.

## Local checks

With a compatible Ruby environment and the locked Bundler version installed:

```sh
bundle install
bundle exec jekyll build
```

Menu and window-artwork regression tests require Node.js 18 or newer and no npm dependencies:

```sh
node --test scripts/test-menu.js scripts/test-window-assets.js
```

The existing screenshot workflow is preserved. To build its chrome-free, full-width layout locally:

```sh
JEKYLL_ENV=screenshot bundle exec jekyll build
```

The handoff document, source PSD, and development scripts are excluded from the published site.