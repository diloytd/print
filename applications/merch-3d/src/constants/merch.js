import mugGltfUrl from '../../public/models/mug.gltf?url';

const printModules = import.meta.glob('../img/*.{svg,png,jpg,jpeg,webp}', {
  eager: true,
  import: 'default',
  query: '?url',
});

/**
 * Возвращает имя файла без расширения из Vite glob-пути.
 * Используется как человекочитаемая база для id и подписи нового принта.
 * @param {string} path - Путь вида `../img/name.svg`.
 * @returns {string} Имя файла без расширения.
 */
const getPrintNameFromPath = (path) => {
  const fileName = path.split('/').pop() ?? 'print';
  return fileName.replace(/\.[^.]+$/, '');
};

/**
 * Создаёт стабильный id принта из имени файла.
 * @param {string} printName - Имя файла без расширения.
 * @param {number} index - Индекс принта в отсортированном списке.
 * @returns {string} Id для выбора принта в UI.
 */
const createPrintId = (printName, index) => {
  const slug = printName
    .toLowerCase()
    .replace(/[^a-z0-9а-яё]+/gi, '-')
    .replace(/^-+|-+$/g, '');

  return slug || `print-${index + 1}`;
};

/**
 * Создаёт подпись принта из имени файла.
 * @param {string} printName - Имя файла без расширения.
 * @returns {string} Подпись для кнопки выбора принта.
 */
const createPrintLabel = (printName) => printName.replace(/[-_]+/g, ' ');

/**
 * Локальные GLB-модели (лежат в public/models/).
 * Источники:
 *   umbrella — poly.pizza/m/4uOho8GeU_w (CC-BY, Open umbrella раскрытый)
 *   cap      — poly.pizza/m/aaC5GgcWEhM (CC-BY, Poly by Google)
 *   tshirt   — github.com/adrianhajdin/project_threejs_ai (MIT)
 *   mug      — pmndrs/market-assets mug/model.gltf (чистая кружка, без стола, без текстур)
 *   bag      — poly.pizza/m/ykZ23x9d6p (CC-BY)
 */
export const PRODUCT_GLTF_URL = {
  umbrella: '/models/umbrella.glb',
  cap:      '/models/cap.glb',
  tshirt:   '/models/tshirt.glb',
  mug:      mugGltfUrl,
  bag:      '/models/bag.glb',
};

export const PRODUCT_TYPES = [
  { id: 'umbrella', label: 'Зонт' },
  { id: 'cap', label: 'Кепка' },
  { id: 'tshirt', label: 'Футболка' },
  { id: 'mug', label: 'Кружка' },
];

/**
 * PBR-параметры материала для каждого типа изделия.
 * Применяются принудительно поверх значений из GLB,
 * чтобы конвертированные Phong→PBR модели выглядели реалистично.
 * @type {Record<string, { roughness: number, metalness: number }>}
 */
export const PRODUCT_MATERIAL = {
  umbrella: { roughness: 0.82, metalness: 0.0 },  // дерево + ткань
  cap:      { roughness: 0.88, metalness: 0.0 },  // ткань
  tshirt:   { roughness: 0.92, metalness: 0.0 },  // хлопок
  mug:      { roughness: 0.30, metalness: 0.0 },  // керамика
  bag:      { roughness: 0.75, metalness: 0.0 },  // бумага
  custom:   { roughness: 0.72, metalness: 0.0 },  // пользовательская модель
};

/**
 * Раскладка сцены: масштаб/положение/поворот корневой группы модели и параметры принта.
 * Координаты модели — в метрах сцены до применения modelScale (Euler XYZ, радианы).
 * Принт: anchor — нормализованная точка bbox [0..1] по X/Y/Z, где [0.5, 0.5, 1]
 * означает центр передней грани. Это держит принт привязанным к конкретной точке изделия.
 *
 * @type {Record<string, {
 *   modelScale: number,
 *   modelPosition?: [number, number, number],
 *   modelRotation?: [number, number, number],
 *   print: {
 *     offsetZ: number,
 *     offsetX?: number,
 *     offsetY?: number,
 *     anchor?: [number, number, number],
 *     targetMeshNames?: string[],
 *     widthFraction?: number,
 *     surfaceOffsetFraction?: number,
 *     rotation?: [number, number, number],
 *   },
 * }>}
 */
export const PRODUCT_LAYOUT = {
  umbrella: {
    modelScale: 0.000015,
    modelPosition: [0, -0.06, 0],
    modelRotation: [0.1, 0.72, 0],
    print: {
      anchor: [0.5, 0.8, 1],
      offsetZ: 0.0032,
      targetMeshNames: ['Cylinder003_1', 'Cylinder003_1_1'],
      widthFraction: 0.216,
      surfaceOffsetFraction: 0.03,
      rotation: [0, 0, 0.04],
    },
  },
  cap: {
    modelScale: 0.55,
    modelPosition: [0, -0.05, 0],
    modelRotation: [-0.18, 0.42, 0],
    print: { anchor: [0.5, 0.69, 1], offsetZ: 0.0013, widthFraction: 0.19, surfaceOffsetFraction: 0.008, rotation: [0.12, 0, 0] },
  },
  tshirt: {
    modelScale: 2.15,
    modelPosition: [0, -0.12, 0],
    modelRotation: [0.06, -0.28, 0],
    print: { anchor: [0.5, 0.55, 1], offsetZ: 0.005, widthFraction: 0.264, rotation: [0.05, 0, 0] },
  },
  mug: {
    modelScale: 0.9,
    modelPosition: [0, -0.08, 0],
    modelRotation: [0, -0.55, 0],
    print: { anchor: [0.5, 0.48, 1], offsetZ: 0.0014, widthFraction: 0.264, rotation: [0, 0.08, 0] },
  },
  bag: {
    modelScale: 1.08,
    modelPosition: [0, -0.1, 0],
    modelRotation: [0.05, 0.2, 0],
    print: { anchor: [0.5, 0.54, 1], offsetZ: 0.0009, widthFraction: 0.288, rotation: [0.03, 0, 0] },
  },
  custom: {
    modelScale: 1,
    modelPosition: [0, 0, 0],
    modelRotation: [0, 0, 0],
    print: { anchor: [0.5, 0.55, 1], offsetZ: 0.004, widthFraction: 0.32 },
  },
};

export const ANIMALS = Object.entries(printModules)
  .sort(([pathA], [pathB]) => pathA.localeCompare(pathB))
  .map(([path, src], index) => {
    const printName = getPrintNameFromPath(path);

    return {
      id: createPrintId(printName, index),
      label: createPrintLabel(printName),
      src,
    };
  });

export const DEFAULT_PRINT_ID = ANIMALS[0]?.id ?? 'print-1';

export const PRODUCT_SWATCHES = [
  { id: 'red', label: 'Красный', hex: '#c62828' },
  { id: 'blue', label: 'Синий', hex: '#1565c0' },
  { id: 'green', label: 'Зелёный', hex: '#2e7d32' },
  { id: 'black', label: 'Чёрный', hex: '#212121' },
  { id: 'white', label: 'Белый', hex: '#eceff1' },
  { id: 'yellow', label: 'Жёлтый', hex: '#f9a825' },
];
