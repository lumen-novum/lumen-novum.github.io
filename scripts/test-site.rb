# Validate actual Jekyll output without additional test dependencies.
require "cgi"
require "pathname"
require "uri"

root = Pathname.new(__dir__).parent
site = root.join("_site")
screenshot = ARGV.include?("--screenshot")
slugs = %w[prnt stepper-controller potion-police]

def check(condition, message)
  raise message unless condition
end

%w[resume.tex MACOS_PANTHER_HANDOFF.md Gemfile Gemfile.lock scripts .ruby-version].each do |path|
  check(!site.join(path).exist?, "Private/development file was published: #{path}")
end

pages = [site.join("index.html"), site.join("projects/index.html")]
pages.concat(slugs.map { |slug| site.join("projects", slug, "index.html") })
pages.each do |page|
  check(page.file?, "Missing rendered page: #{page}")
  html = page.read
  check(!html.include?("{{") && !html.include?("{%"), "Unrendered Liquid: #{page}")
  check(!html.match?(/mailto:|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}|\b\(?\d{3}\)?[\s.-]\d{3}[\s.-]\d{4}\b|\b\d{5}(?:-\d{4})?\b|resume\.(?:tex|pdf)/i), "Private contact or résumé link: #{page}")
  check(html.scan(/<main\b/).length == 1, "Expected one main window: #{page}")
  check(html.include?('id="startMenu"') != screenshot, "Incorrect desktop chrome: #{page}")
  check(html.include?('class="window max"') == screenshot, "Incorrect screenshot window: #{page}")
  check(html.include?('name="generator"'), "Missing Jekyll SEO output: #{page}")
  html.scan(/(?:href|src)="([^"]+)"/).flatten.each do |value|
    url = CGI.unescapeHTML(value).split(/[?#]/, 2).first
    next if url.nil? || url.empty? || url.start_with?("//") || url.match?(/\A[a-z][a-z0-9+.-]*:/i)

    target = url.start_with?("/") ? site.join(url.delete_prefix("/")) : page.parent.join(url)
    target = target.join("index.html") if target.directory?
    check(target.file?, "Broken local link #{value} in #{page}")
  end
end

[pages[0], pages[1]].each do |page|
  html = page.read
  positions = slugs.map { |slug| html.index("/projects/#{slug}/") }
  check(positions.all? && positions == positions.sort, "Projects are not newest first: #{page}")
  %w[archive-viewer pixel-portfolio retro-music-player].each do |slug|
    check(!html.include?("/projects/#{slug}/"), "Demo project promoted: #{page}")
  end
end

home = pages[0].read
check(home.include?("Manuscript submitted:") && home.include?("Not yet published"), "Incorrect publication status")
slugs.each_with_index do |slug, index|
  html = pages[index + 2].read
  %w[Problem Approach].each { |heading| check(html.include?(">#{heading}</h2>"), "Markdown heading not rendered in #{slug}") }
  check(html.include?("My role</h2>"), "Missing role section in #{slug}")
end

puts "Passed #{pages.length} generated-page checks: links/assets, Markdown/SEO, project order, privacy, and #{screenshot ? 'screenshot' : 'production'} chrome."
