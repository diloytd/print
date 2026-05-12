import { useEffect, useState } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { ANIMALS } from '../constants/merch.js';
import { createFallbackAnimalTexture } from '../utils/createFallbackAnimalTexture.js';

const BACKGROUND_THRESHOLD = 218;
const BACKGROUND_COLOR_TOLERANCE = 42;

/**
 * Проверяет, похож ли пиксель на светлый фон принта.
 * Используется только для удаления фонового прямоугольника JPG/PNG, а не для изменения контура.
 * @param {Uint8ClampedArray} data - RGBA-буфер canvas.
 * @param {number} index - Индекс R-канала пикселя в буфере.
 * @returns {boolean} true, если пиксель можно считать фоном.
 */
const isLightBackgroundPixel = (data, index) => {
  const red = data[index];
  const green = data[index + 1];
  const blue = data[index + 2];
  const alpha = data[index + 3];
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);

  return alpha > 0 && red > BACKGROUND_THRESHOLD && green > BACKGROUND_THRESHOLD && blue > BACKGROUND_THRESHOLD && max - min < BACKGROUND_COLOR_TOLERANCE;
};

/**
 * Делает прозрачным только светлый фон, связанный с краями изображения.
 * Такой flood fill удаляет белый прямоугольник вокруг кота/собаки, но не вырезает светлые области внутри закрытого контура.
 * @param {THREE.Texture} texture - Исходная загруженная текстура.
 * @returns {THREE.CanvasTexture} Текстура с прозрачным фоном.
 */
const removePrintBackground = (texture) => {
  const image = texture.image;
  const width = image.naturalWidth || image.videoWidth || image.width;
  const height = image.naturalHeight || image.videoHeight || image.height;
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });

  canvas.width = width;
  canvas.height = height;
  ctx.drawImage(image, 0, 0, width, height);

  const imageData = ctx.getImageData(0, 0, width, height);
  const { data } = imageData;
  const visited = new Uint8Array(width * height);
  const queue = [];

  /**
   * Добавляет пиксель в очередь flood fill, если он ещё не обработан.
   * @param {number} x - X-координата пикселя.
   * @param {number} y - Y-координата пикселя.
   * @returns {void}
   */
  const enqueue = (x, y) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;

    const pixelIndex = y * width + x;
    if (visited[pixelIndex]) return;

    visited[pixelIndex] = 1;
    queue.push([x, y]);
  };

  for (let x = 0; x < width; x += 1) {
    enqueue(x, 0);
    enqueue(x, height - 1);
  }

  for (let y = 0; y < height; y += 1) {
    enqueue(0, y);
    enqueue(width - 1, y);
  }

  while (queue.length) {
    const [x, y] = queue.pop();
    const pixelIndex = y * width + x;
    const dataIndex = pixelIndex * 4;

    if (!isLightBackgroundPixel(data, dataIndex)) continue;

    data[dataIndex + 3] = 0;
    enqueue(x + 1, y);
    enqueue(x - 1, y);
    enqueue(x, y + 1);
    enqueue(x, y - 1);
  }

  ctx.putImageData(imageData, 0, 0);

  const transparentTexture = new THREE.CanvasTexture(canvas);
  transparentTexture.colorSpace = THREE.SRGBColorSpace;
  transparentTexture.needsUpdate = true;
  texture.dispose();

  return transparentTexture;
};

/**
 * Асинхронно грузит текстуру принта и удаляет светлый фоновый прямоугольник.
 * При ошибке подставляет контур с `CanvasTexture`.
 * @param {string} animalId - Выбранный принт из `src/img`.
 * @param {string | null} customPrintUrl - `objectURL` своего файла или `null`.
 * @returns {THREE.Texture | null} Текстура или `null` до первого успешного применения.
 */
export const usePrintTexture = (animalId, customPrintUrl) => {
  const invalidate = useThree((state) => state.invalidate);
  const [map, setMap] = useState(null);

  useEffect(() => {
    let alive = true;
    const loader = new THREE.TextureLoader();
    let loadedTex = null;

    /**
     * Освобождает GPU-память текстуры.
     * @param {THREE.Texture | null} tex - Текстура или null.
     */
    const dispose = (tex) => {
      if (tex && typeof tex.dispose === 'function') tex.dispose();
    };

    /**
     * Применяет загруженную текстуру к состоянию и перерисовывает canvas.
     * @param {THREE.Texture} tex - Новая текстура.
     */
    const apply = (tex) => {
      if (!alive) {
        dispose(tex);
        return;
      }
      const preparedTexture = removePrintBackground(tex);
      dispose(loadedTex);
      loadedTex = preparedTexture;
      setMap(preparedTexture);
      invalidate();
    };

    /**
     * Fallback: контур на canvas.
     */
    const onFail = () => {
      apply(createFallbackAnimalTexture(animalId));
    };

    if (customPrintUrl) {
      loader.load(customPrintUrl, apply, undefined, onFail);
    } else {
      const entry = ANIMALS.find((a) => a.id === animalId);
      if (!entry?.src) onFail();
      else loader.load(entry.src, apply, undefined, onFail);
    }

    return () => {
      alive = false;
      dispose(loadedTex);
      loadedTex = null;
    };
  }, [animalId, customPrintUrl, invalidate]);

  return map;
};
