const clockElement = document.getElementById("taskbarClock");
const startButton = document.getElementById("startButton");
const startMenu = document.getElementById("startMenu");

const updateClock = () => {
  if (!clockElement) {
    return;
  }
  const now = new Date();
  const hours = now.getHours() % 12 || 12;
  const minutes = now.getMinutes().toString().padStart(2, "0");
  const period = now.getHours() >= 12 ? "PM" : "AM";
  clockElement.textContent = `${hours}:${minutes} ${period}`;
};

if (clockElement) {
  updateClock();
  setInterval(updateClock, 60_000);
}

if (startButton && startMenu) {
  const closeStartMenu = () => {
    startMenu.hidden = true;
    startButton.setAttribute("aria-expanded", "false");
  };

  startButton.addEventListener("click", () => {
    const isOpen = !startMenu.hidden;
    startMenu.hidden = isOpen;
    startButton.setAttribute("aria-expanded", (!isOpen).toString());
  });

  const dismissOutside = (event) => {
    if (
      !startMenu.hidden &&
      !startMenu.contains(event.target) &&
      !startButton.contains(event.target)
    ) {
      closeStartMenu();
    }
  };

  document.addEventListener("click", dismissOutside);
  document.addEventListener("focusin", dismissOutside);

  startMenu.addEventListener("click", (event) => {
    const link = event.target.closest?.("a[href]");
    if (link && startMenu.contains(link)) {
      closeStartMenu();
    }
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && !startMenu.hidden) {
      closeStartMenu();
      startButton.focus();
    }
  });
}
