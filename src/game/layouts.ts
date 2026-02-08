// Tile position definition
export interface TilePosition {
  col: number;
  row: number;
  layer: number;
}

// Mobile-friendly pyramid layout: 44 tiles (22 pairs)
// Smaller grid that fits on mobile screens
export const MOBILE_LAYOUT: TilePosition[] = [
  // Layer 0 (bottom) - 6x5 = 30 tiles
  // Row 0
  { col: 0, row: 0, layer: 0 },
  { col: 1, row: 0, layer: 0 },
  { col: 2, row: 0, layer: 0 },
  { col: 3, row: 0, layer: 0 },
  { col: 4, row: 0, layer: 0 },
  { col: 5, row: 0, layer: 0 },
  // Row 1
  { col: 0, row: 1, layer: 0 },
  { col: 1, row: 1, layer: 0 },
  { col: 2, row: 1, layer: 0 },
  { col: 3, row: 1, layer: 0 },
  { col: 4, row: 1, layer: 0 },
  { col: 5, row: 1, layer: 0 },
  // Row 2
  { col: 0, row: 2, layer: 0 },
  { col: 1, row: 2, layer: 0 },
  { col: 2, row: 2, layer: 0 },
  { col: 3, row: 2, layer: 0 },
  { col: 4, row: 2, layer: 0 },
  { col: 5, row: 2, layer: 0 },
  // Row 3
  { col: 0, row: 3, layer: 0 },
  { col: 1, row: 3, layer: 0 },
  { col: 2, row: 3, layer: 0 },
  { col: 3, row: 3, layer: 0 },
  { col: 4, row: 3, layer: 0 },
  { col: 5, row: 3, layer: 0 },
  // Row 4
  { col: 0, row: 4, layer: 0 },
  { col: 1, row: 4, layer: 0 },
  { col: 2, row: 4, layer: 0 },
  { col: 3, row: 4, layer: 0 },
  { col: 4, row: 4, layer: 0 },
  { col: 5, row: 4, layer: 0 },

  // Layer 1 - 4x3 = 12 tiles (centered)
  { col: 1, row: 1, layer: 1 },
  { col: 2, row: 1, layer: 1 },
  { col: 3, row: 1, layer: 1 },
  { col: 4, row: 1, layer: 1 },
  { col: 1, row: 2, layer: 1 },
  { col: 2, row: 2, layer: 1 },
  { col: 3, row: 2, layer: 1 },
  { col: 4, row: 2, layer: 1 },
  { col: 1, row: 3, layer: 1 },
  { col: 2, row: 3, layer: 1 },
  { col: 3, row: 3, layer: 1 },
  { col: 4, row: 3, layer: 1 },

  // Layer 2 - 1x2 = 2 tiles (top)
  { col: 2, row: 2, layer: 2 },
  { col: 3, row: 2, layer: 2 },
];
// Total: 44 tiles = 22 pairs

// Indian Kitchen emoji tiles - 22 unique types to match pairs
export const TILE_EMOJIS: string[] = [
  // Spices
  '🌶️', '🧄', '🧅', '🫚', '🌿', '🍃',
  // Vegetables
  '🥔', '🍅', '🥕', '🍆', '🥒', '🌽',
  // Fruits
  '🥭', '🍌', '🍇', '🍎',
  // Utensils/Food
  '🍳', '🍛', '🧁', '☕', '🍵', '🥛',
];

// Get the layout
export function getLayout(): TilePosition[] {
  return MOBILE_LAYOUT;
}

export function getTileCount(): number {
  return MOBILE_LAYOUT.length;
}
