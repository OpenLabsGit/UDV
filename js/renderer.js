const { ipcRenderer } = require("electron");
var hapticjs = require('hapticjs')

const f = document.getElementById("download-form");
const u = document.getElementById("url-input");
const p = document.getElementById("progress-bar");
const i = document.getElementById("progress-info");
const r = document.getElementById("remaining-info");

f.addEventListener("submit", e => {
  e.preventDefault();
  ipcRenderer.send("download", { url: u.value, audioOnly: false });
});



const urlInput = document.getElementById("url-input");

urlInput.addEventListener("mouseenter", () => {
  if (!urlInput.matches(":focus")) {
    hapticjs.vibrate();
  }
});

urlInput.addEventListener("focus", () => {
  console.clear()
});

urlInput.addEventListener("blur", () => {
  if (!urlInput.matches(":hover")) {
    hapticjs.vibrate();
  }
});

urlInput.addEventListener("input", () => {
    if (urlInput.value.trim() !== "") {
      urlInput.classList.add("margin-on-input");
    } else {
      urlInput.classList.remove("margin-on-input");
    }
  });

ipcRenderer.on("download-started", () => console.log("Download started"));

ipcRenderer.on("download-progress", (e, { downloaded, total, speed, remainingTime }) => {
  const pp = Math.floor(downloaded / total * 100);
  p.value = pp;
  i.textContent = `Progress: ${pp}% | Speed: ${((speed / (1024 * 1024)).toFixed(2))} Mbps`;
  r.textContent = `Remaining Time: ${Math.floor(remainingTime / 60)} min ${remainingTime % 60} sec`;
  console.log(`Downloaded: ${downloaded} bytes | Total: ${total} bytes | Speed: ${((speed / (1024 * 1024)).toFixed(2))} Mbps`);
});

ipcRenderer.on("download-complete", (e, fileLocation) => {
  console.log("Download complete");
  console.log("File location:", fileLocation);
});

ipcRenderer.on("download-error", (e, error) => console.error("Download error:", error));
