const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");

const source = fs.readFileSync(
  path.join(__dirname, "../assets/js/window-drag.js"), "utf8"
);
const mediaQuery = "(min-width: 721px) and (hover: hover) and (pointer: fine)";

class Target {
  constructor(parent = null) {
    this.parent = parent;
    this.listeners = new Map();
    this.attributes = new Map();
    this.properties = new Map();
    this.classes = new Set();
    this.captures = new Set();
    this.captureCalls = [];
    this.releaseCalls = [];
    this.focusCalls = [];
    this.scrollCalls = [];
    this.classList = {
      add: (name) => this.classes.add(name),
      remove: (name) => this.classes.delete(name),
      toggle: (name, enabled) => enabled ? this.classes.add(name) : this.classes.delete(name),
      contains: (name) => this.classes.has(name),
    };
    this.style = { setProperty: (name, value) => this.properties.set(name, value) };
  }
  addEventListener(type, listener) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(listener);
  }
  dispatch(type, values = {}) {
    const event = {
      target: this, button: 0, isPrimary: true, pointerType: "mouse", pointerId: 1,
      clientX: 200, clientY: 110, defaultPrevented: false,
      preventDefault() { this.defaultPrevented = true; },
      ...values,
    };
    for (let target = this; target; target = target.parent) {
      for (const listener of target.listeners.get(type) || []) listener(event);
    }
    return event;
  }
  contains(target) {
    for (; target; target = target.parent) if (target === this) return true;
    return false;
  }
  closest(selector) {
    assert.equal(selector,
      'a, button, input, select, textarea, option, [contenteditable]:not([contenteditable="false"])');
    for (let target = this; target; target = target.parent) {
      if (target.interactive) return target;
    }
    return null;
  }
  focus(options) {
    this.focusCalls.push({ ...options });
    let root = this;
    while (root.parent) root = root.parent;
    root.activeElement = this;
  }
  scrollIntoView(options) { this.scrollCalls.push({ ...options }); }
  setAttribute(name, value) { this.attributes.set(name, value); }
  removeAttribute(name) { this.attributes.delete(name); }
  hasPointerCapture(id) { return this.captures.has(id); }
  setPointerCapture(id) {
    if (this.captureFails) throw new Error("Capture unavailable");
    this.captures.add(id);
    this.captureCalls.push(id);
  }
  releasePointerCapture(id) {
    this.captures.delete(id);
    this.releaseCalls.push(id);
    this.dispatch("lostpointercapture", { pointerId: id });
  }
}

