import { useLayoutEffect, useMemo, useState } from 'react';
import { useLoader } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { PRODUCT_LAYOUT, PRODUCT_MATERIAL } from '../../constants/merch.js';
import { calculatePrintPosition, createConformedPrintGeometry } from '../../utils/calculatePrintPosition.js';
import { PrintMesh } from './BaseProductModel.jsx';

const CUSTOM_PRODUCT_TYPE = 'custom';
const CUSTOM_MODEL_BOX_SIZE = new THREE.Vector3(2.2, 2.4, 2.2);

/**
 * Клонирует материал mesh-объекта или создаёт базовый материал для форматов без материалов, например STL.
 * @param {THREE.Material | THREE.Material[] | null | undefined} material - Материал исходного mesh.
 * @returns {THREE.Material | THREE.Material[]} Независимый материал для нормализованной модели.
 */
const cloneCustomMaterial = (material) => {
  if (Array.isArray(material)) {
    return material.map((item) => item?.clone?.() ?? new THREE.MeshStandardMaterial());
  }

  if (material?.clone) return material.clone();

  return new THREE.MeshStandardMaterial({
    color: '#ffffff',
    roughness: PRODUCT_MATERIAL[CUSTOM_PRODUCT_TYPE].roughness,
    metalness: PRODUCT_MATERIAL[CUSTOM_PRODUCT_TYPE].metalness,
    side: THREE.DoubleSide,
  });
};

/**
 * Создаёт нормализованную пользовательскую модель внутри невидимого габаритного бокса.
 * Все трансформы исходного файла запекаются в вершины, затем геометрия центрируется и масштабируется.
 * @param {THREE.Object3D} source - Исходный объект, полученный из GLTFLoader, OBJLoader или STLLoader.
 * @returns {THREE.Group} Группа mesh-объектов, гарантированно вписанная в CUSTOM_MODEL_BOX_SIZE.
 */
const createBoxFittedCustomModel = (source) => {
  source.updateMatrixWorld(true);

  const sourceBox = new THREE.Box3().setFromObject(source);
  const sourceSize = new THREE.Vector3();
  const sourceCenter = new THREE.Vector3();
  sourceBox.getSize(sourceSize);
  sourceBox.getCenter(sourceCenter);

  const scale = Math.min(
    CUSTOM_MODEL_BOX_SIZE.x / sourceSize.x,
    CUSTOM_MODEL_BOX_SIZE.y / sourceSize.y,
    CUSTOM_MODEL_BOX_SIZE.z / sourceSize.z,
  );

  const group = new THREE.Group();
  if (!Number.isFinite(scale) || scale <= 0) return group;

  source.traverse((child) => {
    if (!child.isMesh || !child.geometry) return;

    const geometry = child.geometry.clone();
    geometry.applyMatrix4(child.matrixWorld);
    geometry.translate(-sourceCenter.x, -sourceCenter.y, -sourceCenter.z);
    geometry.scale(scale, scale, scale);
    geometry.computeVertexNormals();
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, cloneCustomMaterial(child.material));
    mesh.name = child.name;
    mesh.visible = child.visible;
    mesh.castShadow = child.castShadow;
    mesh.receiveShadow = child.receiveShadow;
    group.add(mesh);
  });

  return group;
};

/**
 * Применяет цвет к материалам пользовательской модели, если материал поддерживает `color`.
 * Текстуры не удаляются, поэтому модели с собственными картами не теряют детализацию.
 * @param {THREE.Object3D} model - Клонированная пользовательская модель.
 * @param {string} productColor - CSS hex-цвет из палитры изделия.
 * @returns {void}
 */
const applyCustomModelColor = (model, productColor) => {
  const pbr = PRODUCT_MATERIAL[CUSTOM_PRODUCT_TYPE];

  model.traverse((child) => {
    if (!child.isMesh || !child.material) return;

    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.forEach((material) => {
      if (!material) return;

      material.side = THREE.DoubleSide;
      if (material.color) material.color.set(productColor);

      if (material.isMeshStandardMaterial || material.isMeshPhysicalMaterial) {
        material.roughness = pbr.roughness;
        material.metalness = pbr.metalness;
      }

      material.needsUpdate = true;
    });
  });
};

/**
 * Рендерит уже загруженный Object3D: нормализует размер, красит материалы и размещает принт.
 * @param {object} props - Параметры пользовательской модели.
 * @param {THREE.Object3D} props.source - Загруженная GLTF/OBJ сцена.
 * @param {string} props.productColor - CSS hex-цвет изделия.
 * @param {string} props.animalId - Идентификатор выбранного встроенного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @returns {JSX.Element} Группа с пользовательской моделью и принтом.
 */
