import Phaser from 'phaser';
import { MenuScene } from './scenes/MenuScene';
import { GameScene } from './scenes/GameScene';

// Mobile-first responsive canvas sizing
function getGameConfig(): Phaser.Types.Core.GameConfig {
  // Target mobile portrait mode
  const maxWidth = 400;
  const maxHeight = 700;
  
  // Use available viewport size, capped to max
  let width = Math.min(window.innerWidth, maxWidth);
  let height = Math.min(window.innerHeight, maxHeight);
  
  // Ensure minimum playable size
  width = Math.max(width, 320);
  height = Math.max(height, 500);
  
  return {
    type: Phaser.AUTO,
    width: Math.floor(width),
    height: Math.floor(height),
    parent: 'game-container',
    backgroundColor: '#f5e6d3',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [MenuScene, GameScene],
    input: {
      activePointers: 2,
    },
    render: {
      pixelArt: false,
      antialias: true,
    },
  };
}

// Initialize game
new Phaser.Game(getGameConfig());

// Prevent context menu on right-click
document.addEventListener('contextmenu', (e) => e.preventDefault());

// Prevent zoom on double-tap (mobile)
document.addEventListener('touchstart', (e) => {
  if (e.touches.length > 1) {
    e.preventDefault();
  }
}, { passive: false });

let lastTouchEnd = 0;
document.addEventListener('touchend', (e) => {
  const now = Date.now();
  if (now - lastTouchEnd <= 300) {
    e.preventDefault();
  }
  lastTouchEnd = now;
}, { passive: false });

console.log("🍛 Mom's Mahjong loaded!");
