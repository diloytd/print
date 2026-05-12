import * as THREE from 'three';
import { PRODUCT_LAYOUT } from '../constants/merch.js';

const DEFAULT_WIDTH_FRACTION = 1 / 3;
const PRINT_GEOMETRY_SEGMENTS = 28;
const CONFORM_RAY_OFFSET_FACTOR = 0.35;
const PLANE_NORMAL = new THREE.Vector3(0, 0, 1);

/**
 * Возвращает видимые mesh-объекты модели, по которым можно искать точку контакта принта.
 * Если задан targetMeshNames, raycast ограничивается этими частями модели (например, купол зонта).
 *
 * @param {THREE.Object3D} model - Центрированная 3D-модель изделия.
 * @param {string[] | undefined} targetMeshNames - Имена mesh-объектов, доступных для печати.
 * @returns {THREE.Mesh[]} Mesh-объекты с геометрией.
 */
const getPrintableMeshes = (model, targetMeshNames) => {
  const meshes = [];

  model.traverse((child) => {
    if (!child.isMesh || !child.geometry || child.visible === false) return;
    if (targetMeshNames?.length && !targetMeshNames.includes(child.name)) return;
    meshes.push(child);
  });

  return meshes;
};

/**
 * Находит реальную точку поверхности модели лучом из bbox в сторону изделия.
 *
 * @param {THREE.Object3D} model - Центрированная 3D-модель изделия.
 * @param {THREE.Box3} box - Bounding box центрированной модели.
 * @param {THREE.Vector3} size - Размер bounding box.
 * @param {string[] | undefined} targetMeshNames - Имена mesh-объектов, доступных для печати.
 * @param {[number, number, number]} anchor - Нормализованная точка bbox, X/Y задают место печати.
 * @returns {{ point: THREE.Vector3, normal: THREE.Vector3 } | null} Точка и нормаль поверхности.
 */
const findSurfaceHit = (model, box, size, targetMeshNames, anchor) => {
  const meshes = getPrintableMeshes(model, targetMeshNames);
  if (!meshes.length) return null;

  model.updateMatrixWorld(true);

  const origin = new THREE.Vector3(
    box.min.x + size.x * anchor[0],
    box.min.y + size.y * anchor[1],
    box.max.z + size.z * 0.25,
  );
  const raycaster = new THREE.Raycaster(origin, new THREE.Vector3(0, 0, -1), 0, size.z * 2);
  const [hit] = raycaster.intersectObjects(meshes, true);

  if (!hit?.face) return null;

  const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
  const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();
  if (normal.z < 0) normal.negate();

  return { point: hit.point.clone(), normal };
};

/**
 * Возвращает нормаль пересечённой поверхности в том же направлении, что и лицевая сторона принта.
 *
 * @param {THREE.Intersection} hit - Результат raycast-пересечения с mesh-объектом.
 * @param {THREE.Vector3} printNormal - Лицевая нормаль принта.
 * @returns {THREE.Vector3} Нормаль поверхности, направленная наружу от изделия.
 */
const getSurfaceNormal = (hit, printNormal) => {
  const normalMatrix = new THREE.Matrix3().getNormalMatrix(hit.object.matrixWorld);
  const normal = hit.face.normal.clone().applyMatrix3(normalMatrix).normalize();

  if (normal.dot(printNormal) < 0) normal.negate();

  return normal;
};

/**
 * Рассчитывает реальный отступ принта от поверхности.
 * Для сильно масштабированных GLB, например зонта, абсолютный offsetZ почти не виден,
 * поэтому можно задать долю от ширины принта через surfaceOffsetFraction.
 *
 * @param {object} printCfg - Настройки принта из PRODUCT_LAYOUT.
 * @param {number} printWidth - Ширина принта в локальных координатах модели.
 * @returns {number} Отступ от поверхности в локальных координатах модели.
 */
const getPrintSurfaceOffset = (printCfg, printWidth) => {
  const absoluteOffset = printCfg.offsetZ ?? 0.002;
  const relativeOffset = printWidth * (printCfg.surfaceOffsetFraction ?? 0);

  return Math.max(absoluteOffset, relativeOffset);
};

/**
 * Удаляет треугольники принта, вершины которых не попали raycast-ом в поверхность изделия.
 * Это убирает торчащие плоские полигоны на краях выпуклых моделей вроде кепки.
 *
 * @param {THREE.BufferGeometry} geometry - Геометрия сегментированного принта.
 * @param {boolean[]} vertexHits - Карта вершин, успешно спроецированных на изделие.
 * @returns {void}
 */
const clipMissedSurfaceTriangles = (geometry, vertexHits) => {
  const indexAttribute = geometry.getIndex();
  if (!indexAttribute) return;

  const clippedIndices = [];

  for (let index = 0; index < indexAttribute.count; index += 3) {
    const a = indexAttribute.getX(index);
    const b = indexAttribute.getX(index + 1);
    const c = indexAttribute.getX(index + 2);

    if (!vertexHits[a] || !vertexHits[b] || !vertexHits[c]) continue;

    clippedIndices.push(a, b, c);
  }

  geometry.setIndex(clippedIndices);
};

