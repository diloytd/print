import { useLayoutEffect, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PRODUCT_GLTF_URL, PRODUCT_LAYOUT, PRODUCT_MATERIAL } from '../../constants/merch.js';
import { usePrintTexture } from '../../hooks/usePrintTexture.js';
import { calculatePrintPosition, createConformedPrintGeometry } from '../../utils/calculatePrintPosition.js';

export const VIEWER_MODEL_TARGET_SIZE = 9.45;

/**
 * Плоский mesh с текстурой принта на поверхности модели.
 *
 * @param {object} props - Параметры принта.
 * @param {THREE.BufferGeometry | null} props.geometry - Геометрия принта, спроецированная на поверхность изделия.
 * @param {string} props.animalId - Идентификатор выбранного встроенного SVG-принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @param {number} props.printRotationDeg - Угол поворота текстуры принта в градусах.
 * @returns {JSX.Element | null} Mesh принта или null, если текстура ещё не готова.
 */
export const PrintMesh = ({ geometry, animalId, customPrintUrl, printRotationDeg = 0 }) => {
  const map = usePrintTexture(animalId, customPrintUrl);

  useLayoutEffect(() => {
    if (!map) return;

    map.center.set(0.5, 0.5);
    map.rotation = THREE.MathUtils.degToRad(printRotationDeg);
    map.needsUpdate = true;
  }, [map, printRotationDeg]);

  if (!map || !geometry) return null;

  return (
    <mesh geometry={geometry}>
      <meshStandardMaterial
        map={map}
        transparent
        alphaTest={0.06}
        side={THREE.DoubleSide}
        depthWrite={false}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
        toneMapped={false}
      />
    </mesh>
  );
};

/**
 * Подготавливает геометрию модели один раз после загрузки: сваривает вершины, пересчитывает нормали и центрирует объект.
 * Не должна вызываться при смене цвета, иначе привязанный принт может визуально смещаться.
 * @param {THREE.Object3D} model - Клонированная GLTF-сцена изделия.
 * @returns {void}
 */
export const prepareModelGeometry = (model) => {
  model.position.set(0, 0, 0);

  model.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    // Сварка вершин нужна для GLTF/FBX-моделей с дублированными рёбрами.
    child.geometry = mergeVertices(child.geometry, 1e-4);
    child.geometry.computeVertexNormals();
  });

  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  box.getCenter(center);
  model.position.sub(center);
};

/**
 * Применяет цвет и PBR-настройки к материалам изделия без изменения геометрии и положения принта.
 * @param {THREE.Object3D} model - Клонированная GLTF-сцена изделия.
 * @param {string} productColor - CSS hex-цвет изделия.
 * @param {{ roughness: number, metalness: number }} pbr - PBR-параметры материала.
 * @returns {void}
 */
export const applyProductMaterial = (model, productColor, pbr) => {
  model.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((mat) => {
      if (!mat) return;

      mat.map = null;
      mat.emissiveMap = null;
      mat.side = THREE.DoubleSide;
      mat.flatShading = false;
      if (mat.color) mat.color.set(productColor);
      if (mat.emissive) mat.emissive.set(0x000000);

      if (mat.isMeshStandardMaterial || mat.isMeshPhysicalMaterial) {
        mat.roughness = pbr.roughness;
        mat.metalness = pbr.metalness;
      }

      mat.needsUpdate = true;
    });
  });
};

/**
 * Рассчитывает масштаб, который вписывает корневую группу модели в единый размер viewer-а.
 * Используется для пользовательских моделей, чтобы файлы в любых единицах не вылезали за сцену.
 * @param {THREE.Object3D} object - Корневая группа с моделью и принтом.
 * @param {number} targetSize - Желаемый максимальный размер bounding box в сцене.
 * @returns {number | null} Новый scalar scale или null, если размер модели нельзя посчитать.
 */
export const calculateViewerFitScale = (object, targetSize = VIEWER_MODEL_TARGET_SIZE) => {
  object.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  box.getSize(size);
  const maxSize = Math.max(size.x, size.y, size.z);

  if (!Number.isFinite(maxSize) || maxSize <= 0) return null;

  return object.scale.x * (targetSize / maxSize);
};

/**
 * Общая 3D-модель товара: загружает GLTF, применяет цвет/материал, центрирует модель и ставит принт.
 *
 * @param {object} props - Параметры товара.
 * @param {string} props.productType - Тип изделия из PRODUCT_GLTF_URL.
 * @param {string} props.productColor - CSS hex-цвет изделия.
 * @param {string} props.animalId - Идентификатор выбранного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @param {number} props.printRotationDeg - Угол поворота текстуры принта в градусах.
 * @returns {JSX.Element} Группа с моделью изделия и привязанным принтом.
 */
const BaseProductModel = ({ productType, productColor, animalId, customPrintUrl, printRotationDeg = 0 }) => {
  const url = PRODUCT_GLTF_URL[productType];
  const { scene } = useGLTF(url);
  const clone = useMemo(() => scene.clone(true), [scene]);
  const layout = PRODUCT_LAYOUT[productType];
  const pbr = PRODUCT_MATERIAL[productType];
  const [printTransform, setPrintTransform] = useState({
    position: [0, 0, 0],
    scale: [1, 1, 1],
    rotation: [0, 0, 0],
    geometry: null,
  });

  useLayoutEffect(() => {
    prepareModelGeometry(clone);
    const transform = calculatePrintPosition(clone, productType);
    const geometry = createConformedPrintGeometry(clone, productType, transform);
    setPrintTransform({ ...transform, geometry });

    return () => {
      geometry.dispose();
    };
  }, [clone, productType]);

  useLayoutEffect(() => {
    applyProductMaterial(clone, productColor, pbr);
  }, [clone, productColor, pbr]);

  const modelPosition = layout.modelPosition ?? [0, 0, 0];
  const modelRotation = layout.modelRotation ?? [0, 0, 0];

  return (
    <group scale={layout.modelScale} position={modelPosition} rotation={modelRotation}>
      <primitive object={clone} />
      <PrintMesh
        geometry={printTransform.geometry}
        animalId={animalId}
        customPrintUrl={customPrintUrl}
        printRotationDeg={printRotationDeg}
      />
    </group>
  );
};

export default BaseProductModel;