function setup(options = {}) {
  const document = new Target();
  const window = new Target();
  window.innerWidth = options.width ?? 1200;
  window.innerHeight = options.viewportHeight ?? 800;
  const media = new Target();
  media.matches = window.innerWidth >= 721 && options.hover !== false && options.fine !== false;
  window.matchMedia = (query) => {
    assert.equal(query, mediaQuery);
    return media;
  };
  const main = new Target(document);
  const titlebar = new Target(main);
  const title = new Target(titlebar);
  const controls = new Target(titlebar);
  const content = new Target(main);
  const taskbar = new Target(document);
  const geometry = {
    left: options.left ?? 100, top: options.top ?? 100,
    width: options.windowWidth ?? 600, height: options.height ?? 400,
    titleHeight: options.titleHeight ?? 30, scrollY: 0,
  };
  const offsets = () => [
    parseFloat(main.properties.get("--window-drag-x") || "0"),
    parseFloat(main.properties.get("--window-drag-y") || "0"),
  ];
  main.getBoundingClientRect = () => {
    const [x, y] = media.matches ? offsets() : [0, 0];
    const left = geometry.left + x;
    const top = geometry.top - geometry.scrollY + y;
    return { left, top, right: left + geometry.width, bottom: top + geometry.height,
      width: geometry.width, height: geometry.height };
  };
  titlebar.getBoundingClientRect = () => {
    const rect = main.getBoundingClientRect();
    return { ...rect, height: geometry.titleHeight, bottom: rect.top + geometry.titleHeight };
  };
  controls.getBoundingClientRect = () => {
    const rect = titlebar.getBoundingClientRect();
    return { left: rect.right - 100, right: rect.right, top: rect.top, bottom: rect.bottom };
  };
  taskbar.getBoundingClientRect = () => ({ bottom: options.taskbarBottom ?? 30 });
  main.querySelector = (selector) => {
    assert.equal(selector, ".window-titlebar");
    return options.missingTitlebar ? null : titlebar;
  };
  titlebar.querySelector = (selector) => {
    assert.equal(selector, ".window-controls");
    return options.missingControls ? null : controls;
  };
  document.querySelector = (selector) => {
    if (selector === ".desktop .window.centered:not(.max)") {
      return options.missingWindow || options.screenshot || options.max || options.noDesktop
        ? null : main;
    }
    assert.equal(selector, ".taskbar");
    return options.missingTaskbar ? null : taskbar;
  };
  vm.runInNewContext(source, { document, window }, { filename: "window-drag.js" });
  const down = (values) => titlebar.dispatch("pointerdown", values);
  const move = (clientX, clientY, values) => titlebar.dispatch("pointermove", { clientX, clientY, ...values });
  const key = (name, target = titlebar) => target.dispatch("keydown", { key: name });
  const resize = (width, height = window.innerHeight) => {
    window.innerWidth = width;
    window.innerHeight = height;
    window.dispatch("resize");
    const matches = width >= 721 && options.hover !== false && options.fine !== false;
    if (media.matches !== matches) {
      media.matches = matches;
      media.dispatch("change");
    }
  };
  return { document, window, media, main, titlebar, title, controls, content, geometry,
    offsets, down, move, key, resize };
}

function assertIdle(app) {
  assert.equal(app.main.classList.contains("is-dragging"), false);
  assert.equal(app.titlebar.captures.size, 0);
}

for (const options of [
  { width: 720 }, { width: 500 }, { hover: false }, { fine: false },
]) {
  test(`ineligible media is inert: ${JSON.stringify(options)}`, () => {
    const app = setup(options);
    assert.equal(app.main.classList.contains("is-draggable"), false);
    assert.equal(app.titlebar.attributes.size, 0);
    assert.equal(app.down().defaultPrevented, false);
    app.move(300, 200);
    assert.equal(app.key("ArrowRight").defaultPrevented, false);
    assert.deepEqual(app.offsets(), [0, 0]);
    assertIdle(app);
  });
}

test("721px desktop media enables dragging without widget attributes", () => {
  const app = setup({ width: 721 });
  assert.equal(app.main.classList.contains("is-draggable"), true);
  assert.equal(app.titlebar.attributes.size, 0);
  assert.equal(app.main.properties.has("touch-action"), false);
  assert.equal(app.titlebar.properties.has("touch-action"), false);
});

for (const values of [
  { pointerType: "touch" }, { pointerType: "pen" }, { button: 2 },
  { button: 1 }, { isPrimary: false },
]) {
  test(`rejects pointer: ${JSON.stringify(values)}`, () => {
    const app = setup();
    assert.equal(app.down(values).defaultPrevented, false);
    app.move(300, 200, values);
    assert.deepEqual(app.offsets(), [0, 0]);
    assertIdle(app);
  });
}

test("body content never starts dragging", () => {
  const app = setup();
  assert.equal(app.content.dispatch("pointerdown").defaultPrevented, false);
  app.move(400, 300);
  assert.deepEqual(app.offsets(), [0, 0]);
  assertIdle(app);
});

test("interactive titlebar descendants and nested children are excluded", () => {
  for (const kind of ["link", "button", "input", "select", "textarea", "contenteditable"]) {
    const app = setup();
    const interactive = new Target(app.titlebar);
    interactive.interactive = kind;
    const child = new Target(interactive);
    assert.equal(child.dispatch("pointerdown").defaultPrevented, false);
    assert.equal(child.dispatch("dblclick").defaultPrevented, false);
    assertIdle(app);
  }
});

