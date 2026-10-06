(() => {
  const main = document.querySelector(".desktop .window.centered:not(.max)");
  const titlebar = main?.querySelector(".window-titlebar");
  if (!titlebar) return;

  const media = window.matchMedia(
    "(min-width: 721px) and (hover: hover) and (pointer: fine)"
  );
  const controls = titlebar.querySelector(".window-controls");
  const taskbar = document.querySelector(".taskbar");
  const interactiveSelector =
    "a, button, input, select, textarea, option, [contenteditable]:not([contenteditable=\"false\"])";
  let currentX = 0;
  let currentY = 0;
  let drag = null;

  const setOffsets = (x, y) => {
    currentX = x;
    currentY = y;
    main.style.setProperty("--window-drag-x", `${x}px`);
    main.style.setProperty("--window-drag-y", `${y}px`);
  };

  const finishDrag = () => {
    if (!drag) return;
    const pointerId = drag.pointerId;
    // Clear state first: releasing capture can synchronously report its loss.
    drag = null;
    main.classList.remove("is-dragging");
    if (titlebar.hasPointerCapture(pointerId)) {
      titlebar.releasePointerCapture(pointerId);
    }
  };

  const recenter = () => {
    finishDrag();
    setOffsets(0, 0);
  };

  const recenterVisible = () => {
    recenter();
    const rect = titlebar.getBoundingClientRect();
    const minimumTop = (taskbar?.getBoundingClientRect().bottom ?? 30) + 8;
    if (rect.top < minimumTop || rect.bottom > window.innerHeight - 8) {
      titlebar.scrollIntoView({ block: "nearest", inline: "nearest" });
    }
  };

  const moveTo = (x, y) => {
    const rect = main.getBoundingClientRect();
    // Recover document-flow placement on every move, including after scrolling.
    const baseLeft = rect.left - currentX;
    const baseTop = rect.top - currentY;
    const minimumTop = (taskbar?.getBoundingClientRect().bottom ?? 30) + 8;
    const availableHeight = window.innerHeight - minimumTop - 8;
    // Tall content stays in flow; only its complete titlebar must remain visible.
    const visibleHeight = rect.height <= availableHeight
      ? rect.height
      : titlebar.getBoundingClientRect().bottom - rect.top;
    const maximumLeft = Math.max(8, window.innerWidth - rect.width - 8);
    const maximumTop = Math.max(minimumTop, window.innerHeight - visibleHeight - 8);
    const left = Math.min(maximumLeft, Math.max(8, baseLeft + x));
    const top = Math.min(maximumTop, Math.max(minimumTop, baseTop + y));
    setOffsets(left - baseLeft, top - baseTop);
  };

  const excludedTarget = (event) => {
    const interactive = event.target.closest?.(interactiveSelector);
    if (interactive && titlebar.contains(interactive)) return true;
    if (!controls) return false;
    if (controls.contains(event.target)) return true;
    // Decorative controls use pointer-events: none, so their target is unreliable.
    const rect = controls.getBoundingClientRect();
    return event.clientX >= rect.left && event.clientX <= rect.right &&
      event.clientY >= rect.top && event.clientY <= rect.bottom;
  };

  titlebar.addEventListener("pointerdown", (event) => {
    if (!media.matches || drag || event.pointerType !== "mouse" ||
        !event.isPrimary || event.button !== 0 || excludedTarget(event)) return;
    drag = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
      x: currentX,
      y: currentY,
    };
    try {
      titlebar.setPointerCapture(event.pointerId);
    } catch {
      finishDrag();
      return;
    }
    main.classList.add("is-dragging");
    event.preventDefault();
  });

  titlebar.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId ||
        event.pointerType !== "mouse") return;
    moveTo(drag.x + event.clientX - drag.clientX,
      drag.y + event.clientY - drag.clientY);
  });

  const finishPointer = (event) => {
    if (drag && event.pointerId === drag.pointerId) finishDrag();
  };
  for (const type of ["pointerup", "pointercancel", "lostpointercapture"]) {
    titlebar.addEventListener(type, finishPointer);
  }
  window.addEventListener("blur", finishDrag);
  window.addEventListener("resize", recenter);

  titlebar.addEventListener("dblclick", (event) => {
    if (!media.matches || event.button !== 0 || excludedTarget(event)) return;
    recenterVisible();
    event.preventDefault();
  });


  const updateEligibility = () => {
    recenter();
    main.classList.toggle("is-draggable", media.matches);
  };
  media.addEventListener("change", updateEligibility);
  updateEligibility();
})();
