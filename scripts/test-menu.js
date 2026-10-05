const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");
const test = require("node:test");
const { runInNewContext } = require("node:vm");

const source = readFileSync(join(__dirname, "../assets/js/main.js"), "utf8");

class Element {
  constructor(tagName, parentNode = null, attributes = {}) {
    this.tagName = tagName;
    this.parentNode = parentNode;
    this.attributes = { ...attributes };
    this.listeners = {};
    this.hidden = false;
    this.textContent = "";
  }

  addEventListener(type, listener) {
    (this.listeners[type] ??= []).push(listener);
  }

  setAttribute(name, value) {
    this.attributes[name] = value;
  }

  getAttribute(name) {
    return this.attributes[name] ?? null;
  }

  contains(target) {
    for (let node = target; node; node = node.parentNode) {
      if (node === this) return true;
    }
    return false;
  }

  closest(selector) {
    assert.equal(selector, "a[href]");
    for (let node = this; node instanceof Element; node = node.parentNode) {
      if (node.tagName === "A" && node.getAttribute("href") !== null) {
        return node;
      }
    }
    return null;
  }

  focus() {
    let document = this;
    while (document.parentNode) document = document.parentNode;
    document.activeElement = this;
    document.focusCalls.push(this);
    dispatch(this, "focusin");
  }
}

function dispatch(target, type, properties = {}) {
  const event = {
    target,
    type,
    defaultPrevented: false,
    propagationStopped: false,
    preventDefault() {
      this.defaultPrevented = true;
    },
    stopPropagation() {
      this.propagationStopped = true;
    },
    ...properties,
  };
  for (let node = target; node; node = node.parentNode) {
    for (const listener of node.listeners[type] ?? []) listener(event);
    if (event.propagationStopped) break;
  }
  return event;
}

function fixture({ button = true, menu = true, clock = true } = {}) {
  const document = new Element("DOCUMENT");
  document.focusCalls = [];
  const startButton = new Element("BUTTON", document, {
    "aria-expanded": "false",
    "aria-controls": "startMenu",
    "aria-label": "Apple menu",
  });
  const icon = new Element("SVG", startButton);
  const iconChild = new Element("PATH", icon);
  const startMenu = new Element("NAV", document);
  startMenu.hidden = true;
  const link = new Element("A", startMenu, { href: "/projects/" });
  const linkChild = new Element("SPAN", link);
  const outside = new Element("BUTTON", document);
  const outsideLink = new Element("A", document, { href: "/" });
  const taskbarClock = new Element("TIME", document);
  document.activeElement = outside;
  const elements = {
    startButton: button ? startButton : null,
    startMenu: menu ? startMenu : null,
    taskbarClock: clock ? taskbarClock : null,
  };
  document.getElementById = (id) => elements[id] ?? null;
  const intervals = [];
  const time = { hours: 13, minutes: 5 };
  class FixedDate extends Date {
    constructor() {
      super(2026, 9, 5, time.hours, time.minutes);
    }
  }
  runInNewContext(source, {
    document,
    Date: FixedDate,
    setInterval(callback, delay) {
      intervals.push({ callback, delay });
    },
  });
  return {
    document, startButton, icon, iconChild, startMenu, link, linkChild,
    outside, outsideLink, taskbarClock, intervals, time,
  };
}

function assertOpen({ startButton, startMenu }, open) {
  assert.equal(startMenu.hidden, !open);
  assert.equal(startButton.getAttribute("aria-expanded"), String(open));
}

test("button clicks toggle the disclosure without changing native semantics", () => {
  const page = fixture();
  assertOpen(page, false);
  dispatch(page.startButton, "click");
  assertOpen(page, true);
  dispatch(page.startButton, "click");
  assertOpen(page, false);
  assert.equal(page.startButton.getAttribute("aria-controls"), "startMenu");
  assert.equal(page.startButton.getAttribute("aria-label"), "Apple menu");
  assert.equal(page.startButton.getAttribute("role"), null);
  assert.equal(page.startMenu.getAttribute("role"), null);
  assert.equal(page.link.getAttribute("role"), null);
});

