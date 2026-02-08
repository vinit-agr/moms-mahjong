import Phaser from 'phaser';
import { Tile, TileData } from './Tile';

interface HoldSlot {
  x: number;
  y: number;
  tile: Tile | null;
  background: Phaser.GameObjects.Graphics;
}

export class HoldArea {
  private scene: Phaser.Scene;
  private slots: HoldSlot[] = [];
  private container: Phaser.GameObjects.Container;
  private slotScale: number = 0.75; // Scale for tiles in hold area
  
  public static readonly SLOT_COUNT = 4;
  public static readonly SLOT_WIDTH = 44;
  public static readonly SLOT_HEIGHT = 56;
  public static readonly SLOT_GAP = 8;
  
  public onMatch: ((tileType: number, count: number) => void) | null = null;
  public onGameOver: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setDepth(1500);
  }

  public create(centerX: number, y: number): void {
    const totalWidth = HoldArea.SLOT_COUNT * HoldArea.SLOT_WIDTH + 
                       (HoldArea.SLOT_COUNT - 1) * HoldArea.SLOT_GAP;
    const startX = centerX - totalWidth / 2;
    
    // Create background panel
    const panelPadding = 10;
    const panel = this.scene.add.graphics();
    panel.fillStyle(0x8b4513, 0.9);
    panel.fillRoundedRect(
      startX - panelPadding,
      y - panelPadding,
      totalWidth + panelPadding * 2,
      HoldArea.SLOT_HEIGHT + panelPadding * 2,
      10
    );
    panel.lineStyle(2, 0x5d4037, 1);
    panel.strokeRoundedRect(
      startX - panelPadding,
      y - panelPadding,
      totalWidth + panelPadding * 2,
      HoldArea.SLOT_HEIGHT + panelPadding * 2,
      10
    );
    this.container.add(panel);
    
    // Create slots
    for (let i = 0; i < HoldArea.SLOT_COUNT; i++) {
      const slotX = startX + i * (HoldArea.SLOT_WIDTH + HoldArea.SLOT_GAP);
      
      const bg = this.scene.add.graphics();
      bg.fillStyle(0xfff8e7, 0.5);
      bg.fillRoundedRect(slotX, y, HoldArea.SLOT_WIDTH, HoldArea.SLOT_HEIGHT, 6);
      bg.lineStyle(1.5, 0xd4c4a8, 0.8);
      bg.strokeRoundedRect(slotX, y, HoldArea.SLOT_WIDTH, HoldArea.SLOT_HEIGHT, 6);
      this.container.add(bg);
      
      // Store the CENTER position of the slot for tile placement
      this.slots.push({
        x: slotX + HoldArea.SLOT_WIDTH / 2,
        y: y + HoldArea.SLOT_HEIGHT / 2,
        tile: null,
        background: bg
      });
    }
  }

  public canAddTile(): boolean {
    return this.slots.some(slot => slot.tile === null);
  }

  public getTileCount(): number {
    return this.slots.filter(slot => slot.tile !== null).length;
  }

  public async addTile(originalTile: Tile): Promise<{ matched: boolean; matchCount: number }> {
    // Find first empty slot
    const emptySlotIndex = this.slots.findIndex(slot => slot.tile === null);
    if (emptySlotIndex === -1) {
      return { matched: false, matchCount: 0 };
    }
    
    const slot = this.slots[emptySlotIndex];
    const tileType = originalTile.tileData.tileType;
    const emoji = originalTile.tileData.emoji;
    
    // Create a new tile for the hold area
    const holdTileData: TileData = {
      col: 0,
      row: 0,
      layer: 0,
      tileType: tileType,
      emoji: emoji
    };
    
    // Start tile at original position (world coordinates)
    const startX = originalTile.x + (originalTile.parentContainer?.x || 0);
    const startY = originalTile.y + (originalTile.parentContainer?.y || 0);
    
    // Create hold tile with the slot scale
    const holdTile = new Tile(this.scene, startX, startY, holdTileData, this.slotScale);
    holdTile.setDepth(2000);
    holdTile.disableInteractive();
    
    slot.tile = holdTile;
    
    // Calculate target position (tile positioned by its top-left, but slot position is center)
    const targetX = slot.x - (holdTile.tileWidth / 2);
    const targetY = slot.y - (holdTile.tileHeight / 2);
    
    // Animate tile moving to slot
    await new Promise<void>((resolve) => {
      this.scene.tweens.add({
        targets: holdTile,
        x: targetX,
        y: targetY,
        duration: 200,
        ease: 'Back.easeOut',
        onComplete: () => resolve()
      });
    });
    
    // Check for pair match (2 matching tiles)
    const matchingSlots = this.slots.filter(
      s => s.tile !== null && s.tile.tileData.tileType === tileType
    );
    
    if (matchingSlots.length >= 2) {
      // Match found! Remove the pair
      await this.handleMatch(matchingSlots.slice(0, 2), tileType);
      return { matched: true, matchCount: 2 };
    }
    
    // Check for game over (all 4 slots full with no matching pair)
    if (!this.canAddTile()) {
      const typeCounts = new Map<number, number>();
      for (const s of this.slots) {
        if (s.tile) {
          const t = s.tile.tileData.tileType;
          typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
        }
      }
      
      const hasMatch = Array.from(typeCounts.values()).some(count => count >= 2);
      if (!hasMatch && this.onGameOver) {
        this.onGameOver();
      }
    }
    
    return { matched: false, matchCount: 0 };
  }

  private async handleMatch(matchingSlots: HoldSlot[], tileType: number): Promise<void> {
    // Glow effect
    for (const slot of matchingSlots) {
      if (slot.tile) {
        slot.tile.showMatchGlow();
      }
    }
    
    await new Promise(resolve => this.scene.time.delayedCall(180, resolve));
    
    // Remove tiles
    const removePromises = matchingSlots.map(async (slot) => {
      if (slot.tile) {
        await slot.tile.removeWithAnimation();
        slot.tile.destroy();
        slot.tile = null;
      }
    });
    
    await Promise.all(removePromises);
    
    // Compact remaining tiles to the left
    await this.compactSlots();
    
    if (this.onMatch) {
      this.onMatch(tileType, 2);
    }
  }

  private async compactSlots(): Promise<void> {
    // Collect all remaining tiles
    const tiles: Tile[] = [];
    for (const slot of this.slots) {
      if (slot.tile) {
        tiles.push(slot.tile);
        slot.tile = null;
      }
    }
    
    // Reassign to leftmost slots with animation
    const movePromises: Promise<void>[] = [];
    for (let i = 0; i < tiles.length; i++) {
      const tile = tiles[i];
      const slot = this.slots[i];
      slot.tile = tile;
      
      const targetX = slot.x - (tile.tileWidth / 2);
      const targetY = slot.y - (tile.tileHeight / 2);
      
      movePromises.push(new Promise<void>((resolve) => {
        this.scene.tweens.add({
          targets: tile,
          x: targetX,
          y: targetY,
          duration: 120,
          ease: 'Quad.easeOut',
          onComplete: () => resolve()
        });
      }));
    }
    
    await Promise.all(movePromises);
  }

  public getTypesInHold(): Map<number, number> {
    const typeCounts = new Map<number, number>();
    for (const slot of this.slots) {
      if (slot.tile) {
        const t = slot.tile.tileData.tileType;
        typeCounts.set(t, (typeCounts.get(t) || 0) + 1);
      }
    }
    return typeCounts;
  }

  public clear(): void {
    for (const slot of this.slots) {
      if (slot.tile) {
        slot.tile.destroy();
        slot.tile = null;
      }
    }
  }

  public destroy(): void {
    this.clear();
    this.container.destroy();
  }
}
