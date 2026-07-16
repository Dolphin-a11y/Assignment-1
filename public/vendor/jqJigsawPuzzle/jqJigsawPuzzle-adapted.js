/*
 * Modern topology adapter derived from jqJigsawPuzzle by JFMDev.
 * Copyright 2012 JFMDev. Modifications copyright 2026 Drift contributors.
 * This Source Code Form is subject to the Mozilla Public License, v. 2.0.
 * https://mozilla.org/MPL/2.0/
 */
(function (global) {
  "use strict";

  function randomPieceTypes(rows, columns) {
    const result = Array.from({ length: rows }, () => Array(columns));

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if ((row + column) % 2 !== 0) continue;
        let value = Math.floor(Math.random() * 16);
        if (row === 0) value |= 8;
        if (row === rows - 1) value |= 2;
        if (column === 0) value |= 4;
        if (column === columns - 1) value |= 1;
        result[row][column] = value;
      }
    }

    for (let row = 0; row < rows; row += 1) {
      for (let column = 0; column < columns; column += 1) {
        if ((row + column) % 2 !== 1) continue;
        let detail = 0;
        if (row !== 0) detail |= (result[row - 1][column] & 2) << 2;
        if (row !== rows - 1) detail |= (result[row + 1][column] & 8) >> 2;
        if (column !== 0) detail |= (result[row][column - 1] & 1) << 2;
        if (column !== columns - 1) detail |= (result[row][column + 1] & 4) >> 2;
        result[row][column] = 15 - detail;
      }
    }

    return result.map((row) => row.map((value) => value.toString(2).padStart(4, "0")));
  }

  global.jqJigsawPuzzle = { randomPieceTypes };
})(window);