test("traffic lights excluded by both descendant and screen rectangle", () => {
  const app = setup();
  const child = new Target(app.controls);
  assert.equal(child.dispatch("pointerdown").defaultPrevented, false);
  assert.equal(app.down({ clientX: 650, clientY: 115 }).defaultPrevented, false);
  app.down();
  app.move(220, 110);
  app.titlebar.dispatch("pointerup");
  assert.equal(app.titlebar.dispatch("dblclick", { clientX: 670, clientY: 115 }).defaultPrevented, false);
  assert.deepEqual(app.offsets(), [20, 0]);
  assertIdle(app);
});

test("preserves grab offset, repeated drags do not jump", () => {
  const app = setup();
  assert.equal(app.down().defaultPrevented, true);
  assert.equal(app.main.classList.contains("is-dragging"), true);
  assert.deepEqual(app.titlebar.captureCalls, [1]);
  app.move(200, 110);
  assert.deepEqual(app.offsets(), [0, 0]);
  app.move(250, 140);
  assert.deepEqual(app.offsets(), [50, 30]);
  app.titlebar.dispatch("pointerup");
  assertIdle(app);
  app.down({ clientX: 270, clientY: 145, pointerId: 2 });
  app.move(270, 145, { pointerId: 2 });
  assert.deepEqual(app.offsets(), [50, 30]);
  app.move(300, 155, { pointerId: 2 });
  assert.deepEqual(app.offsets(), [80, 40]);
});

test("horizontal and short-window vertical bounds use 8px margins", () => {
  const app = setup();
  app.down();
  app.move(-10000, -10000);
  let rect = app.main.getBoundingClientRect();
  assert.equal(rect.left, 8);
  assert.equal(rect.top, 38);
  app.move(10000, 10000);
  rect = app.main.getBoundingClientRect();
  assert.equal(rect.right, 1192);
  assert.equal(rect.bottom, 792);
});

test("vertical bound uses actual taskbar bottom", () => {
  const app = setup({ taskbarBottom: 50 });
  app.down();
  app.move(200, -1000);
  assert.equal(app.main.getBoundingClientRect().top, 58);
});

test("tall windows retain complete titlebar without resizing content", () => {
  const app = setup({ height: 1600, titleHeight: 44 });
  app.down();
  app.move(200, 10000);
  assert.equal(app.titlebar.getBoundingClientRect().bottom, 792);
  assert.equal(app.main.getBoundingClientRect().height, 1600);
  assert.ok(app.main.getBoundingClientRect().bottom > 800);
  app.move(200, -10000);
  assert.equal(app.main.getBoundingClientRect().top, 38);
});

test("bounds recompute base placement after document scrolling", () => {
  const app = setup({ height: 1600 });
  app.down();
  app.move(240, 150);
  assert.deepEqual(app.offsets(), [40, 40]);
  app.geometry.scrollY = 200;
  app.move(240, 150);
  assert.equal(app.main.getBoundingClientRect().top, 38);
  assert.deepEqual(app.offsets(), [40, 138]);
  app.titlebar.dispatch("pointerup");
  app.down({ clientX: 240, clientY: 45, pointerId: 2 });
  app.move(240, 45, { pointerId: 2 });
  assert.deepEqual(app.offsets(), [40, 138]);
});

for (const type of ["pointerup", "pointercancel", "lostpointercapture", "blur"]) {
  test(`${type} finishes dragging and releases capture`, () => {
    const app = setup();
    app.down();
    app.move(250, 140);
    if (type === "blur") app.window.dispatch(type);
    else app.titlebar.dispatch(type);
    assertIdle(app);
    assert.deepEqual(app.titlebar.releaseCalls, [1]);
    app.move(500, 500);
    assert.deepEqual(app.offsets(), [50, 30]);
  });
}

