import Phaser from 'phaser';
import { Board } from '../game/Board';
import { HoldArea } from '../game/HoldArea';
import { Tile } from '../game/Tile';
import { SoundManager, VibrationManager } from '../game/SoundManager';

const STORAGE_KEY_HIGH_SCORE = 'moms-mahjong-high-score';
const COMBO_TIME_WINDOW = 3000;

// Layout constants for mobile-first design
const LAYOUT = {
  TITLE_Y: 28,
  HOLD_AREA_Y: 75,
  STATS_Y: 155,
  BOARD_TOP_MARGIN: 180, // Space above board
  BUTTONS_BOTTOM_MARGIN: 35, // Space from bottom for buttons
  BOARD_SIDE_PADDING: 16, // Padding on sides
};

export class GameScene extends Phaser.Scene {
  private board!: Board;
  private holdArea!: HoldArea;
  private scoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private tilesText!: Phaser.GameObjects.Text;
  private holdCountText!: Phaser.GameObjects.Text;
  private score: number = 0;
  private highScore: number = 0;
  private comboCount: number = 0;
  private lastMatchTime: number = 0;
  private messageContainer!: Phaser.GameObjects.Container;
  private isProcessing: boolean = false;
  private overlayVisible: boolean = false; // Flag to block tile clicks when overlay is shown
  private soundManager: SoundManager;
  private vibrationManager: VibrationManager;

  constructor() {
    super({ key: 'GameScene' });
    this.soundManager = new SoundManager();
    this.vibrationManager = new VibrationManager();
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    // Load high score
    this.highScore = parseInt(localStorage.getItem(STORAGE_KEY_HIGH_SCORE) || '0', 10);
    
    // Background
    this.cameras.main.setBackgroundColor('#f5e6d3');
    this.createBackgroundPattern();
    
    // Ensure only topmost interactive UI elements receive clicks
    this.input.setTopOnly(true);
    
    // Title (TOP)
    this.add.text(width / 2, LAYOUT.TITLE_Y, "Mom's Mahjong 🍛", {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: '#8b4513',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Restart button (top right)
    this.createRestartButton();
    
    // Hold area (BELOW TITLE)
    this.holdArea = new HoldArea(this);
    this.holdArea.create(width / 2, LAYOUT.HOLD_AREA_Y);
    this.holdArea.onMatch = (tileType, count) => this.onHoldMatch(tileType, count);
    this.holdArea.onGameOver = () => this.onHoldAreaFull();
    
    // Stats row (BELOW HOLD AREA)
    this.createStatsRow();
    
    // Create buttons at bottom
    this.createButtons();
    
    // Calculate available space for board
    const maxBoardWidth = width - (LAYOUT.BOARD_SIDE_PADDING * 2);
    const maxBoardHeight = height - LAYOUT.BOARD_TOP_MARGIN - LAYOUT.BUTTONS_BOTTOM_MARGIN - 20;
    
    // Board center position
    const boardCenterX = width / 2;
    const boardCenterY = LAYOUT.BOARD_TOP_MARGIN + maxBoardHeight / 2;
    
    // Create board (CENTER, below stats)
    this.board = new Board(this);
    this.board.create(boardCenterX, boardCenterY, maxBoardWidth, maxBoardHeight);
    
    // Set up callbacks
    this.board.onTileSelected = (tile: Tile) => this.onTileSelected(tile);
    this.board.onTileBlocked = () => this.onTileBlocked();
    this.board.onWin = () => this.onWin();
    this.board.onTilesChanged = (remaining: number) => this.updateTilesCount(remaining);
    
    // Message container for overlays
    this.messageContainer = this.add.container(width / 2, height / 2);
    this.messageContainer.setDepth(3000);
    this.messageContainer.setVisible(false);
    
    // Initial counts
    this.updateTilesCount(this.board.getRemainingCount());
    this.updateHoldCount();
    
    // Initialize audio on first user interaction
    this.input.once('pointerdown', () => {
      this.soundManager.init();
    });
  }

  private createBackgroundPattern(): void {
    const { width, height } = this.cameras.main;
    const graphics = this.add.graphics();
    graphics.setDepth(-10);
    
    // Subtle dot pattern
    graphics.fillStyle(0xd4c4a8, 0.25);
    for (let x = 0; x < width; x += 30) {
      for (let y = 0; y < height; y += 30) {
        graphics.fillCircle(x, y, 1.5);
      }
    }
  }

  private createRestartButton(): void {
    const { width } = this.cameras.main;
    
    const restartBtn = this.add.text(width - 15, 18, '🔄', {
      fontSize: '24px'
    }).setOrigin(1, 0)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.newGame())
      .on('pointerover', () => {
        this.tweens.add({ targets: restartBtn, scaleX: 1.15, scaleY: 1.15, duration: 80 });
      })
      .on('pointerout', () => {
        this.tweens.add({ targets: restartBtn, scaleX: 1, scaleY: 1, duration: 80 });
      });
    
    restartBtn.setDepth(100);
  }

  private createStatsRow(): void {
    const { width } = this.cameras.main;
    const y = LAYOUT.STATS_Y;
    
    // Score (left)
    this.scoreText = this.add.text(15, y, 'Score: 0', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#5d4037',
      fontStyle: 'bold'
    });
    
    // Hold count (center)
    this.holdCountText = this.add.text(width / 2, y, 'Hold: 0/4', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#5d4037'
    }).setOrigin(0.5, 0);
    
