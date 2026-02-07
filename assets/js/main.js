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

updateClock();
setInterval(updateClock, 60_000);

const closeStartMenu = () => {
  if (!startMenu || !startButton) {
    return;
  }
  startMenu.hidden = true;
  startButton.setAttribute("aria-expanded", "false");
};
/*
const toggleStartMenu = () => {
  if (!startMenu || !startButton) {
    return;
  }
  const isOpen = !startMenu.hidden;
  startMenu.hidden = isOpen;
  startButton.setAttribute("aria-expanded", (!isOpen).toString());
};


if (startButton) {
  startButton.addEventListener("click", (event) => {
    event.stopPropagation();
    toggleStartMenu();
  });
}

document.addEventListener("click", (event) => {
  if (!startMenu || !startButton) {
    return;
  }
  if (startMenu.hidden) {
    return;
  }
  if (!startMenu.contains(event.target) && event.target !== startButton) {
    closeStartMenu();
  }
});
*/
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeStartMenu();
  }
});