test("unrelated pointers cannot move, replace, or finish active drag", () => {
  const app = setup();
  app.down();
  assert.equal(app.down({ pointerId: 2 }).defaultPrevented, false);
  app.move(400, 300, { pointerId: 2 });
  app.move(400, 300, { pointerType: "touch" });
  app.titlebar.dispatch("pointercancel", { pointerId: 2 });
  assert.deepEqual(app.offsets(), [0, 0]);
  assert.equal(app.main.classList.contains("is-dragging"), true);
  app.move(250, 140);
  assert.deepEqual(app.offsets(), [50, 30]);
});

test("failed pointer capture leaves no active state", () => {
  const app = setup();
  app.titlebar.captureFails = true;
  assert.equal(app.down().defaultPrevented, false);
  assertIdle(app);
});

test("resize resets offsets and cancels drag even when media stays eligible", () => {
  const app = setup();
  app.down();
  app.move(250, 140);
  app.resize(1100, 700);
  assert.deepEqual(app.offsets(), [0, 0]);
  assertIdle(app);
  assert.equal(app.main.classList.contains("is-draggable"), true);
  app.resize(720);
  assert.equal(app.main.classList.contains("is-draggable"), false);
  assert.equal(app.titlebar.attributes.size, 0);
  app.resize(721);
  assert.equal(app.main.classList.contains("is-draggable"), true);
});

test("media changes cancel dragging and clear offsets without widget attributes", () => {
  const app = setup();
  app.down();
  app.move(250, 140);
  app.media.matches = false;
  app.media.dispatch("change");
  assert.deepEqual(app.offsets(), [0, 0]);
  assertIdle(app);
  assert.equal(app.main.classList.contains("is-draggable"), false);
  assert.equal(app.titlebar.attributes.size, 0);
  assert.equal(app.down().defaultPrevented, false);
  app.media.matches = true;
  app.media.dispatch("change");
  assert.equal(app.main.classList.contains("is-draggable"), true);
  assert.equal(app.titlebar.attributes.size, 0);
});


test("double-click titlebar recenters and cancels active drag", () => {
  const app = setup();
  app.down();
  app.move(250, 140);
  assert.equal(app.title.dispatch("dblclick", { clientX: 250, clientY: 140 }).defaultPrevented, true);
  assert.deepEqual(app.offsets(), [0, 0]);
  assertIdle(app);
});


for (const option of ["missingWindow", "missingTitlebar", "screenshot", "max", "noDesktop"]) {
  test(`${option} is a complete no-op`, () => {
    const app = setup({ [option]: true });
    assert.equal(app.main.properties.size, 0);
    assert.equal(app.main.classes.size, 0);
    for (const target of [app.titlebar, app.document, app.window, app.media]) {
      assert.equal(target.listeners.size, 0);
      assert.equal(target.attributes.size, 0);
    }
  });
}

test("mouse dragging and recentering never focus titlebar or add widget attributes", () => {
  const app = setup();
  app.document.activeElement = app.content;
  app.geometry.scrollY = 40;
  app.down();
  app.move(250, 140);
  assert.equal(app.titlebar.focusCalls.length, 0);
  assert.equal(app.document.activeElement, app.content);
  assert.equal(app.titlebar.attributes.size, 0);
  assert.equal(app.geometry.scrollY, 40);
  assert.equal(app.titlebar.scrollCalls.length, 0);
  const rect = app.titlebar.getBoundingClientRect();
  app.titlebar.dispatch("dblclick", { clientX: rect.left + 50, clientY: rect.top + 10 });
  app.resize(720);
  app.resize(721);
  assert.equal(app.titlebar.focusCalls.length, 0);
  assert.equal(app.document.activeElement, app.content);
  assert.equal(app.titlebar.attributes.size, 0);
  assertIdle(app);
});

test("rejected pointers and failed capture never focus titlebar", () => {
  for (const values of [
    { pointerType: "touch" }, { pointerType: "pen" }, { button: 2 },
    { isPrimary: false }, { clientX: 650, clientY: 115 },
  ]) {
    const app = setup();
    app.down(values);
    assert.equal(app.titlebar.focusCalls.length, 0);
  }
  const app = setup();
  app.titlebar.captureFails = true;
  app.down();
  assert.equal(app.titlebar.focusCalls.length, 0);
});

