"use client";

import { useEffect, useMemo, useRef } from "react";

export type ParticleShape = "grace" | "runes" | "ashes" | "oaths";

export interface ParticleMenuItem {
  id: string;
  label: string;
  shape: ParticleShape;
  href?: string;
  onSelect?: () => void;
}

export interface ParticleMenuProps {
  items: readonly ParticleMenuItem[];
  ariaLabel?: string;
  strength?: number;
  radius?: number;
  className?: string;
}

type Point = { x: number; y: number; size: number };
const TAU = Math.PI * 2;
const CENTER = 60;

// Seeded grain keeps the server render and the first client render identical.
function noise(seed: number) {
  const value = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
  return value - Math.floor(value);
}

// Original sigil silhouettes and precomputed scanlines for their particle fill.
const GLYPHS: Record<ParticleShape, { path: string; rows: number[][] }> = {
  grace: {
    path: [
      "M41 47a19 21 0 1 1 38 0a19 21 0 1 1 -38 0Z M42.9 47a17.1 19.1 0 1 0 34.2 0a17.1 19.1 0 1 0 -34.2 0Z",
      "M29 62a19 21 0 1 1 38 0a19 21 0 1 1 -38 0Z M30.9 62a17.1 19.1 0 1 0 34.2 0a17.1 19.1 0 1 0 -34.2 0Z",
      "M53 62a19 21 0 1 1 38 0a19 21 0 1 1 -38 0Z M54.9 62a17.1 19.1 0 1 0 34.2 0a17.1 19.1 0 1 0 -34.2 0Z",
      "M60 13L62 25L61.2 85L64 96L60 105L56 96L58.8 85L58 25Z",
      "M38 20Q46 31 60 29Q74 31 82 20Q76 35 60 32Q44 35 38 20Z",
      "M32 84Q45 93 60 91Q75 93 88 84Q79 96 62 94L60 98L58 94Q41 96 32 84Z",
      "M44 27L41 16L48 28Z M76 27L79 16L72 28Z",
      "M35 55L26 49L31 60Z M85 55L94 49L89 60Z",
    ].join(" "),
    rows: [
      [13, 60, 60],
      [14, 60, 60],
      [15, 60, 60],
      [16, 41, 41, 60, 60, 79, 79],
      [17, 60, 60],
      [18, 42, 42, 60, 60, 78, 78],
      [19, 42, 42, 59, 61, 78, 78],
      [20, 38, 38, 43, 43, 59, 61, 77, 77, 82, 82],
      [21, 43, 43, 59, 61, 77, 77],
      [22, 39, 39, 43, 44, 59, 61, 76, 77, 81, 81],
      [23, 40, 40, 43, 45, 59, 61, 75, 77, 80, 80],
      [24, 40, 41, 44, 45, 59, 61, 75, 76, 79, 80],
      [25, 41, 42, 44, 46, 58, 62, 74, 76, 78, 79],
      [26, 42, 46, 59, 61, 74, 75, 77, 78],
      [27, 43, 47, 55, 65, 73, 74, 76, 77],
      [28, 44, 48, 52, 68, 72, 76],
      [29, 45, 54, 59, 61, 66, 75],
      [30, 46, 74],
      [31, 48, 72],
      [32, 47, 49, 51, 69, 71, 73],
      [33, 46, 48, 59, 61, 72, 74],
      [34, 46, 47, 59, 61, 73, 74],
      [35, 45, 46, 59, 61, 74, 75],
      [36, 44, 46, 59, 61, 74, 76],
      [37, 44, 45, 59, 61, 75, 76],
      [38, 43, 44, 59, 61, 76, 77],
      [39, 43, 44, 59, 61, 76, 77],
      [40, 43, 44, 59, 61, 76, 77],
      [41, 42, 43, 48, 48, 59, 61, 72, 72, 77, 78],
      [42, 42, 53, 59, 61, 67, 78],
      [43, 40, 46, 50, 56, 59, 61, 64, 70, 74, 80],
      [44, 39, 43, 54, 57, 59, 61, 63, 66, 77, 81],
      [45, 37, 40, 42, 42, 56, 64, 78, 78, 80, 83],
      [46, 36, 38, 42, 42, 58, 62, 78, 78, 82, 84],
      [47, 35, 37, 41, 42, 59, 61, 78, 79, 83, 85],
      [48, 34, 36, 42, 42, 58, 62, 78, 78, 84, 86],
      [49, 26, 26, 34, 35, 42, 42, 58, 62, 78, 78, 85, 86, 94, 94],
      [50, 27, 27, 33, 34, 42, 43, 57, 63, 77, 78, 86, 87, 93, 93],
      [51, 27, 29, 32, 34, 42, 43, 56, 64, 77, 78, 86, 88, 91, 93],
      [52, 28, 30, 32, 33, 42, 43, 56, 57, 59, 61, 63, 64, 77, 78, 87, 88, 90, 92],
      [53, 28, 30, 32, 32, 42, 43, 55, 56, 59, 61, 64, 65, 77, 78, 88, 92],
      [54, 29, 30, 33, 33, 43, 44, 55, 56, 59, 61, 64, 65, 76, 77, 87, 91],
      [55, 29, 30, 33, 35, 43, 44, 55, 56, 59, 61, 64, 65, 76, 77, 85, 91],
      [56, 32, 34, 43, 44, 54, 55, 59, 61, 65, 66, 76, 77, 86, 90],
      [57, 32, 33, 44, 45, 54, 55, 59, 61, 65, 66, 75, 76, 87, 90],
      [58, 30, 30, 32, 32, 44, 46, 54, 55, 59, 61, 65, 66, 74, 76, 88, 90],
      [59, 30, 30, 45, 46, 54, 55, 59, 61, 65, 66, 74, 75, 89, 90],
      [60, 30, 31, 46, 47, 54, 54, 59, 61, 66, 66, 73, 74, 89, 90],
      [61, 30, 30, 46, 48, 54, 54, 59, 61, 66, 66, 72, 74, 90, 90],
      [62, 29, 30, 47, 49, 53, 54, 59, 61, 66, 67, 71, 73, 90, 91],
      [63, 30, 30, 48, 50, 54, 54, 59, 61, 66, 66, 70, 72, 90, 90],
      [64, 30, 30, 49, 52, 54, 54, 59, 61, 66, 66, 68, 71, 90, 90],
      [65, 30, 31, 51, 55, 59, 61, 65, 69, 89, 90],
      [66, 30, 31, 52, 68, 89, 90],
      [67, 30, 31, 54, 66, 89, 90],
      [68, 30, 31, 54, 55, 59, 61, 65, 66, 89, 90],
      [69, 31, 32, 55, 56, 59, 61, 64, 65, 88, 89],
      [70, 31, 32, 55, 56, 59, 61, 64, 65, 88, 89],
      [71, 31, 32, 55, 56, 59, 61, 64, 65, 88, 89],
      [72, 32, 33, 56, 57, 59, 61, 63, 64, 87, 88],
      [73, 32, 34, 56, 64, 86, 88],
      [74, 33, 34, 57, 63, 86, 87],
      [75, 34, 35, 58, 62, 85, 86],
      [76, 34, 36, 58, 62, 84, 86],
      [77, 35, 37, 59, 61, 83, 85],
      [78, 36, 38, 58, 62, 82, 84],
      [79, 37, 40, 56, 64, 80, 83],
      [80, 39, 42, 54, 57, 59, 61, 63, 66, 78, 81],
      [81, 40, 46, 50, 56, 59, 61, 64, 70, 74, 80],
      [82, 43, 53, 59, 61, 67, 77],
      [83, 48, 48, 59, 61, 72, 72],
      [84, 32, 32, 59, 61, 88, 88],
      [85, 33, 33, 59, 61, 87, 87],
      [86, 34, 35, 59, 61, 85, 86],
      [87, 35, 36, 59, 61, 84, 85],
      [88, 36, 39, 59, 61, 81, 84],
      [89, 37, 41, 58, 62, 79, 83],
      [90, 39, 44, 58, 62, 76, 81],
      [91, 40, 49, 58, 62, 71, 80],
      [92, 42, 78],
      [93, 45, 75],
      [94, 49, 71],
      [95, 57, 63],
      [96, 56, 64],
      [97, 57, 63],
      [98, 57, 63],
      [99, 58, 62],
      [100, 58, 62],
      [101, 59, 61],
      [102, 59, 61],
      [103, 60, 60],
      [104, 60, 60],
      [105, 60, 60],
    ],
  },
  runes: {
    path: [
      "M79 22C46 12 26 35 29 61C31 87 56 98 80 83C59 90 40 77 39 56C38 39 54 23 79 22Z",
      "M78 29C55 27 44 42 45 59C46 74 58 82 71 81C55 76 51 66 51 55C51 43 61 34 78 29Z",
      "M70 14L73 38L82 48L73 56L70 91L67 56L58 48L67 38Z M70 37L67 48L70 59L73 48Z",
      "M70 86L73 96L70 105L67 96Z",
      "M29 48L21 40L29 43Z M34 74L24 78L31 69Z M49 87L44 98L45 85Z",
      "M87 31L89 37L95 39L89 41L87 47L85 41L79 39L85 37Z",
      "M85 61L86.5 65L91 66.5L86.5 68L85 72L83.5 68L79 66.5L83.5 65Z",
    ].join(" "),
    rows: [
      [14, 70, 70],
      [15, 70, 70],
      [16, 70, 70],
      [17, 70, 70],
      [18, 70, 70],
      [19, 70, 70],
      [20, 59, 70],
      [21, 54, 69, 71, 75],
      [22, 51, 69, 71, 79],
      [23, 49, 68, 71, 71],
      [24, 47, 66, 69, 71],
      [25, 45, 62, 69, 71],
      [26, 43, 60, 69, 71],
      [27, 42, 58, 69, 71],
      [28, 41, 56, 69, 71],
      [29, 40, 54, 69, 70, 72, 78],
      [30, 39, 53, 65, 68, 72, 74],
      [31, 38, 51, 62, 67, 87, 87],
      [32, 37, 50, 60, 67, 70, 72, 87, 87],
      [33, 36, 49, 58, 72, 87, 87],
      [34, 36, 48, 56, 65, 68, 72, 86, 88],
      [35, 35, 47, 55, 63, 68, 72, 86, 88],
      [36, 34, 46, 54, 62, 68, 72, 86, 88],
      [37, 34, 45, 53, 60, 68, 72, 85, 89],
      [38, 33, 44, 52, 59, 67, 69, 71, 73, 82, 92],
      [39, 33, 43, 51, 58, 67, 69, 71, 73, 79, 95],
      [40, 21, 21, 32, 43, 50, 57, 66, 69, 71, 74, 82, 92],
      [41, 22, 23, 32, 42, 50, 56, 65, 68, 72, 75, 85, 89],
      [42, 23, 26, 32, 42, 49, 55, 64, 68, 72, 76, 86, 88],
      [43, 24, 29, 31, 41, 49, 54, 63, 68, 72, 77, 86, 88],
      [44, 25, 29, 31, 41, 48, 54, 62, 68, 72, 78, 86, 88],
      [45, 26, 29, 31, 40, 48, 53, 61, 67, 73, 79, 87, 87],
      [46, 27, 40, 47, 53, 60, 67, 73, 80, 87, 87],
      [47, 28, 40, 47, 52, 59, 67, 73, 81, 87, 87],
      [48, 29, 39, 47, 52, 58, 67, 73, 82],
      [49, 30, 39, 46, 51, 60, 67, 73, 80],
      [50, 30, 39, 46, 51, 61, 67, 73, 79],
      [51, 29, 39, 46, 51, 62, 67, 73, 78],
      [52, 29, 39, 46, 51, 63, 68, 72, 77],
      [53, 29, 38, 46, 51, 64, 68, 72, 76],
      [54, 29, 38, 46, 51, 65, 68, 72, 75],
      [55, 29, 38, 45, 51, 66, 68, 72, 74],
      [56, 29, 39, 45, 51, 67, 69, 71, 73],
      [57, 29, 39, 45, 51, 68, 69, 71, 72],
      [58, 29, 39, 45, 51, 68, 69, 71, 72],
      [59, 29, 39, 45, 51, 68, 72],
      [60, 29, 39, 46, 51, 68, 72],
      [61, 29, 39, 46, 51, 68, 72, 85, 85],
      [62, 30, 39, 46, 51, 68, 72, 85, 85],
      [63, 30, 40, 46, 51, 68, 72, 85, 85],
      [64, 30, 40, 46, 52, 68, 72, 84, 86],
      [65, 30, 40, 47, 52, 68, 72, 84, 86],
      [66, 30, 41, 47, 52, 68, 72, 81, 89],
      [67, 30, 41, 47, 53, 68, 72, 81, 89],
      [68, 31, 41, 48, 53, 69, 71, 84, 86],
      [69, 31, 42, 48, 54, 69, 71, 84, 86],
      [70, 32, 42, 49, 54, 69, 71, 85, 85],
      [71, 30, 31, 33, 43, 49, 55, 69, 71, 85, 85],
      [72, 29, 31, 33, 44, 50, 56, 69, 71, 85, 85],
      [73, 28, 31, 34, 44, 51, 57, 69, 71],
      [74, 28, 32, 34, 45, 52, 58, 69, 71],
      [75, 27, 31, 33, 46, 53, 59, 69, 71],
      [76, 26, 29, 34, 47, 54, 60, 69, 71],
      [77, 25, 26, 35, 48, 55, 62, 69, 71],
      [78, 24, 24, 35, 49, 57, 63, 69, 71],
      [79, 36, 50, 59, 65, 69, 71],
      [80, 37, 51, 62, 68, 70, 70],
      [81, 38, 53, 67, 69, 71, 71],
      [82, 39, 55, 70, 70],
      [83, 40, 57, 70, 70, 80, 80],
      [84, 41, 61, 70, 70, 77, 78],
      [85, 42, 69, 71, 76],
      [86, 44, 44, 47, 74],
      [87, 45, 45, 49, 72],
      [88, 45, 47, 49, 70],
      [89, 45, 48, 52, 65, 70, 70],
      [90, 45, 47, 69, 71],
      [91, 45, 47, 69, 71],
      [92, 45, 46, 69, 71],
      [93, 45, 46, 68, 72],
      [94, 45, 45, 68, 72],
      [95, 45, 45, 68, 72],
      [96, 67, 73],
      [97, 68, 72],
      [98, 44, 44, 68, 72],
      [99, 68, 72],
      [100, 69, 71],
      [101, 69, 71],
      [102, 69, 71],
      [103, 70, 70],
      [104, 70, 70],
      [105, 70, 70],
    ],
  },
  ashes: {
    path: [
      "M62 14C68 34 45 42 46 59C47 66 53 69 56 74C48 56 76 47 73 29C91 51 76 60 78 72C79 76 84 72 84 64C91 81 77 94 62 95C42 96 28 84 31 69C32 63 37 57 36 50C50 61 32 77 48 84C37 63 36 54 48 39C56 29 60 23 62 14Z M64 51C59 65 48 70 54 84C57 91 70 89 73 83C61 86 67 74 64 70C60 64 62 57 64 51Z",
      "M38 35C40 45 28 52 30 62C22 53 33 44 38 35Z",
      "M84 37C95 51 86 57 91 65C80 59 87 49 84 37Z",
      "M26 86Q60 103 94 86Q79 101 62 99L60 108L58 99Q41 101 26 86Z",
      "M60 5L63 10L60 15L57 10Z",
    ].join(" "),
    rows: [
      [5, 60, 60],
      [6, 60, 60],
      [7, 59, 61],
      [8, 59, 61],
      [9, 58, 62],
      [10, 57, 63],
      [11, 58, 62],
      [12, 59, 61],
      [13, 59, 61],
      [14, 60, 60, 62, 62],
      [15, 60, 60, 62, 62],
      [16, 62, 62],
      [17, 62, 62],
      [18, 61, 62],
      [19, 61, 62],
      [20, 61, 62],
      [21, 60, 62],
      [22, 60, 62],
      [23, 59, 62],
      [24, 59, 62],
      [25, 58, 62],
      [26, 58, 62],
      [27, 57, 61],
      [28, 57, 61],
      [29, 56, 61, 73, 73],
      [30, 55, 60],
      [31, 55, 60, 74, 74],
      [32, 54, 59, 74, 75],
      [33, 53, 59, 74, 76],
      [34, 52, 58, 74, 76],
      [35, 38, 38, 52, 57, 73, 77],
      [36, 38, 38, 51, 57, 73, 77],
      [37, 37, 38, 50, 56, 73, 78, 84, 84],
      [38, 37, 38, 49, 55, 72, 79],
      [39, 36, 38, 48, 54, 72, 79, 85, 85],
      [40, 35, 37, 48, 54, 72, 79, 85, 86],
      [41, 35, 37, 47, 53, 71, 80, 85, 86],
      [42, 34, 37, 46, 52, 70, 80, 85, 87],
      [43, 33, 36, 46, 51, 70, 81, 85, 87],
      [44, 32, 36, 45, 51, 69, 81, 85, 88],
      [45, 32, 35, 44, 50, 68, 81, 85, 88],
      [46, 31, 35, 44, 49, 68, 81, 85, 88],
      [47, 30, 34, 43, 49, 67, 81, 85, 89],
      [48, 30, 34, 43, 48, 66, 81, 85, 89],
      [49, 29, 33, 42, 48, 65, 81, 85, 89],
      [50, 29, 33, 36, 36, 42, 47, 64, 81, 85, 89],
      [51, 28, 32, 37, 37, 41, 47, 64, 81, 85, 89],
      [52, 28, 32, 37, 38, 41, 46, 63, 81, 85, 89],
      [53, 28, 31, 37, 38, 41, 46, 62, 81, 85, 89],
      [54, 28, 31, 36, 46, 61, 62, 64, 81, 85, 89],
      [55, 28, 30, 36, 46, 60, 81, 85, 89],
      [56, 28, 30, 36, 46, 60, 61, 63, 81, 85, 89],
      [57, 28, 30, 36, 45, 59, 61, 63, 80, 85, 89],
      [58, 28, 29, 35, 45, 58, 60, 63, 80, 86, 89],
      [59, 29, 29, 35, 46, 58, 60, 62, 80, 86, 89],
      [60, 29, 29, 35, 46, 57, 59, 62, 79, 86, 89],
      [61, 34, 46, 57, 58, 62, 79, 87, 89],
      [62, 30, 30, 34, 46, 56, 58, 62, 79, 88, 89],
      [63, 33, 47, 56, 57, 62, 78, 89, 90],
      [64, 33, 47, 56, 56, 62, 78, 84, 84, 90, 90],
      [65, 33, 48, 55, 56, 62, 78, 84, 84, 91, 91],
      [66, 32, 49, 55, 55, 63, 78, 84, 84],
      [67, 32, 50, 55, 55, 63, 78, 84, 85],
      [68, 32, 50, 63, 77, 84, 85],
      [69, 31, 51, 64, 77, 84, 85],
      [70, 31, 52, 54, 54, 64, 77, 83, 85],
      [71, 31, 40, 42, 54, 65, 77, 83, 85],
      [72, 31, 40, 43, 52, 55, 55, 65, 78, 82, 85],
      [73, 31, 40, 43, 52, 65, 78, 81, 85],
      [74, 31, 40, 44, 52, 56, 56, 65, 85],
      [75, 31, 40, 44, 52, 65, 85],
      [76, 31, 41, 45, 52, 65, 85],
      [77, 32, 41, 45, 52, 66, 85],
      [78, 32, 41, 45, 52, 66, 85],
      [79, 32, 42, 46, 52, 66, 84],
      [80, 32, 42, 46, 52, 66, 84],
      [81, 33, 43, 47, 52, 66, 84],
      [82, 33, 44, 47, 53, 67, 83],
      [83, 34, 46, 48, 53, 68, 83],
      [84, 35, 54, 73, 82],
      [85, 35, 54, 72, 81],
      [86, 26, 26, 36, 55, 71, 80, 94, 94],
      [87, 28, 28, 37, 56, 69, 79, 92, 92],
      [88, 29, 30, 38, 58, 66, 78, 90, 91],
      [89, 30, 32, 40, 77, 88, 90],
      [90, 31, 35, 41, 76, 85, 89],
      [91, 32, 38, 43, 74, 82, 88],
      [92, 34, 41, 45, 73, 79, 86],
      [93, 35, 45, 47, 70, 75, 85],
      [94, 37, 67, 69, 83],
      [95, 38, 82],
      [96, 40, 80],
      [97, 43, 77],
      [98, 46, 74],
      [99, 51, 69],
      [100, 59, 61],
      [101, 59, 61],
      [102, 59, 61],
      [103, 59, 61],
      [104, 60, 60],
      [105, 60, 60],
      [106, 60, 60],
      [107, 60, 60],
      [108, 60, 60],
    ],
  },
  oaths: {
    path: [
      "M47 45a13 16 0 1 1 26 0a13 16 0 1 1 -26 0Z M48.7 45a11.3 14.3 0 1 0 22.6 0a11.3 14.3 0 1 0 -22.6 0Z",
      "M60 12L64 27L61.5 37L61.5 87L65 96L60 105L55 96L58.5 87L58.5 37L56 27Z",
      "M59 82C43 73 30 61 34 42C23 67 40 83 58 88Z",
      "M61 82C77 73 90 61 86 42C97 67 80 83 62 88Z",
      "M59 64C47 57 39 44 43 27C31 43 42 60 58 70Z",
      "M61 64C73 57 81 44 77 27C89 43 78 60 62 70Z",
      "M36 57L24 45L30 63Z M34 68L23 64L39 77Z M45 79L37 88L50 85Z",
      "M84 57L96 45L90 63Z M86 68L97 64L81 77Z M75 79L83 88L70 85Z",
      "M42 41L33 30L39 48Z M78 41L87 30L81 48Z",
      "M45 25L47 18L49 25L47 30Z M75 25L73 18L71 25L73 30Z",
      "M48 91Q60 95 72 91L70 95Q60 99 50 95Z",
    ].join(" "),
    rows: [
      [12, 60, 60],
      [13, 60, 60],
      [14, 60, 60],
      [15, 60, 60],
      [16, 59, 61],
      [17, 59, 61],
      [18, 47, 47, 59, 61, 73, 73],
      [19, 47, 47, 59, 61, 73, 73],
      [20, 47, 47, 58, 62, 73, 73],
      [21, 47, 47, 58, 62, 73, 73],
      [22, 46, 48, 58, 62, 72, 74],
      [23, 46, 48, 58, 62, 72, 74],
      [24, 46, 48, 57, 63, 72, 74],
      [25, 45, 49, 57, 63, 71, 75],
      [26, 46, 48, 57, 63, 72, 74],
      [27, 43, 43, 46, 48, 56, 64, 72, 74, 77, 77],
      [28, 47, 47, 57, 63, 73, 73],
      [29, 42, 42, 47, 47, 57, 63, 73, 73, 78, 78],
      [30, 33, 33, 42, 42, 47, 47, 56, 64, 73, 73, 78, 78, 87, 87],
      [31, 41, 42, 54, 66, 78, 79],
      [32, 34, 34, 40, 42, 53, 55, 58, 62, 65, 67, 78, 80, 86, 86],
      [33, 34, 35, 40, 42, 52, 53, 58, 62, 67, 68, 78, 80, 85, 86],
      [34, 35, 36, 40, 41, 51, 52, 58, 62, 68, 69, 79, 80, 84, 85],
      [35, 35, 37, 39, 41, 50, 51, 58, 62, 69, 70, 79, 81, 83, 85],
      [36, 35, 37, 39, 41, 50, 51, 59, 61, 69, 70, 79, 81, 83, 85],
      [37, 36, 41, 49, 50, 59, 61, 70, 71, 79, 84],
      [38, 36, 42, 49, 50, 59, 61, 70, 71, 78, 84],
      [39, 36, 42, 48, 49, 59, 61, 71, 72, 78, 84],
      [40, 37, 42, 48, 49, 59, 61, 71, 72, 78, 83],
      [41, 37, 42, 48, 49, 59, 61, 71, 72, 78, 83],
      [42, 34, 34, 37, 42, 48, 48, 59, 61, 72, 72, 78, 83, 86, 86],
      [43, 38, 42, 48, 48, 59, 61, 72, 72, 78, 82],
      [44, 38, 43, 48, 48, 59, 61, 72, 72, 77, 82],
      [45, 24, 24, 33, 33, 38, 43, 47, 48, 59, 61, 72, 73, 77, 82, 87, 87, 96, 96],
      [46, 25, 25, 33, 33, 39, 43, 48, 48, 59, 61, 72, 72, 77, 81, 87, 87, 95, 95],
      [47, 25, 26, 33, 33, 39, 44, 48, 48, 59, 61, 72, 72, 76, 81, 87, 87, 94, 95],
      [48, 25, 27, 32, 33, 39, 44, 48, 48, 59, 61, 72, 72, 76, 81, 87, 88, 93, 95],
      [49, 26, 28, 32, 33, 40, 44, 48, 49, 59, 61, 71, 72, 76, 80, 87, 88, 92, 94],
      [50, 26, 29, 32, 33, 40, 45, 48, 49, 59, 61, 71, 72, 75, 80, 87, 88, 91, 94],
      [51, 26, 30, 32, 33, 41, 45, 48, 49, 59, 61, 71, 72, 75, 79, 87, 88, 90, 94],
      [52, 27, 33, 41, 46, 49, 50, 59, 61, 70, 71, 74, 79, 87, 93],
      [53, 27, 33, 42, 47, 49, 50, 59, 61, 70, 71, 73, 78, 87, 93],
      [54, 27, 33, 42, 47, 50, 51, 59, 61, 69, 70, 73, 78, 87, 93],
      [55, 28, 34, 43, 48, 50, 51, 59, 61, 69, 70, 72, 77, 86, 92],
      [56, 28, 35, 43, 49, 51, 52, 59, 61, 68, 69, 71, 77, 85, 92],
      [57, 28, 36, 44, 50, 52, 53, 59, 61, 67, 68, 70, 76, 84, 92],
      [58, 29, 35, 45, 51, 53, 55, 59, 61, 65, 67, 69, 75, 85, 91],
      [59, 29, 35, 46, 52, 54, 57, 59, 61, 63, 66, 68, 74, 85, 91],
      [60, 29, 35, 47, 53, 56, 64, 67, 73, 85, 91],
      [61, 30, 36, 47, 54, 59, 61, 66, 73, 84, 90],
      [62, 30, 36, 48, 55, 59, 61, 65, 72, 84, 90],
      [63, 30, 30, 32, 37, 49, 57, 59, 61, 63, 71, 83, 88, 90, 90],
      [64, 23, 23, 32, 37, 50, 70, 83, 88, 97, 97],
      [65, 25, 25, 32, 38, 52, 68, 82, 88, 95, 95],
      [66, 26, 28, 32, 39, 53, 67, 81, 88, 92, 94],
      [67, 27, 31, 33, 39, 54, 66, 81, 87, 89, 93],
      [68, 28, 40, 55, 65, 80, 92],
      [69, 30, 41, 57, 63, 79, 90],
      [70, 31, 42, 58, 62, 78, 89],
      [71, 32, 43, 59, 61, 77, 88],
      [72, 33, 44, 59, 61, 76, 87],
      [73, 35, 45, 59, 61, 75, 85],
      [74, 36, 47, 59, 61, 73, 84],
      [75, 37, 48, 59, 61, 72, 83],
      [76, 38, 49, 59, 61, 71, 82],
      [77, 39, 50, 59, 61, 70, 81],
      [78, 40, 52, 59, 61, 68, 80],
      [79, 41, 53, 59, 61, 67, 79],
      [80, 43, 55, 59, 61, 65, 77],
      [81, 44, 57, 59, 61, 63, 76],
      [82, 43, 77],
      [83, 42, 78],
      [84, 41, 79],
      [85, 40, 80],
      [86, 39, 45, 53, 67, 75, 81],
      [87, 38, 41, 55, 65, 79, 82],
      [88, 37, 37, 58, 62, 83, 83],
      [89, 58, 62],
      [90, 58, 62],
      [91, 48, 48, 57, 63, 72, 72],
      [92, 49, 51, 57, 63, 69, 71],
      [93, 49, 71],
      [94, 50, 70],
      [95, 50, 70],
      [96, 53, 67],
      [97, 56, 64],
      [98, 57, 63],
      [99, 57, 63],
      [100, 58, 62],
      [101, 58, 62],
      [102, 59, 61],
      [103, 59, 61],
      [104, 60, 60],
      [105, 60, 60],
    ],
  },
};

