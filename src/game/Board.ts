import Phaser from 'phaser';
import { Tile, TileData } from './Tile';
import { getLayout, TILE_EMOJIS } from './layouts';

export class Board {
  private scene: Phaser.Scene;
  private tiles: Tile[] = [];
  private container: Phaser.GameObjects.Container;
  private tileScale: number = 1;
  private pointerHandler: ((pointer: Phaser.Input.Pointer) => void) | null = null;
  
  // Callbacks
  public onTileSelected: ((tile: Tile) => void) | null = null;
  public onTileBlocked: ((tile: Tile) => void) | null = null;
  public onWin: (() => void) | null = null;
  public onTilesChanged: ((remaining: number) => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
  }

  public create(centerX: number, centerY: number, maxWidth: number, maxHeight: number): void {
    const layout = getLayout();
    
    // Calculate board dimensions at base scale
    let maxCol = 0, maxRow = 0, maxLayer = 0;
    for (const pos of layout) {
      maxCol = Math.max(maxCol, pos.col);
      maxRow = Math.max(maxRow, pos.row);
      maxLayer = Math.max(maxLayer, pos.layer);
    }
    
    // Natural board size (at scale = 1)
    const naturalWidth = (maxCol + 1) * Tile.BASE_WIDTH + maxLayer * Tile.LAYER_OFFSET_X;
    const naturalHeight = (maxRow + 1) * Tile.BASE_HEIGHT + maxLayer * Tile.LAYER_OFFSET_Y;
    
    // Calculate scale to fit within available space
    this.tileScale = Math.min(
      maxWidth / naturalWidth,
      maxHeight / naturalHeight,
      1.0 // Don't scale up
    );
    
    // Actual tile dimensions after scaling
    const scaledTileWidth = Tile.BASE_WIDTH * this.tileScale;
    const scaledTileHeight = Tile.BASE_HEIGHT * this.tileScale;
    const scaledLayerX = Tile.LAYER_OFFSET_X * this.tileScale;
    const scaledLayerY = Tile.LAYER_OFFSET_Y * this.tileScale;
    
    // Calculate actual board size
    const boardWidth = (maxCol + 1) * scaledTileWidth + maxLayer * scaledLayerX;
    const boardHeight = (maxRow + 1) * scaledTileHeight + maxLayer * scaledLayerY;
    
    // Calculate offset to center the board
    const offsetX = centerX - boardWidth / 2;
    const offsetY = centerY - boardHeight / 2;
    
    // Keep container at origin - tiles will be positioned in world coordinates
    this.container.setPosition(0, 0);
    
    // Generate tile types ensuring proper pairs
    const tileTypes = this.generateTileTypesForPairs(layout.length);
    
    // Create tiles with WORLD coordinates (offset baked in)
    for (let i = 0; i < layout.length; i++) {
      const pos = layout[i];
      const tileType = tileTypes[i];
      
      // Calculate tile position in WORLD coordinates
      const localX = pos.col * scaledTileWidth + pos.layer * scaledLayerX;
      const localY = pos.row * scaledTileHeight - pos.layer * scaledLayerY;
      
      // Add board offset to get world position
      const worldX = offsetX + localX;
      const worldY = offsetY + localY;
      
      const tileData: TileData = {
        col: pos.col,
        row: pos.row,
        layer: pos.layer,
        tileType: tileType,
        emoji: TILE_EMOJIS[tileType]
      };
      
      // Create tile WITHOUT individual pointer handlers
      const tile = new Tile(this.scene, worldX, worldY, tileData, this.tileScale);
      // Don't set interactive on tiles - we'll use global pointer handling
      tile.disableInteractive();
      
      this.container.add(tile);
      this.tiles.push(tile);
    }
    
    // Sort tiles so higher layers render on top
    this.container.sort('depth');
    
    // Set up global pointer handler for tile clicks
    this.setupPointerHandler();
    
    this.updateFreeTiles();
    this.notifyTilesChanged();
  }

  private setupPointerHandler(): void {
    // Remove any existing handler
    if (this.pointerHandler) {
      this.scene.input.off('pointerdown', this.pointerHandler);
    }
    
    // Create new handler
    this.pointerHandler = (pointer: Phaser.Input.Pointer) => {
      const clickedTile = this.findTileAtPosition(pointer.x, pointer.y);
      if (clickedTile) {
        this.onTileClick(clickedTile);
      }
    };
    
    this.scene.input.on('pointerdown', this.pointerHandler);
  }

  private findTileAtPosition(x: number, y: number): Tile | null {
    // Find all tiles that contain this point
    const matchingTiles: Tile[] = [];
    
    for (const tile of this.tiles) {
      if (tile.getIsRemoved()) continue;
      
      // Check if point is within tile bounds
      const tileLeft = tile.x;
      const tileRight = tile.x + tile.tileWidth;
      const tileTop = tile.y;
      const tileBottom = tile.y + tile.tileHeight;
      
      if (x >= tileLeft && x <= tileRight && y >= tileTop && y <= tileBottom) {
        matchingTiles.push(tile);
      }
    }
    
    if (matchingTiles.length === 0) return null;
    
    // Return the tile with highest layer (topmost visually)
    matchingTiles.sort((a, b) => b.tileData.layer - a.tileData.layer);
    return matchingTiles[0];
  }