test("Arrow, Home and Escape keys never move, reset or cancel dragging, including modifiers", () => {
  for (const active of [false, true]) {
    const app = setup();
    app.down();
    app.move(250, 140);
    if (!active) app.titlebar.dispatch("pointerup");
    for (const target of [app.titlebar, app.content, app.document]) {
      for (const modifier of [null, "altKey", "ctrlKey", "metaKey", "shiftKey"]) {
        for (const key of ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "Escape"]) {
          const event = target.dispatch("keydown", { key, ...(modifier ? { [modifier]: true } : {}) });
          assert.equal(event.defaultPrevented, false);
          assert.deepEqual(app.offsets(), [50, 30]);
          assert.equal(app.main.classList.contains("is-dragging"), active);
          assert.equal(app.titlebar.hasPointerCapture(1), active);
          assert.equal(app.titlebar.scrollCalls.length, 0);
        }
      }
    }
    if (active) {
      app.move(270, 160);
      assert.deepEqual(app.offsets(), [70, 50]);
    }
  }
});

test("drag module registers no keydown listeners", () => {
  const app = setup();
  for (const target of [app.titlebar, app.title, app.controls, app.content,
    app.main, app.document, app.window, app.media]) {
    assert.equal(target.listeners.has("keydown"), false);
  }
});

for (const position of ["above", "below"]) {
    test(`double-click reveals reset titlebar ${position} visible viewport`, () => {
      const app = setup({ taskbarBottom: 50, top: position === "above" ? 100 : 900 });
      app.geometry.scrollY = position === "above" ? 0 : 800;
      app.down();
      app.move(250, 140);
      app.geometry.scrollY = position === "above" ? 200 : 100;
      // Verify visibility is checked after offsets reset, not at dragged placement.
      const scrollIntoView = app.titlebar.scrollIntoView.bind(app.titlebar);
      app.titlebar.scrollIntoView = (options) => {
        assert.deepEqual(app.offsets(), [0, 0]);
        scrollIntoView(options);
      };
      const rect = app.titlebar.getBoundingClientRect();
      app.titlebar.dispatch("dblclick", { clientX: rect.left + 50, clientY: rect.top + 10 });
      assert.deepEqual(app.titlebar.scrollCalls, [{ block: "nearest", inline: "nearest" }]);
      assertIdle(app);
    });
}

test("double-click leaves visible reset titlebar unscrolled, including exact bounds", () => {
  for (const top of [58, 200, 762]) {
    const app = setup({ top, taskbarBottom: 50, height: 1000 });
    app.down({ clientX: 200, clientY: top + 10 });
    app.move(220, top - 10);
    assert.notDeepEqual(app.offsets(), [0, 0]);
    const rect = app.titlebar.getBoundingClientRect();
    app.titlebar.dispatch("dblclick", { clientX: rect.left + 50, clientY: rect.top + 10 });
    assert.deepEqual(app.offsets(), [0, 0]);
    assert.equal(app.titlebar.scrollCalls.length, 0);
    assertIdle(app);
  }
});

test("resize and media resets never scroll an offscreen titlebar", () => {
  for (const reset of ["resize", "media"]) {
    const app = setup();
    app.down();
    app.move(250, 140);
    app.geometry.scrollY = 200;
    if (reset === "resize") app.resize(1100);
    else {
      app.media.matches = false;
      app.media.dispatch("change");
      app.media.matches = true;
      app.media.dispatch("change");
    }
    assert.deepEqual(app.offsets(), [0, 0]);
    assertIdle(app);
    assert.equal(app.titlebar.scrollCalls.length, 0);
  }
});

test("missing decorative controls or taskbar does not break dragging", () => {
  const app = setup({ missingControls: true, missingTaskbar: true });
  app.down();
  app.move(250, -1000);
  assert.equal(app.main.getBoundingClientRect().top, 38);
});
