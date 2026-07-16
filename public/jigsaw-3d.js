(() => {
  "use strict";

  const board = document.querySelector("#puzzle-board");
  const upload = document.querySelector("#image-upload");
  const difficulty = document.querySelector("#difficulty");
  const movesLabel = document.querySelector("#moves");
  const timeLabel = document.querySelector("#timer");
  const placedLabel = document.querySelector("#placed");
  const completion = document.querySelector("#completion");
  const presetCard = document.querySelector("#preset-card");
  const referenceView = document.querySelector("#reference-view");
  const referenceImage = document.querySelector("#reference-image");
  let source = "./ocean-jigsaw.png";
  let normalisedSource = "";
  let pieces = [];
  let moves = 0;
  let placed = 0;
  let startedAt = 0;
  let timerId = 0;
  let topLayer = 20;
  let uploadUrl = "";

  function formatTime(milliseconds) {
    const seconds = Math.floor(milliseconds / 1000);
    return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
  }

  function updateStats() {
    movesLabel.textContent = moves;
    placedLabel.textContent = `${placed}/${pieces.length}`;
    timeLabel.textContent = startedAt ? formatTime(Date.now() - startedAt) : "00:00";
  }

  function startTimer() {
    if (startedAt) return;
    startedAt = Date.now();
    timerId = window.setInterval(updateStats, 1000);
  }

  function loadImage(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = reject;
      image.src = url;
    });
  }

  async function normalise(url) {
    const image = await loadImage(url);
    const canvas = document.createElement("canvas");
    canvas.width = 960; canvas.height = 600;
    const context = canvas.getContext("2d");
    context.fillStyle = "#dbeaf2";
    context.fillRect(0, 0, canvas.width, canvas.height);
    const scale = Math.min(canvas.width / image.naturalWidth, canvas.height / image.naturalHeight);
    const width = image.naturalWidth * scale; const height = image.naturalHeight * scale;
    context.drawImage(image, (canvas.width - width) / 2, (canvas.height - height) / 2, width, height);
    return canvas.toDataURL("image/jpeg", .9);
  }

  function sidePoints(type, row, column, rows, columns, cellWidth, cellHeight, padding) {
    const left = padding; const top = padding; const right = padding + cellWidth; const bottom = padding + cellHeight;
    const bump = Math.min(padding * .88, cellWidth * .14, cellHeight * .14);
    const points = [[left, top]];
    const addTop = () => {
      if (row === 0) { points.push([right, top]); return; }
      const y = type[0] === "0" ? top - bump : top + bump;
      points.push([left + cellWidth * .34, top],[left + cellWidth * .4, y],[left + cellWidth * .6, y],[left + cellWidth * .66, top],[right, top]);
    };
    const addRight = () => {
      if (column === columns - 1) { points.push([right, bottom]); return; }
      const x = type[1] === "0" ? right + bump : right - bump;
      points.push([right, top + cellHeight * .34],[x, top + cellHeight * .4],[x, top + cellHeight * .6],[right, top + cellHeight * .66],[right, bottom]);
    };
    const addBottom = () => {
      if (row === rows - 1) { points.push([left, bottom]); return; }
      const y = type[2] === "0" ? bottom + bump : bottom - bump;
      points.push([left + cellWidth * .66, bottom],[left + cellWidth * .6, y],[left + cellWidth * .4, y],[left + cellWidth * .34, bottom],[left, bottom]);
    };
    const addLeft = () => {
      if (column === 0) { points.push([left, top]); return; }
      const x = type[3] === "0" ? left + bump : left - bump;
      points.push([left, top + cellHeight * .66],[x, top + cellHeight * .6],[x, top + cellHeight * .4],[left, top + cellHeight * .34],[left, top]);
    };
    addTop(); addRight(); addBottom(); addLeft();
    return `polygon(${points.map(([x,y]) => `${x}px ${y}px`).join(",")})`;
  }

  function shufflePosition(piece, width, height) {
    let left; let top; let attempts = 0;
    do {
      left = Math.random() * Math.max(1, width - piece.width);
      top = Math.random() * Math.max(1, height - piece.height);
      attempts += 1;
    } while (attempts < 12 && Math.hypot(left - piece.correctLeft, top - piece.correctTop) < Math.min(width, height) * .16);
    return { left, top };
  }

  function attachDrag(piece) {
    const element = piece.element;
    element.addEventListener("pointerdown", (event) => {
      if (piece.locked) return;
      event.preventDefault(); startTimer(); element.setPointerCapture(event.pointerId);
      const boardRect = board.getBoundingClientRect();
      const offsetX = event.clientX - boardRect.left - piece.left;
      const offsetY = event.clientY - boardRect.top - piece.top;
      element.classList.add("dragging"); element.style.zIndex = ++topLayer;

      const move = (moveEvent) => {
        piece.left = moveEvent.clientX - boardRect.left - offsetX;
        piece.top = moveEvent.clientY - boardRect.top - offsetY;
        element.style.left = `${piece.left}px`; element.style.top = `${piece.top}px`;
      };
      const stop = () => {
        element.classList.remove("dragging"); element.removeEventListener("pointermove", move); element.removeEventListener("pointerup", stop); element.removeEventListener("pointercancel", stop);
        moves += 1;
        const snapDistance = Math.max(22, Math.min(piece.cellWidth, piece.cellHeight) * .2);
        if (Math.hypot(piece.left - piece.correctLeft, piece.top - piece.correctTop) <= snapDistance) {
          piece.left = piece.correctLeft; piece.top = piece.correctTop; piece.locked = true; placed += 1;
          element.style.left = `${piece.left}px`; element.style.top = `${piece.top}px`; element.style.zIndex = 2; element.classList.add("locked");
          if (placed === pieces.length) {
            window.clearInterval(timerId); updateStats(); window.setTimeout(() => { completion.hidden = false; }, 350);
          }
        }
        updateStats();
      };
      element.addEventListener("pointermove", move); element.addEventListener("pointerup", stop); element.addEventListener("pointercancel", stop);
    });
  }

  async function createPuzzle() {
    completion.hidden = true; window.clearInterval(timerId); startedAt = 0; moves = 0; placed = 0; topLayer = 20;
    if (!normalisedSource) normalisedSource = await normalise(source);
    board.replaceChildren();
    const [rows, columns] = difficulty.value.split("x").map(Number);
    const width = board.clientWidth; const height = board.clientHeight;
    const cellWidth = width / columns; const cellHeight = height / rows; const padding = Math.min(cellWidth, cellHeight) * .19;
    const types = window.jqJigsawPuzzle.randomPieceTypes(rows, columns);
    pieces = [];

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        const element = document.createElement("div");
        const pieceWidth = cellWidth + padding * 2; const pieceHeight = cellHeight + padding * 2;
        const correctLeft = column * cellWidth - padding; const correctTop = row * cellHeight - padding;
        const piece = { element, row, column, width:pieceWidth, height:pieceHeight, cellWidth, cellHeight, correctLeft, correctTop, left:0, top:0, locked:false };
        const shuffled = shufflePosition(piece, width, height); piece.left = shuffled.left; piece.top = shuffled.top;
        element.className = "puzzle-piece"; element.setAttribute("role", "button"); element.setAttribute("aria-label", `Puzzle piece ${row * columns + column + 1}`);
        element.style.cssText = `width:${pieceWidth}px;height:${pieceHeight}px;left:${piece.left}px;top:${piece.top}px;background-image:url("${normalisedSource}");background-size:${width}px ${height}px;background-position:${padding - column * cellWidth}px ${padding - row * cellHeight}px;clip-path:${sidePoints(types[row][column],row,column,rows,columns,cellWidth,cellHeight,padding)};--turn:${(Math.random() * 8 - 4).toFixed(2)}deg;z-index:${++topLayer}`;
        board.appendChild(element); pieces.push(piece); attachDrag(piece);
      }
    }
    updateStats();
  }

  upload.addEventListener("change", async () => {
    const file = upload.files[0]; if (!file) return;
    if (uploadUrl) URL.revokeObjectURL(uploadUrl); uploadUrl = URL.createObjectURL(file); source = uploadUrl; referenceImage.src = uploadUrl; normalisedSource = ""; presetCard.classList.remove("selected");
    await createPuzzle();
  });
  document.querySelector("#use-preset").addEventListener("click", async () => { source = "./ocean-jigsaw.png"; referenceImage.src = source; normalisedSource = ""; presetCard.classList.add("selected"); await createPuzzle(); });
  document.querySelector("#show-reference").addEventListener("click", () => { referenceView.hidden = false; document.querySelector("#close-reference").focus(); });
  document.querySelector("#close-reference").addEventListener("click", () => { referenceView.hidden = true; document.querySelector("#show-reference").focus(); });
  referenceView.addEventListener("click", (event) => { if (event.target === referenceView) referenceView.hidden = true; });
  document.addEventListener("keydown", (event) => { if (event.key === "Escape" && !referenceView.hidden) referenceView.hidden = true; });
  document.querySelector("#new-puzzle").addEventListener("click", createPuzzle);
  document.querySelector("#play-again").addEventListener("click", createPuzzle);
  difficulty.addEventListener("change", createPuzzle);
  window.addEventListener("resize", () => { window.clearTimeout(window.__jigsawResize); window.__jigsawResize = window.setTimeout(createPuzzle, 220); });
  createPuzzle();
})();