test("bubbling icon clicks toggle without being mistaken for outside clicks", () => {
  const page = fixture();
  dispatch(page.iconChild, "click");
  assertOpen(page, true);
  dispatch(page.iconChild, "click");
  assertOpen(page, false);
  dispatch(page.icon, "click");
  assertOpen(page, true);
});

test("outside clicks close without returning focus or preventing navigation", () => {
  const page = fixture();
  dispatch(page.startButton, "click");
  const event = dispatch(page.outsideLink, "click");
  assertOpen(page, false);
  assert.equal(event.defaultPrevented, false);
  assert.deepEqual(page.document.focusCalls, []);
});

test("non-link clicks inside the disclosure leave it open", () => {
  const page = fixture();
  dispatch(page.startButton, "click");
  dispatch(page.startMenu, "click");
  assertOpen(page, true);
});

test("Escape closes an open disclosure and returns focus to its button", () => {
  const page = fixture();
  dispatch(page.startButton, "click");
  page.link.focus();
  dispatch(page.link, "keydown", { key: "Escape" });
  assertOpen(page, false);
  assert.equal(page.document.activeElement, page.startButton);
  assert.deepEqual(page.document.focusCalls, [page.link, page.startButton]);
});

test("Escape while closed never moves focus", () => {
  const page = fixture();
  dispatch(page.outside, "keydown", { key: "Escape" });
  assertOpen(page, false);
  assert.equal(page.document.activeElement, page.outside);
  assert.deepEqual(page.document.focusCalls, []);
});

for (const target of ["link", "linkChild"]) {
  test(`navigation clicks on ${target} close without preventing navigation`, () => {
    const page = fixture();
    dispatch(page.startButton, "click");
    const event = dispatch(page[target], "click");
    assertOpen(page, false);
    assert.equal(event.defaultPrevented, false);
    assert.deepEqual(page.document.focusCalls, []);
  });
}

test("focus remains open within button/menu and closes when moving outside", () => {
  const page = fixture();
  dispatch(page.startButton, "click");
  page.startButton.focus();
  assertOpen(page, true);
  page.link.focus();
  assertOpen(page, true);
  page.outside.focus();
  assertOpen(page, false);
  assert.equal(page.document.activeElement, page.outside);
  assert.deepEqual(page.document.focusCalls, [page.startButton, page.link, page.outside]);
});

test("Enter/Space use native click activation; Tab remains unhandled", () => {
  const page = fixture();
  for (const key of ["Enter", " "]) {
    const event = dispatch(page.startButton, "keydown", { key });
    assert.equal(event.defaultPrevented, false);
    assertOpen(page, false);
    // Browsers synthesize the click for native button activation.
    dispatch(page.startButton, "click");
    assertOpen(page, true);
    const tab = dispatch(page.link, "keydown", { key: "Tab" });
    assert.equal(tab.defaultPrevented, false);
    assertOpen(page, true);
    page.outside.focus();
    assertOpen(page, false);
  }
});

test("clock renders immediately and keeps updating in 12-hour format", () => {
  const page = fixture();
  assert.equal(page.taskbarClock.textContent, "1:05 PM");
  assert.equal(page.intervals.length, 1);
  assert.equal(page.intervals[0].delay, 60_000);
  for (const [hours, minutes, expected] of [
    [0, 0, "12:00 AM"], [11, 9, "11:09 AM"],
    [12, 30, "12:30 PM"], [23, 59, "11:59 PM"],
  ]) {
    Object.assign(page.time, { hours, minutes });
    page.intervals[0].callback();
    assert.equal(page.taskbarClock.textContent, expected);
  }
});

for (const button of [false, true]) {
  for (const menu of [false, true]) {
    for (const clock of [false, true]) {
      test(`missing elements are safe: button=${button}, menu=${menu}, clock=${clock}`, () => {
        const page = fixture({ button, menu, clock });
        assert.equal(page.intervals.length, clock ? 1 : 0);
        dispatch(page.startButton, "click");
        dispatch(page.iconChild, "click");
        dispatch(page.linkChild, "click");
        dispatch(page.outside, "click");
        dispatch(page.document, "keydown", { key: "Escape" });
        page.outside.focus();
        if (!button || !menu) {
          assertOpen(page, false);
          assert.equal(page.document.activeElement, page.outside);
          assert.deepEqual(page.document.focusCalls, [page.outside]);
        }
      });
    }
  }
}