  private generateTileTypesForPairs(count: number): number[] {
    const pairCount = Math.floor(count / 2);
    const types: number[] = [];
    
    for (let i = 0; i < pairCount; i++) {
      const type = i % TILE_EMOJIS.length;
      types.push(type, type);
    }
    
    while (types.length < count) {
      types.push(0);
    }
    
    // Fisher-Yates shuffle
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    
    return types;
  }

  private onTileClick(tile: Tile): void {
    if (tile.getIsRemoved()) return;
    
    if (!tile.getIsFree()) {
      tile.shake();
      if (this.onTileBlocked) {
        this.onTileBlocked(tile);
      }
      return;
    }
    
    if (this.onTileSelected) {
      this.onTileSelected(tile);
    }
  }

  public async removeTile(tile: Tile): Promise<void> {
    await tile.removeWithAnimation();
    
    this.updateFreeTiles();
    this.notifyTilesChanged();
    
    const remainingTiles = this.tiles.filter(t => !t.getIsRemoved());
    if (remainingTiles.length === 0) {
      if (this.onWin) this.onWin();
    }
  }

  private updateFreeTiles(): void {
    const activeTiles = this.tiles.filter(t => !t.getIsRemoved());
    
    for (const tile of activeTiles) {
      const isFree = this.checkTileFree(tile, activeTiles);
      tile.setFreeState(isFree);
    }
  }

  private checkTileFree(tile: Tile, activeTiles: Tile[]): boolean {
    const { col, row, layer } = tile.tileData;
    
    // Rule 1: Check if any tile is directly on top (higher layer, overlapping position)
    for (const other of activeTiles) {
      if (other === tile) continue;
      const od = other.tileData;
      
      if (od.layer <= layer) continue;
      
      const colDiff = Math.abs(od.col - col);
      const rowDiff = Math.abs(od.row - row);
      
      if (colDiff < 1 && rowDiff < 1) {
        return false;
      }
    }
    
    // Rule 2: Check if BOTH left AND right sides are blocked
    let leftBlocked = false;
    let rightBlocked = false;
    
    for (const other of activeTiles) {
      if (other === tile) continue;
      const od = other.tileData;
      
      if (od.layer !== layer) continue;
      
      const rowDiff = Math.abs(od.row - row);
      if (rowDiff >= 1) continue;
      
      if (Math.abs(od.col - (col - 1)) < 0.1) {
        leftBlocked = true;
      }
      
      if (Math.abs(od.col - (col + 1)) < 0.1) {
        rightBlocked = true;
      }
    }
    
    return !leftBlocked || !rightBlocked;
  }

  public getFreeTiles(): Tile[] {
    return this.tiles.filter(t => !t.getIsRemoved() && t.getIsFree());
  }

  public getRemainingTiles(): Tile[] {
    return this.tiles.filter(t => !t.getIsRemoved());
  }

  public getRemainingCount(): number {
    return this.tiles.filter(t => !t.getIsRemoved()).length;
  }

  public findHintTile(holdTypeCounts: Map<number, number>): Tile | null {
    const freeTiles = this.getFreeTiles();
    const remainingTiles = this.getRemainingTiles();
    
    // Priority 1: Find a tile that matches something in the hold area
    for (const tile of freeTiles) {
      const tileType = tile.tileData.tileType;
      const holdCount = holdTypeCounts.get(tileType) || 0;
      
      if (holdCount >= 1) {
        return tile;
      }
    }
    
    // Priority 2: Find a tile that has a matching free tile on the board
    for (const tile of freeTiles) {
      const tileType = tile.tileData.tileType;
      
      const matchingFreeTile = freeTiles.find(t => 
        t !== tile && t.tileData.tileType === tileType
      );
      
      if (matchingFreeTile) {
        return tile;
      }
    }
    
    // Priority 3: Find any tile that has a pair somewhere on board
    for (const tile of freeTiles) {
      const tileType = tile.tileData.tileType;
      const boardCount = remainingTiles.filter(t => t.tileData.tileType === tileType).length;
      
      if (boardCount >= 2) {
        return tile;
      }
    }
    
    return null;
  }

  public showHint(tile: Tile): void {
    tile.showHint();
  }

  public shuffle(): void {
    const activeTiles = this.tiles.filter(t => !t.getIsRemoved());
    
    const types = activeTiles.map(t => t.tileData.tileType);
    
    for (let i = types.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [types[i], types[j]] = [types[j], types[i]];
    }
    
    for (let i = 0; i < activeTiles.length; i++) {
      const tile = activeTiles[i];
      const newType = types[i];
      tile.updateEmoji(TILE_EMOJIS[newType], newType);
      
      tile.setScale(0.85);
      this.scene.tweens.add({
        targets: tile,
        scaleX: 1,
        scaleY: 1,
        duration: 180,
        ease: 'Back.easeOut',
        delay: i * 8
      });
    }
    
    this.updateFreeTiles();
    this.notifyTilesChanged();
  }

  private notifyTilesChanged(): void {
    if (this.onTilesChanged) {
      this.onTilesChanged(this.getRemainingCount());
    }
  }

  public getTileScale(): number {
    return this.tileScale;
  }

  public destroy(): void {
    // Remove pointer handler
    if (this.pointerHandler) {
      this.scene.input.off('pointerdown', this.pointerHandler);
      this.pointerHandler = null;
    }
    
    for (const tile of this.tiles) {
      tile.destroy();
    }
    this.tiles = [];
    this.container.destroy();
  }
}
