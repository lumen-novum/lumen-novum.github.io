View my portfolio at [lumen-novum.github.io](https://lumen-novum.github.io/)!

## Panther theme

The portfolio is inspired by Mac OS X 10.3 Panther: a top menu bar, a portfolio navigation menu, brushed-metal title bars, pinstriped content, and Aqua buttons. It uses system fonts and CSS/SVG styling without external font or wallpaper downloads.

The purple portfolio symbol (`assets/imgs/favicon.png`) replaces the Apple logo and toggles portfolio navigation. Use Enter or Space to open it, Tab to move through links, and Escape to close it and return focus. Clicking outside, selecting a link, or moving focus outside also closes it. Window traffic lights use local PNG exports of P0T4T0x's OS X Jaguar TrafficLights artwork (CC BY 3.0), not CSS/SVG recreations. Asset credits and export details are in `assets/imgs/jaguar-trafficlights/ATTRIBUTION.md`. They are decorative and do not close or hide the portfolio. Windows remain in document flow so long pages are scrollable, and the introduction stacks on narrow screens.

On screens wider than 720px with a fine pointer and hover support, drag the window by its title bar using a mouse or trackpad. The title bar stays silver while dragging, without a blue focus highlight. Window bounds keep the title bar reachable; tall content remains scrollable. Double-click the title bar to recenter; resizing also resets the position. Window dragging has no keyboard controls. Touch, pen, mobile layouts, and screenshot mode do not enable dragging.

The content highlights Computer Engineering, three engineering/software case studies, asteroid research, education, skills, experience, and credentials. Featured projects come from `_data/projects.yml`; the archive and detail pages use the `projects` collection. Both lists sort newest first. Only collection entries marked `portfolio: true` appear in the archive; legacy demo URLs remain available but are not promoted. Keep dates, status labels, and detail URLs aligned between featured data and collection entries. The asteroid manuscript is submitted, not published; PRNT is in progress. Public contact information is limited to city and social profiles.

## Ruby and local development

The project uses Ruby 4.0.7 (recorded in `.ruby-version`), Bundler 4.0.22, Jekyll 4.4.1, and `jekyll-seo-tag` 2.9.1. `Gemfile.lock` records the resolved dependencies. The old `github-pages` gem bundle is intentionally no longer used: its dependencies are not compatible with Ruby 4.

On an Apple Silicon Mac using Homebrew:

```sh
brew install ruby
export PATH="/opt/homebrew/opt/ruby/bin:/opt/homebrew/lib/ruby/gems/4.0.0/bin:$PATH"
ruby --version
gem install bundler -v 4.0.22 --no-document
bundle install
bundle exec jekyll serve --host 127.0.0.1 --port 4000
```

Open `http://localhost:4000/`; stop the server with Ctrl+C. Add the PATH line to your shell's startup file if needed, replacing any earlier Ruby 3.3 PATH override. A Ruby version manager can use `.ruby-version` instead. Do not use `sudo` to install project gems.

## Local checks

```sh
bundle exec jekyll build --trace
ruby scripts/test-site.rb
```

Content/privacy, menu, window-artwork, and desktop-drag regression tests require Node.js 18 or newer and no npm dependencies:

```sh
node --test scripts/test-content.js scripts/test-menu.js scripts/test-window-assets.js scripts/test-window-drag.js
```

The screenshot workflow uses the same Ruby version and locked gems as production. To build and validate its chrome-free, full-width layout locally:

```sh
JEKYLL_ENV=screenshot bundle exec jekyll build --trace
ruby scripts/test-site.rb --screenshot
```

Both builds use `_site`; rebuild in production mode before serving if you want desktop chrome.

## GitHub Pages deployment

In the repository's **Settings → Pages → Build and deployment**, set **Source** to **GitHub Actions**. GitHub's branch-based Jekyll builder does not use this project's Ruby 4/Jekyll 4 stack.

`.github/workflows/pages.yml` installs the versions from `.ruby-version` and `Gemfile.lock`, runs regression tests, builds the production site, validates generated pages and privacy exclusions, and deploys the generated artifact on pushes to `master`. Pull requests build and validate without deploying. `.github/workflows/screenshot.yml` separately builds screenshot mode and retains the screenshot release/artifact flow. No repository settings are changed automatically.

The handoff document, source PSD, private résumé source (`resume.tex`), and development scripts are excluded from the published site. Do not publish the résumé or add email/phone/address information without permission. Jekyll exclusions do not protect files committed to a public repository, so keep private source files out of public commits as well.