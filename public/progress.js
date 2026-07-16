(() => {
  let checkIns = [];
  try { checkIns = JSON.parse(localStorage.getItem("drift-checkins") || "[]").slice(-7); } catch { checkIns = []; }
  const chart = document.querySelector(".progress-chart");
  const title = document.querySelector(".moment-title");
  const average = document.querySelector(".average strong");
  const empty = document.querySelector(".empty-message");

  function render() {
    if (!checkIns.length) {
      title.textContent = "Your journey starts here";
      average.textContent = "—";
      chart.innerHTML = '<div class="chart-placeholder"><i></i><i></i><i></i></div>';
      empty.hidden = false;
      return;
    }
    title.textContent = "Your last seven moments";
    average.textContent = (checkIns.reduce((sum, item) => sum + Number(item.level), 0) / checkIns.length).toFixed(1);
    empty.hidden = true;
    chart.innerHTML = checkIns.map((item, index) => `<div class="progress-bar-wrap"><strong>${item.level}</strong><div class="progress-bar" style="height:${Number(item.level) * 9}%;animation-delay:${index * 80}ms"></div><span>${item.time}</span></div>`).join("");
  }

  document.querySelector(".clear-progress").addEventListener("click", () => {
    if (!checkIns.length || !window.confirm("Clear all saved stress check-ins on this device?")) return;
    localStorage.removeItem("drift-checkins"); checkIns = []; render();
  });
  render();
})();
