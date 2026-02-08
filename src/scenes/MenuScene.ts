import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const { width, height } = this.cameras.main;
    
    // Background
    this.cameras.main.setBackgroundColor('#f5e6d3');
    
    // Decorative emojis floating around
    this.createFloatingEmojis();
    
    // Title container
    const titleY = height * 0.28;
    
    // Main title
    this.add.text(width / 2, titleY - 20, "Mom's Mahjong", {
      fontSize: '36px',
      fontFamily: 'Georgia, serif',
      color: '#8b4513',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    // Subtitle
    this.add.text(width / 2, titleY + 25, '🍛 Indian Kitchen Edition 🍛', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#a0522d'
    }).setOrigin(0.5);
    
    // Description
    this.add.text(width / 2, titleY + 60, 'A relaxing tile-matching game', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#5d4037',
      fontStyle: 'italic'
    }).setOrigin(0.5);
    
    // Play button
    const playBtn = this.add.text(width / 2, height * 0.52, '▶️ Play', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffffff',
      backgroundColor: '#4caf50',
      padding: { x: 32, y: 14 }
    }).setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.startGame())
      .on('pointerover', () => {
        playBtn.setStyle({ backgroundColor: '#66bb6a' });
        this.tweens.add({
          targets: playBtn,
          scale: 1.05,
          duration: 100
        });
      })
      .on('pointerout', () => {
        playBtn.setStyle({ backgroundColor: '#4caf50' });
        this.tweens.add({
          targets: playBtn,
          scale: 1,
          duration: 100
        });
      });
    
    // Pulse animation on play button
    this.tweens.add({
      targets: playBtn,
      scale: 1.03,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
    
    // How to play
    this.add.text(width / 2, height * 0.68, 'How to Play:', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#5d4037',
      fontStyle: 'bold'
    }).setOrigin(0.5);
    
    this.add.text(width / 2, height * 0.78, 'Tap free tiles to add to hold area\nMatch pairs to clear them\nDon\'t fill hold with 4 different tiles!', {
      fontSize: '13px',
      fontFamily: 'Arial, sans-serif',
      color: '#795548',
      align: 'center',
      lineSpacing: 6
    }).setOrigin(0.5);
    
    // Credits
    this.add.text(width / 2, height - 25, 'Made with ❤️ for Mom', {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      color: '#a0522d'
    }).setOrigin(0.5);
  }

  private createFloatingEmojis(): void {
    const { width, height } = this.cameras.main;
    const emojis = ['🌶️', '🧄', '🥔', '🍅', '🥭', '🍳', '☕', '🍛', '🧁', '🍯'];
    
    for (let i = 0; i < 12; i++) {
      const emoji = this.add.text(
        Math.random() * width,
        Math.random() * height,
        emojis[Math.floor(Math.random() * emojis.length)],
        { fontSize: '20px' }
      ).setOrigin(0.5).setAlpha(0.25).setDepth(-1);
      
      // Float animation
      this.tweens.add({
        targets: emoji,
        y: emoji.y + (Math.random() * 30 - 15),
        x: emoji.x + (Math.random() * 20 - 10),
        duration: 3000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
      
      // Subtle rotation
      this.tweens.add({
        targets: emoji,
        angle: Math.random() * 15 - 7,
        duration: 4000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });
    }
  }

  private startGame(): void {
    // Fade out transition
    this.cameras.main.fadeOut(250, 245, 230, 211);
    
    this.time.delayedCall(250, () => {
      this.scene.start('GameScene');
    });
  }
}