const PreparedCustomModel = ({ source, productColor, animalId, customPrintUrl }) => {
  const clone = useMemo(() => createBoxFittedCustomModel(source), [source]);
  const layout = PRODUCT_LAYOUT[CUSTOM_PRODUCT_TYPE];
  const [printTransform, setPrintTransform] = useState({
    position: [0, 0, 0],
    scale: [1, 1, 1],
    rotation: [0, 0, 0],
    geometry: null,
  });

  useLayoutEffect(() => {
    const transform = calculatePrintPosition(clone, CUSTOM_PRODUCT_TYPE);
    const geometry = createConformedPrintGeometry(clone, CUSTOM_PRODUCT_TYPE, transform);
    setPrintTransform({ ...transform, geometry });

    return () => {
      geometry.dispose();
    };
  }, [clone]);

  useLayoutEffect(() => {
    applyCustomModelColor(clone, productColor);
  }, [clone, productColor]);

  return (
    <group
      scale={layout.modelScale}
      position={layout.modelPosition}
      rotation={layout.modelRotation}
    >
      <primitive object={clone} />
      <PrintMesh
        geometry={printTransform.geometry}
        animalId={animalId}
        customPrintUrl={customPrintUrl}
      />
    </group>
  );
};

/**
 * Загружает пользовательскую GLB/GLTF-модель через drei `useGLTF`.
 * @param {object} props - Параметры пользовательской GLTF-модели.
 * @param {string} props.url - Object URL выбранного файла.
 * @param {string} props.productColor - CSS hex-цвет изделия.
 * @param {string} props.animalId - Идентификатор выбранного встроенного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @returns {JSX.Element} Подготовленная пользовательская модель.
 */
const CustomGltfModel = ({ url, productColor, animalId, customPrintUrl }) => {
  const { scene } = useGLTF(url);

  return (
    <PreparedCustomModel
      source={scene}
      productColor={productColor}
      animalId={animalId}
      customPrintUrl={customPrintUrl}
    />
  );
};

/**
 * Загружает пользовательскую OBJ-модель через Three.js `OBJLoader`.
 * @param {object} props - Параметры пользовательской OBJ-модели.
 * @param {string} props.url - Object URL выбранного файла.
 * @param {string} props.productColor - CSS hex-цвет изделия.
 * @param {string} props.animalId - Идентификатор выбранного встроенного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @returns {JSX.Element} Подготовленная пользовательская модель.
 */
const CustomObjModel = ({ url, productColor, animalId, customPrintUrl }) => {
  const object = useLoader(OBJLoader, url);

  return (
    <PreparedCustomModel
      source={object}
      productColor={productColor}
      animalId={animalId}
      customPrintUrl={customPrintUrl}
    />
  );
};

/**
 * Загружает пользовательскую STL-модель через Three.js `STLLoader`.
 * STL содержит только геометрию, поэтому материал создаётся на стороне приложения.
 * @param {object} props - Параметры пользовательской STL-модели.
 * @param {string} props.url - Object URL выбранного файла.
 * @param {string} props.productColor - CSS hex-цвет изделия.
 * @param {string} props.animalId - Идентификатор выбранного встроенного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @returns {JSX.Element} Подготовленная пользовательская модель.
 */
const CustomStlModel = ({ url, productColor, animalId, customPrintUrl }) => {
  const geometry = useLoader(STLLoader, url);
  const object = useMemo(() => {
    const material = new THREE.MeshStandardMaterial({
      color: '#ffffff',
      roughness: PRODUCT_MATERIAL[CUSTOM_PRODUCT_TYPE].roughness,
      metalness: PRODUCT_MATERIAL[CUSTOM_PRODUCT_TYPE].metalness,
      side: THREE.DoubleSide,
    });

    return new THREE.Mesh(geometry, material);
  }, [geometry]);

  return (
    <PreparedCustomModel
      source={object}
      productColor={productColor}
      animalId={animalId}
      customPrintUrl={customPrintUrl}
    />
  );
};

/**
 * Выбирает загрузчик для пользовательской 3D-модели по расширению файла.
 * @param {object} props - Параметры пользовательской модели.
 * @param {string} props.url - Object URL выбранного файла.
 * @param {'glb' | 'gltf' | 'obj' | 'stl'} props.format - Расширение загруженного файла.
 * @param {string} props.productColor - CSS hex-цвет изделия.
 * @param {string} props.animalId - Идентификатор выбранного встроенного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @returns {JSX.Element | null} Пользовательская модель или null для неподдержанного формата.
 */
const CustomProductModel = ({ url, format, productColor, animalId, customPrintUrl }) => {
  if (format === 'stl') {
    return (
      <CustomStlModel
        url={url}
        productColor={productColor}
        animalId={animalId}
        customPrintUrl={customPrintUrl}
      />
    );
  }

  if (format === 'obj') {
    return (
      <CustomObjModel
        url={url}
        productColor={productColor}
        animalId={animalId}
        customPrintUrl={customPrintUrl}
      />
    );
  }

  if (format === 'glb' || format === 'gltf') {
    return (
      <CustomGltfModel
        url={url}
        productColor={productColor}
        animalId={animalId}
        customPrintUrl={customPrintUrl}
      />
    );
  }

  return null;
};

export default CustomProductModel;