function createSymbol(shape: ParticleShape): Point[] {
  const points: Point[] = [];
  for (const [y, ...spans] of GLYPHS[shape].rows) {
    for (let span = 0; span < spans.length; span += 2) {
      for (let x = spans[span]; x <= spans[span + 1]; x += 1) {
        const seed = y * 131 + x;
        // Leave air between grains so the resting sigil never becomes a solid fill.
        if (noise(seed + 273) < 0.18) continue;
        points.push({
          x: x + (noise(seed) - 0.5) * 1.3,
          y: y + (noise(seed + 91) - 0.5) * 1.3,
          size: 0.25 + Math.pow(noise(seed + 182), 1.2) * 0.43,
        });
        // A few loose grains soften the edges into drifting ash.
        if (noise(seed + 364) < 0.12) {
          const angle = noise(seed + 455) * TAU;
          const distance = 1.5 + noise(seed + 546) * 3;
          points.push({
            x: x + Math.cos(angle) * distance,
            y: y + Math.sin(angle) * distance,
            size: 0.18 + noise(seed + 637) * 0.22,
          });
        }
      }
    }
  }
  return points;
}

function dotPath(points: Point[]) {
  return points
    .map(({ x, y, size }) => {
      const r = size.toFixed(2);
      const diameter = (size * 2).toFixed(2);
      return `M${(x - size).toFixed(2)},${y.toFixed(2)}a${r},${r} 0 1,0 ${diameter},0a${r},${r} 0 1,0 -${diameter},0`;
    })
    .join("");
}