    // Tiles remaining (center-right)
    this.tilesText = this.add.text(width / 2 + 60, y, 'Tiles: 44', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#5d4037'
    }).setOrigin(0, 0);
    
    // High score (right)
    this.highScoreText = this.add.text(width - 15, y, `Best: ${this.highScore}`, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#8b4513'
    }).setOrigin(1, 0);
  }

  private createButtons(): void {
    const { width, height } = this.cameras.main;
    const buttonY = height - LAYOUT.BUTTONS_BOTTOM_MARGIN;
    const buttonStyle = {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#8b4513',
      padding: { x: 14, y: 7 }
    };
    
    // Hint button
    const hintBtn = this.add.text(width / 2 - 55, buttonY, '💡 Hint', buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.showHint())
      .on('pointerover', () => hintBtn.setStyle({ backgroundColor: '#a0522d' }))
      .on('pointerout', () => hintBtn.setStyle({ backgroundColor: '#8b4513' }));
    
    // Shuffle button
    const shuffleBtn = this.add.text(width / 2 + 55, buttonY, '🔀 Shuffle', buttonStyle)
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.shuffleBoard())
      .on('pointerover', () => shuffleBtn.setStyle({ backgroundColor: '#a0522d' }))
      .on('pointerout', () => shuffleBtn.setStyle({ backgroundColor: '#8b4513' }));
  }

  private async onTileSelected(tile: Tile): Promise<void> {
    // Block clicks when overlay (win/game over screen) is visible
    if (this.overlayVisible) return;
    if (this.isProcessing) return;
    
    if (!this.holdArea.canAddTile()) {
      this.showTemporaryMessage('Hold area is full!', '#ff6b35');
      tile.shake();
      this.soundManager.playInvalid();
      this.vibrationManager.invalid();
      return;
    }
    
    this.isProcessing = true;
    
    // Play click sound/vibration
    this.soundManager.playClick();
    this.vibrationManager.click();
    
    // Remove tile from board and add to hold area
    await this.board.removeTile(tile);
    await this.holdArea.addTile(tile);
    
    this.updateHoldCount();
    
    // Check for WIN: board empty AND hold area empty (after match processing)
    const boardEmpty = this.board.getRemainingCount() === 0;
    const holdEmpty = this.holdArea.getTileCount() === 0;
    
    if (boardEmpty && holdEmpty) {
      this.showWinScreen();
    }
    
    this.isProcessing = false;
  }

  private onTileBlocked(): void {
    // Play invalid sound/vibration when tapping a blocked tile
    this.soundManager.playInvalid();
    this.vibrationManager.invalid();
  }

  private onHoldMatch(_tileType: number, _count: number): void {
    const now = Date.now();
    
    // Play match sound and vibration
    this.soundManager.playMatch();
    this.vibrationManager.match();
    
    // Combo check
    if (now - this.lastMatchTime < COMBO_TIME_WINDOW) {
      this.comboCount++;
    } else {
      this.comboCount = 1;
    }
    this.lastMatchTime = now;
    
    // Calculate score
    const baseScore = 100;
    const multiplier = this.comboCount;
    const points = baseScore * multiplier;
    
    this.score += points;
    this.scoreText.setText(`Score: ${this.score}`);
    
    // Update high score
    if (this.score > this.highScore) {
      this.highScore = this.score;
      localStorage.setItem(STORAGE_KEY_HIGH_SCORE, this.highScore.toString());
      this.highScoreText.setText(`Best: ${this.highScore}`);
    }
    
    this.showFloatingScore(points, multiplier);
    this.updateHoldCount();
    
    // Flash effect
    this.cameras.main.flash(80, 255, 215, 0, false);
  }

  private showFloatingScore(points: number, multiplier: number): void {
    const { width } = this.cameras.main;
    
    let text = `+${points}`;
    let color = '#4caf50';
    let fontSize = '20px';
    
    if (multiplier > 1) {
      text = `+${points} (${multiplier}x!)`;
      color = '#ff6b35';
      fontSize = '24px';
    }
    
    const floatingText = this.add.text(width / 2, LAYOUT.STATS_Y - 15, text, {
      fontSize: fontSize,
      fontFamily: 'Arial, sans-serif',
      color: color,
      fontStyle: 'bold',
      stroke: '#ffffff',
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(2500);
    
    this.tweens.add({
      targets: floatingText,
      y: floatingText.y - 40,
      alpha: 0,
      scaleX: 1.2,
      scaleY: 1.2,
      duration: 1000,
      ease: 'Quad.easeOut',
      onComplete: () => floatingText.destroy()
    });
  }

  private updateHoldCount(): void {
    const count = this.holdArea.getTileCount();
    this.holdCountText.setText(`Hold: ${count}/4`);
    
    if (count >= 3) {
      this.holdCountText.setStyle({ color: '#ff6b35' });
    } else if (count >= 2) {
      this.holdCountText.setStyle({ color: '#ff9800' });
    } else {
      this.holdCountText.setStyle({ color: '#5d4037' });
    }
  }

  private updateTilesCount(remaining: number): void {
    this.tilesText.setText(`Tiles: ${remaining}`);
  }

  private showHint(): void {
    const holdTypeCounts = this.holdArea.getTypesInHold();
    const hintTile = this.board.findHintTile(holdTypeCounts);
    
    if (hintTile) {
      this.board.showHint(hintTile);
      this.showTemporaryMessage('Try this tile! 💡', '#4caf50');
    } else {
      this.showTemporaryMessage('No good moves! Try shuffle.', '#ff6b35');
    }
  }

  private shuffleBoard(): void {
    this.board.shuffle();
    this.showTemporaryMessage('Tiles shuffled! 🔀', '#5d4037');
  }

  private newGame(): void {
    this.score = 0;
    this.comboCount = 0;
    this.lastMatchTime = 0;
    this.isProcessing = false;
    this.scoreText.setText('Score: 0');
    
    // Clear hold area
    this.holdArea.clear();
    this.updateHoldCount();
    
    // Recreate board
    this.board.destroy();
    
    const { width, height } = this.cameras.main;
    const maxBoardWidth = width - (LAYOUT.BOARD_SIDE_PADDING * 2);
    const maxBoardHeight = height - LAYOUT.BOARD_TOP_MARGIN - LAYOUT.BUTTONS_BOTTOM_MARGIN - 20;
    const boardCenterX = width / 2;
    const boardCenterY = LAYOUT.BOARD_TOP_MARGIN + maxBoardHeight / 2;
    
    this.board = new Board(this);
    this.board.create(boardCenterX, boardCenterY, maxBoardWidth, maxBoardHeight);
    
    this.board.onTileSelected = (tile: Tile) => this.onTileSelected(tile);
    this.board.onTileBlocked = () => this.onTileBlocked();
    this.board.onTilesChanged = (remaining: number) => this.updateTilesCount(remaining);
    
    this.updateTilesCount(this.board.getRemainingCount());
    
    // Hide overlay and keep blocking clicks for a short delay to prevent click-through
    this.messageContainer.setVisible(false);
    // Keep overlayVisible true for a moment to block the current click from selecting tiles
    this.time.delayedCall(100, () => {
      this.overlayVisible = false;
    });
  }

  private onWin(): void {
    // Win is now checked in onTileSelected after hold area processes
    // This callback is kept for compatibility but the main win check is elsewhere
    if (this.holdArea.getTileCount() === 0) {
      this.showWinScreen();
    }
  }

  private onHoldAreaFull(): void {
    this.showGameOverScreen();
  }

  private showWinScreen(): void {
    // Block tile clicks while overlay is visible
    this.overlayVisible = true;
    
    // Play win sound and vibration
    this.soundManager.playWin();
    this.vibrationManager.win();
    
    const { width, height } = this.cameras.main;
    this.messageContainer.removeAll(true);
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.6);
    overlay.fillRect(-width / 2, -height / 2, width, height);
    this.messageContainer.add(overlay);
    
    // Congratulations header
    const congratsText = this.add.text(0, -90, '🎊 Congratulations! 🎊', {
      fontSize: '28px',
      fontFamily: 'Georgia, serif',
      color: '#00ff88',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.messageContainer.add(congratsText);
    
    const winText = this.add.text(0, -50, 'You Completed the Game!', {
      fontSize: '22px',
      fontFamily: 'Georgia, serif',
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.messageContainer.add(winText);
    
    const scoreDisplay = this.add.text(0, -10, `Final Score: ${this.score}`, {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.messageContainer.add(scoreDisplay);
    
    if (this.score === this.highScore && this.score > 0) {
      const newHighText = this.add.text(0, 25, '🏆 NEW HIGH SCORE! 🏆', {
        fontSize: '18px',
        fontFamily: 'Arial, sans-serif',
        color: '#ffd700',
        fontStyle: 'bold'
      }).setOrigin(0.5);
      this.messageContainer.add(newHighText);
      
      this.tweens.add({
        targets: newHighText,
        scaleX: 1.08,
        scaleY: 1.08,
        duration: 400,
        yoyo: true,
        repeat: -1
      });
    }
    
    // Celebration emojis
    const emojis = ['🍛', '🥭', '🌶️', '☕', '🍳', '🧁'];
    for (let i = 0; i < 8; i++) {
      const emoji = this.add.text(
        (Math.random() - 0.5) * width * 0.7,
        (Math.random() - 0.5) * height * 0.5,
        emojis[i % emojis.length],
        { fontSize: '28px' }
      ).setOrigin(0.5).setAlpha(0);
      
      this.messageContainer.add(emoji);
      
      this.tweens.add({
        targets: emoji,
        alpha: 1,
        y: emoji.y - 30,
        duration: 400,
        delay: i * 80,
        ease: 'Bounce.easeOut'
      });
    }
    
    const playAgainBtn = this.add.text(0, 80, '🎮 Play Again', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#4caf50',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5)
      .setDepth(5000) // High depth to ensure button is clickable above tiles
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.messageContainer.setVisible(false);
        this.newGame();
      })
      .on('pointerover', () => playAgainBtn.setStyle({ backgroundColor: '#66bb6a' }))
      .on('pointerout', () => playAgainBtn.setStyle({ backgroundColor: '#4caf50' }));
    
    this.messageContainer.add(playAgainBtn);
    this.messageContainer.setVisible(true);
    
    this.messageContainer.setScale(0.5);
    this.messageContainer.setAlpha(0);
    this.tweens.add({
      targets: this.messageContainer,
      scale: 1,
      alpha: 1,
      duration: 350,
      ease: 'Back.easeOut'
    });
  }

  private showGameOverScreen(): void {
    // Block tile clicks while overlay is visible
    this.overlayVisible = true;
    
    // Play game over sound and vibration
    this.soundManager.playGameOver();
    this.vibrationManager.gameOver();
    
    const { width, height } = this.cameras.main;
    this.messageContainer.removeAll(true);
    
    const overlay = this.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(-width / 2, -height / 2, width, height);
    this.messageContainer.add(overlay);
    
    const gameOverText = this.add.text(0, -50, '😢 Game Over', {
      fontSize: '32px',
      fontFamily: 'Georgia, serif',
      color: '#ff6b35',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    this.messageContainer.add(gameOverText);
    
    const reasonText = this.add.text(0, -5, 'Hold area full - no matches!', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#e0e0e0'
    }).setOrigin(0.5);
    this.messageContainer.add(reasonText);
    
    const scoreDisplay = this.add.text(0, 30, `Score: ${this.score}`, {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.messageContainer.add(scoreDisplay);
    
    const tryAgainBtn = this.add.text(0, 80, '🔄 Try Again', {
      fontSize: '20px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#ff6b35',
      padding: { x: 20, y: 10 }
    }).setOrigin(0.5)
      .setDepth(5000) // High depth to ensure button is clickable above tiles
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => {
        this.messageContainer.setVisible(false);
        this.newGame();
      })
      .on('pointerover', () => tryAgainBtn.setStyle({ backgroundColor: '#ff8a50' }))
      .on('pointerout', () => tryAgainBtn.setStyle({ backgroundColor: '#ff6b35' }));
    
    this.messageContainer.add(tryAgainBtn);
    this.messageContainer.setVisible(true);
    
    this.messageContainer.setScale(0.8);
    this.messageContainer.setAlpha(0);
    this.tweens.add({
      targets: this.messageContainer,
      scale: 1,
      alpha: 1,
      duration: 250,
      ease: 'Back.easeOut'
    });
  }

  private showTemporaryMessage(text: string, color: string): void {
    const { width } = this.cameras.main;
    
    const msg = this.add.text(width / 2, LAYOUT.BOARD_TOP_MARGIN - 10, text, {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: color,
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(1500);
    
    this.tweens.add({
      targets: msg,
      alpha: 0,
      y: msg.y - 15,
      duration: 1200,
      delay: 400,
      onComplete: () => msg.destroy()
    });
  }
}
