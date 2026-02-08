import Phaser from 'phaser';

export interface TileData {
  col: number;
  row: number;
  layer: number;
  tileType: number;
  emoji: string;
}

export class Tile extends Phaser.GameObjects.Container {
  public tileData: TileData;
  private background: Phaser.GameObjects.Graphics;
  private emojiText: Phaser.GameObjects.Text;
  private glowGraphics: Phaser.GameObjects.Graphics;
  private isSelected: boolean = false;
  private isFree: boolean = true;
  private isRemoved: boolean = false;

  // Base tile dimensions (will be scaled)
  public static readonly BASE_WIDTH = 48;
  public static readonly BASE_HEIGHT = 60;
  public static readonly LAYER_OFFSET_X = 3;
  public static readonly LAYER_OFFSET_Y = 3;

  // Actual dimensions after scaling
  public tileWidth: number;
  public tileHeight: number;

  constructor(scene: Phaser.Scene, x: number, y: number, data: TileData, scale: number = 1) {
    super(scene, x, y);
    
    this.tileData = data;
    this.tileWidth = Tile.BASE_WIDTH * scale;
    this.tileHeight = Tile.BASE_HEIGHT * scale;
    
    // Create glow effect (behind everything)
    this.glowGraphics = scene.add.graphics();
    this.add(this.glowGraphics);
    
    // Create tile shadow
    const shadow = scene.add.graphics();
    shadow.fillStyle(0x000000, 0.25);
    shadow.fillRoundedRect(2 * scale, 2 * scale, this.tileWidth, this.tileHeight, 6 * scale);
    this.add(shadow);
    
    // Create tile background
    this.background = scene.add.graphics();
    this.drawBackground(0xfff8e7);
    this.add(this.background);
    
    // Create emoji text - sized relative to tile
    const fontSize = Math.floor(24 * scale);
    this.emojiText = scene.add.text(this.tileWidth / 2, this.tileHeight / 2, data.emoji, {
      fontSize: `${fontSize}px`,
      fontFamily: 'Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji, sans-serif',
    });
    this.emojiText.setOrigin(0.5);
    this.add(this.emojiText);
    
    // Set size and make interactive with proper hit area
    this.setSize(this.tileWidth, this.tileHeight);
    
    // Use a rectangle hit area that matches the tile exactly
    const hitArea = new Phaser.Geom.Rectangle(0, 0, this.tileWidth, this.tileHeight);
    this.setInteractive({ 
      hitArea: hitArea,
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true 
    });
    
    // Set depth based on layer (higher layer = on top)
    this.updateDepth();
    
    scene.add.existing(this);
  }

  public updateDepth(): void {
    // Layer is most important, then row (lower rows appear in front), then column
    this.setDepth(this.tileData.layer * 1000 + this.tileData.row * 10 + this.tileData.col);
  }

  private drawBackground(color: number): void {
    this.background.clear();
    
    // Main tile face
    this.background.fillStyle(color, 1);
    this.background.fillRoundedRect(0, 0, this.tileWidth, this.tileHeight, 6);
    
    // Lighter top edge
    this.background.fillStyle(0xffffff, 0.4);
    this.background.fillRoundedRect(0, 0, this.tileWidth, 3, { tl: 6, tr: 6, bl: 0, br: 0 });
    
    // Border
    this.background.lineStyle(1.5, 0xd4c4a8, 1);
    this.background.strokeRoundedRect(0, 0, this.tileWidth, this.tileHeight, 6);
  }

  public setFreeState(free: boolean): void {
    this.isFree = free;
    
    if (free) {
      this.setAlpha(1);
      this.setInteractive({ useHandCursor: true });
    } else {
      this.setAlpha(0.5);
      // Keep interactive for shake feedback, but we'll check isFree in click handler
    }
  }

  public getIsFree(): boolean {
    return this.isFree;
  }

  public getIsRemoved(): boolean {
    return this.isRemoved;
  }

  public select(): void {
    if (!this.isFree || this.isRemoved) return;
    
    this.isSelected = true;
    this.drawGlow(0xffd700, 0.8);
    this.drawBackground(0xfffacd);
    
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.08,
      scaleY: 1.08,
      duration: 100,
      ease: 'Back.easeOut'
    });
  }

  public deselect(): void {
    this.isSelected = false;
    this.glowGraphics.clear();
    this.drawBackground(0xfff8e7);
    
    this.scene.tweens.add({
      targets: this,
      scaleX: 1,
      scaleY: 1,
      duration: 100,
      ease: 'Back.easeOut'
    });
  }

  public getIsSelected(): boolean {
    return this.isSelected;
  }

  private drawGlow(color: number, alpha: number): void {
    this.glowGraphics.clear();
    const glowSize = 4;
    this.glowGraphics.fillStyle(color, alpha * 0.3);
    this.glowGraphics.fillRoundedRect(-glowSize, -glowSize, this.tileWidth + glowSize * 2, this.tileHeight + glowSize * 2, 10);
    this.glowGraphics.fillStyle(color, alpha * 0.5);
    this.glowGraphics.fillRoundedRect(-glowSize/2, -glowSize/2, this.tileWidth + glowSize, this.tileHeight + glowSize, 8);
  }

  public shake(): void {
    this.scene.tweens.add({
      targets: this,
      x: this.x - 4,
      duration: 50,
      yoyo: true,
      repeat: 2,
      ease: 'Sine.easeInOut'
    });
  }

  public showHint(): void {
    this.drawGlow(0x00ff00, 0.7);
    
    this.scene.time.delayedCall(1500, () => {
      if (!this.isSelected && !this.isRemoved) {
        this.glowGraphics.clear();
      }
    });
  }

  public showMatchGlow(): void {
    this.drawGlow(0xffd700, 1);
    
    this.scene.tweens.add({
      targets: this,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 100,
      yoyo: true,
      repeat: 1,
      ease: 'Sine.easeInOut'
    });
  }

  public updateEmoji(emoji: string, tileType: number): void {
    this.tileData.emoji = emoji;
    this.tileData.tileType = tileType;
    this.emojiText.setText(emoji);
  }

  public getEmoji(): string {
    return this.tileData.emoji;
  }

  public async removeWithAnimation(): Promise<void> {
    this.isRemoved = true;
    this.disableInteractive();
    
    this.createMatchParticles();
    
    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 250,
        ease: 'Back.easeIn',
        onComplete: () => {
          this.setVisible(false);
          resolve();
        }
      });
    });
  }

  private createMatchParticles(): void {
    const colors = [0xffd700, 0xff6b35, 0x00d4aa, 0xff69b4];
    
    for (let i = 0; i < 6; i++) {
      const particle = this.scene.add.graphics();
      const color = colors[Math.floor(Math.random() * colors.length)];
      particle.fillStyle(color, 1);
      particle.fillCircle(0, 0, 3 + Math.random() * 3);
      
      // Position at tile center in world coordinates
      particle.setPosition(
        this.x + this.tileWidth / 2,
        this.y + this.tileHeight / 2
      );
      particle.setDepth(2000);
      
      const angle = (Math.PI * 2 * i) / 6;
      const distance = 30 + Math.random() * 20;
      
      this.scene.tweens.add({
        targets: particle,
        x: particle.x + Math.cos(angle) * distance,
        y: particle.y + Math.sin(angle) * distance,
        alpha: 0,
        scale: 0.5,
        duration: 350,
        ease: 'Quad.easeOut',
        onComplete: () => particle.destroy()
      });
    }
  }

  public matches(other: Tile): boolean {
    return this.tileData.tileType === other.tileData.tileType;
  }
}
