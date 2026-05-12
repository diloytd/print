import { useLayoutEffect, useMemo, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { PRODUCT_GLTF_URL, PRODUCT_LAYOUT, PRODUCT_MATERIAL } from '../../constants/merch.js';
import { usePrintTexture } from '../../hooks/usePrintTexture.js';
import { calculatePrintPosition, createConformedPrintGeometry } from '../../utils/calculatePrintPosition.js';

/**
 * Плоский mesh с текстурой принта на поверхности модели.
 *
 * @param {object} props - Параметры принта.
 * @param {THREE.BufferGeometry | null} props.geometry - Геометрия принта, спроецированная на поверхность изделия.
 * @param {string} props.animalId - Идентификатор выбранного встроенного SVG-принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @returns {JSX.Element | null} Mesh принта или null, если текстура ещё не готова.
 */
const PrintMesh = ({ geometry, animalId, customPrintUrl }) => {
  const map = usePrintTexture(animalId, customPrintUrl);
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
const prepareModelGeometry = (model) => {
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
const applyProductMaterial = (model, productColor, pbr) => {
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
 * Общая 3D-модель товара: загружает GLTF, применяет цвет/материал, центрирует модель и ставит принт.
 *
 * @param {object} props - Параметры товара.
 * @param {string} props.productType - Тип изделия из PRODUCT_GLTF_URL.
 * @param {string} props.productColor - CSS hex-цвет изделия.
 * @param {string} props.animalId - Идентификатор выбранного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @returns {JSX.Element} Группа с моделью изделия и привязанным принтом.
 */
const BaseProductModel = ({ productType, productColor, animalId, customPrintUrl }) => {
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
      />
    </group>
  );
};

export default BaseProductModel;
