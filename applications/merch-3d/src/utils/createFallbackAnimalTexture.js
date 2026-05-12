import * as THREE from 'three';

/**
 * Рисует простой контур животного на CanvasTexture при ошибке загрузки внешнего файла.
 * @param {string} animalId - Идентификатор: cat | dog | crocodile | tiger.
 * @returns {THREE.CanvasTexture} Текстура с прозрачным фоном и только обводкой.
 */
export const createFallbackAnimalTexture = (animalId) => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    const t = new THREE.CanvasTexture(canvas);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  ctx.clearRect(0, 0, size, size);
  ctx.strokeStyle = '#111111';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const cx = size / 2;
  const cy = size / 2;

  ctx.beginPath();
  switch (animalId) {
    case 'dog': {
      ctx.arc(cx, cy - 20, 70, 0.35 * Math.PI, 0.65 * Math.PI);
      ctx.arc(cx - 40, cy - 70, 28, 0.2 * Math.PI, 1.2 * Math.PI);
      ctx.arc(cx + 40, cy - 70, 28, 1.8 * Math.PI, 0.8 * Math.PI);
      ctx.moveTo(cx - 50, cy + 10);
      ctx.quadraticCurveTo(cx, cy + 90, cx + 50, cy + 10);
      break;
    }
    case 'crocodile': {
      ctx.moveTo(cx - 180, cy);
      ctx.quadraticCurveTo(cx - 60, cy - 80, cx + 140, cy - 40);
      ctx.lineTo(cx + 200, cy);
      ctx.lineTo(cx + 140, cy + 50);
      ctx.quadraticCurveTo(cx - 60, cy + 90, cx - 180, cy + 20);
      ctx.closePath();
      for (let i = 0; i < 6; i += 1) {
        ctx.moveTo(cx - 120 + i * 35, cy - 15);
        ctx.lineTo(cx - 105 + i * 35, cy + 25);
      }
      break;
    }
    case 'tiger': {
      ctx.moveTo(cx - 90, cy + 50);
      ctx.quadraticCurveTo(cx - 120, cy - 100, cx, cy - 110);
      ctx.quadraticCurveTo(cx + 120, cy - 100, cx + 90, cy + 50);
      ctx.quadraticCurveTo(cx + 40, cy + 90, cx, cy + 70);
      ctx.quadraticCurveTo(cx - 40, cy + 90, cx - 90, cy + 50);
      ctx.moveTo(cx - 60, cy - 40);
      ctx.lineTo(cx - 20, cy + 10);
      ctx.moveTo(cx + 60, cy - 40);
      ctx.lineTo(cx + 20, cy + 10);
      break;
    }
    case 'cat':
    default: {
      ctx.arc(cx, cy - 10, 72, 0.25 * Math.PI, 0.75 * Math.PI);
      ctx.moveTo(cx - 55, cy - 45);
      ctx.lineTo(cx - 75, cy - 120);
      ctx.lineTo(cx - 25, cy - 65);
      ctx.moveTo(cx + 55, cy - 45);
      ctx.lineTo(cx + 75, cy - 120);
      ctx.lineTo(cx + 25, cy - 65);
      ctx.moveTo(cx - 35, cy + 30);
      ctx.quadraticCurveTo(cx, cy + 55, cx + 35, cy + 30);
      break;
    }
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  return texture;
};