/**
 * Создаёт сегментированную геометрию принта, вершины которой проецируются на поверхность изделия.
 *
 * Нужна для круглых и выпуклых товаров: кружки, кепки и зонта. UV остаются от исходной плоскости,
 * поэтому текстура не ломается, а сама сетка повторяет форму модели с минимальным отступом.
 *
 * @param {THREE.Object3D} model - Центрированная 3D-модель изделия.
 * @param {string} productType - Идентификатор типа изделия.
 * @param {{ position: [number, number, number], scale: [number, number, number], rotation: [number, number, number] }} printTransform - Расчётная позиция, размер и поворот принта.
 * @returns {THREE.BufferGeometry} Геометрия принта в локальных координатах модели.
 */
export const createConformedPrintGeometry = (model, productType, printTransform) => {
  const printCfg = PRODUCT_LAYOUT[productType]?.print ?? {};
  const targetMeshNames = printCfg.targetMeshNames;
  const meshes = getPrintableMeshes(model, targetMeshNames);
  const geometry = new THREE.PlaneGeometry(1, 1, PRINT_GEOMETRY_SEGMENTS, PRINT_GEOMETRY_SEGMENTS);
  const positionAttribute = geometry.getAttribute('position');
  const printPosition = new THREE.Vector3(...printTransform.position);
  const printRotation = new THREE.Euler(...printTransform.rotation);
  const printScale = new THREE.Vector3(...printTransform.scale);
  const offsetZ = getPrintSurfaceOffset(printCfg, printScale.x);
  const printNormal = PLANE_NORMAL.clone().applyEuler(printRotation).normalize();
  const rayDirection = printNormal.clone().negate();
  const rayOffset = Math.max(printScale.x, printScale.y) * CONFORM_RAY_OFFSET_FACTOR;
  const raycaster = new THREE.Raycaster(undefined, rayDirection, 0, rayOffset * 2 + offsetZ * 4);
  const vertex = new THREE.Vector3();
  const vertexHits = Array(positionAttribute.count).fill(false);

  model.updateMatrixWorld(true);

  for (let index = 0; index < positionAttribute.count; index += 1) {
    vertex.fromBufferAttribute(positionAttribute, index);
    vertex.multiply(printScale).applyEuler(printRotation).add(printPosition);

    raycaster.set(vertex.clone().add(printNormal.clone().multiplyScalar(rayOffset)), rayDirection);
    const [hit] = meshes.length ? raycaster.intersectObjects(meshes, true) : [];

    if (hit?.face) {
      const surfaceNormal = getSurfaceNormal(hit, printNormal);
      vertex.copy(hit.point).add(surfaceNormal.multiplyScalar(offsetZ));
      vertexHits[index] = true;
    }

    positionAttribute.setXYZ(index, vertex.x, vertex.y, vertex.z);
  }

  clipMissedSurfaceTriangles(geometry, vertexHits);
  positionAttribute.needsUpdate = true;
  geometry.computeVertexNormals();
  geometry.computeBoundingBox();
  geometry.computeBoundingSphere();

  return geometry;
};

/**
 * Вычисляет позицию, масштаб и поворот плоского принта по реальной поверхности модели.
 *
 * Точка крепления задаётся через PRODUCT_LAYOUT[productType].print.anchor: X/Y выбирают место
 * в bbox, затем луч находит ближайший треугольник изделия, а плоскость принта совмещается с
 * нормалью этого треугольника.
 *
 * @param {THREE.Object3D} model - Центрированная 3D-модель изделия.
 * @param {string} productType - Идентификатор типа изделия.
 * @returns {{ position: [number, number, number], scale: [number, number, number], rotation: [number, number, number] }}
 */
export const calculatePrintPosition = (model, productType) => {
  const box = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  box.getSize(size);

  const printCfg = PRODUCT_LAYOUT[productType]?.print ?? {};
  const offsetX = printCfg.offsetX ?? 0;
  const offsetY = printCfg.offsetY ?? 0;
  const anchor = printCfg.anchor ?? [0.5, 0.5, 1];
  const targetMeshNames = printCfg.targetMeshNames;
  const widthFraction = printCfg.widthFraction ?? DEFAULT_WIDTH_FRACTION;
  const printWidth = size.x * widthFraction;
  const printHeight = printWidth;
  const offsetZ = getPrintSurfaceOffset(printCfg, printWidth);
  const surfaceHit = findSurfaceHit(model, box, size, targetMeshNames, anchor);

  const rotPrint = printCfg.rotation ?? [0, 0, 0];
  const fallbackPoint = new THREE.Vector3(
    box.min.x + size.x * anchor[0],
    box.min.y + size.y * anchor[1],
    box.min.z + size.z * anchor[2],
  );
  const point = surfaceHit?.point ?? fallbackPoint;
  const normal = surfaceHit?.normal ?? PLANE_NORMAL;
  const quaternion = new THREE.Quaternion().setFromUnitVectors(PLANE_NORMAL, normal);
  const manualRotation = new THREE.Euler(...rotPrint);
  const rotation = new THREE.Euler().setFromQuaternion(quaternion.multiply(new THREE.Quaternion().setFromEuler(manualRotation)));
  const position = point.clone().add(normal.clone().multiplyScalar(offsetZ));

  return {
    position: [position.x + offsetX, position.y + offsetY, position.z],
    scale: [printWidth, printHeight, 1],
    rotation: [rotation.x, rotation.y, rotation.z],
  };
};