function ParticleMenuEntry({
  item,
  strength,
  radius,
}: {
  item: ParticleMenuItem;
  strength: number;
  radius: number;
}) {
  const itemRef = useRef<HTMLLIElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const points = useMemo(() => createSymbol(item.shape), [item.shape]);
  const restingPath = useMemo(() => dotPath(points), [points]);

  useEffect(() => {
    const control = itemRef.current?.querySelector<HTMLElement>("a, button");
    const svg = svgRef.current;
    const path = pathRef.current;
    if (!control || !svg || !path) return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const particles = points.map((point) => ({ ...point, vx: 0, vy: 0 }));
    const pointer = { x: CENTER, y: CENTER };
    let active = false;
    let frame = 0;
    let previousTime = 0;

    const reset = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      previousTime = 0;
      particles.forEach((particle, index) => Object.assign(particle, points[index], { vx: 0, vy: 0 }));
      path.setAttribute("d", restingPath);
    };

    const draw = (time: number) => {
      // Normalize the spring to a 60 Hz timestep, including high-refresh displays.
      const step = previousTime ? Math.min((time - previousTime) / 16.667, 2) : 1;
      previousTime = time;
      // Respond quickly to the pointer, then let the grains drift home after leaving.
      const spring = active ? 0.085 : 0.004;
      const damping = Math.pow(active ? 0.76 : 0.86, step);
      let movement = 0;
      particles.forEach((particle, index) => {
        const home = points[index];
        const dx = home.x - pointer.x;
        const dy = home.y - pointer.y;
        const distance = Math.hypot(dx, dy);
        const influence = active ? Math.pow(Math.max(0, 1 - distance / radius), 2) : 0;
        const angle = distance > 0.01 ? Math.atan2(dy, dx) : noise(index) * TAU;
        const displacement = influence * 36 * strength;
        // A slight tangential force gives the grain a curling, liquid movement.
        const targetX = home.x + (Math.cos(angle) - Math.sin(angle) * 0.35) * displacement;
        const targetY = home.y + (Math.sin(angle) + Math.cos(angle) * 0.35) * displacement;
        particle.vx = (particle.vx + (targetX - particle.x) * spring * step) * damping;
        particle.vy = (particle.vy + (targetY - particle.y) * spring * step) * damping;
        particle.x += particle.vx * step;
        particle.y += particle.vy * step;
        movement = Math.max(
          movement,
          Math.abs(targetX - particle.x),
          Math.abs(targetY - particle.y),
          Math.abs(particle.vx),
          Math.abs(particle.vy),
        );
      });

      path.setAttribute("d", dotPath(particles));
      if (movement > 0.03) {
        frame = requestAnimationFrame(draw);
      } else {
        frame = 0;
        previousTime = 0;
        if (!active) reset();
      }
    };

    const wake = () => {
      if (strength > 0 && !frame && !preference.matches && !document.hidden)
        frame = requestAnimationFrame(draw);
    };

    const move = (event: PointerEvent) => {
      const bounds = svg.getBoundingClientRect();
      if (!bounds.width || !bounds.height) return;
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 120;
      pointer.y = ((event.clientY - bounds.top) / bounds.height) * 120;
      active = true;
      wake();
    };

    const focus = () => {
      if (!control.matches(":focus-visible")) return;
      pointer.x = CENTER;
      pointer.y = CENTER;
      active = true;
      wake();
    };

    const leave = () => {
      active = false;
      if (control.matches(":focus-visible")) focus();
      wake();
    };

    const endTouch = (event: PointerEvent) => {
      if (event.pointerType !== "mouse") leave();
    };

    const motionChanged = () => {
      if (preference.matches) reset();
      else wake();
    };
    const visibilityChanged = () => {
      active = false;
      reset();
    };

    control.addEventListener("pointerenter", move);
    control.addEventListener("pointermove", move, { passive: true });
    control.addEventListener("pointerleave", leave);
    control.addEventListener("pointercancel", leave);
    control.addEventListener("pointerup", endTouch);
    control.addEventListener("focus", focus);
    control.addEventListener("blur", leave);
    preference.addEventListener("change", motionChanged);
    document.addEventListener("visibilitychange", visibilityChanged);

    return () => {
      reset();
      control.removeEventListener("pointerenter", move);
      control.removeEventListener("pointermove", move);
      control.removeEventListener("pointerleave", leave);
      control.removeEventListener("pointercancel", leave);
      control.removeEventListener("pointerup", endTouch);
      control.removeEventListener("focus", focus);
      control.removeEventListener("blur", leave);
      preference.removeEventListener("change", motionChanged);
      document.removeEventListener("visibilitychange", visibilityChanged);
    };
  }, [points, restingPath, strength, radius, item.href]);

  const content = (
    <>
      <svg
        ref={svgRef}
        viewBox="0 0 120 120"
        aria-hidden="true"
        className="pointer-events-none size-28 overflow-visible"
      >
        <path ref={pathRef} d={restingPath} fill="currentColor" />
      </svg>
      <span className="text-xs leading-none font-medium tracking-tight uppercase">{item.label}</span>
    </>
  );
  const className =
    "text-foreground flex cursor-pointer flex-col items-center gap-2 rounded-sm bg-transparent px-3 pt-1 pb-4 font-mono no-underline outline-offset-4 select-none focus-visible:outline-1 focus-visible:outline-current";

  return (
    <li ref={itemRef}>
      {item.href !== undefined ? (
        <a href={item.href} onClick={item.onSelect} className={className}>
          {content}
        </a>
      ) : (
        <button type="button" onClick={item.onSelect} className={className}>
          {content}
        </button>
      )}
    </li>
  );
}

export function ParticleMenu({
  items,
  ariaLabel = "Particle menu",
  strength = 1,
  radius = 38,
  className,
}: ParticleMenuProps) {
  const safeStrength = Number.isFinite(strength) ? Math.min(2, Math.max(0, strength)) : 1;
  const safeRadius = Number.isFinite(radius) ? Math.min(70, Math.max(10, radius)) : 38;

  return (
    <nav aria-label={ariaLabel} className={className}>
      <ul className="m-0 flex list-none flex-wrap items-center justify-center gap-x-4 gap-y-6 p-0">
        {items.map((item) => (
          <ParticleMenuEntry key={item.id} item={item} strength={safeStrength} radius={safeRadius} />
        ))}
      </ul>
    </nav>
  );
}
