import { useLayoutEffect, useMemo, useState } from 'react';
import { useLoader, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { OBJLoader } from 'three/addons/loaders/OBJLoader.js';
import { STLLoader } from 'three/addons/loaders/STLLoader.js';
import { PRODUCT_LAYOUT, PRODUCT_MATERIAL } from '../../constants/merch.js';
import { calculatePrintPosition, createConformedPrintGeometry } from '../../utils/calculatePrintPosition.js';
import { PrintMesh } from './BaseProductModel.jsx';

const CUSTOM_PRODUCT_TYPE = 'custom';
const CUSTOM_MODEL_BOX_SIZE = new THREE.Vector3(2.2, 2.4, 2.2);
const WORLD_UP = new THREE.Vector3(0, 1, 0);

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
 * Возвращает все видимые mesh-объекты пользовательской модели для raycast-поиска поверхности.
 * @param {THREE.Object3D} model - Нормализованная пользовательская модель.
 * @returns {THREE.Mesh[]} Mesh-объекты с геометрией.
 */
const getCustomModelMeshes = (model) => {
  const meshes = [];

  model.traverse((child) => {
    if (!child.isMesh || !child.geometry || child.visible === false) return;
    meshes.push(child);
  });

  return meshes;
};

/**
 * Создаёт две оси плоскости принта, перпендикулярные выбранной нормали лицевой стороны.
 * @param {THREE.Vector3} normal - Наружная нормаль выбранной стороны модели.
 * @returns {{ right: THREE.Vector3, up: THREE.Vector3 }} Оси X/Y для плоскости принта.
 */
const createPrintBasis = (normal) => {
  const helperUp = Math.abs(normal.dot(WORLD_UP)) > 0.94
    ? new THREE.Vector3(1, 0, 0)
    : WORLD_UP;
  const right = new THREE.Vector3().crossVectors(helperUp, normal).normalize();
  const up = new THREE.Vector3().crossVectors(normal, right).normalize();

  return { right, up };
};

/**
 * Считает размер модели в осях будущего принта, чтобы принт был пропорциональным выбранной стороне.
 * @param {THREE.Box3} box - Bounding box нормализованной модели.
 * @param {THREE.Vector3} right - Горизонтальная ось плоскости принта.
 * @param {THREE.Vector3} up - Вертикальная ось плоскости принта.
 * @returns {{ width: number, height: number }} Размеры bbox в координатах плоскости принта.
 */
const getProjectedBoxSize = (box, right, up) => {
  const corners = [
    new THREE.Vector3(box.min.x, box.min.y, box.min.z),
    new THREE.Vector3(box.min.x, box.min.y, box.max.z),
    new THREE.Vector3(box.min.x, box.max.y, box.min.z),
    new THREE.Vector3(box.min.x, box.max.y, box.max.z),
    new THREE.Vector3(box.max.x, box.min.y, box.min.z),
    new THREE.Vector3(box.max.x, box.min.y, box.max.z),
    new THREE.Vector3(box.max.x, box.max.y, box.min.z),
    new THREE.Vector3(box.max.x, box.max.y, box.max.z),
  ];
  const rightValues = corners.map((corner) => corner.dot(right));
  const upValues = corners.map((corner) => corner.dot(up));

  return {
    width: Math.max(...rightValues) - Math.min(...rightValues),
    height: Math.max(...upValues) - Math.min(...upValues),
  };
};

/**
 * Рассчитывает позицию и поворот принта на стороне модели, которая сейчас обращена к камере.
 * @param {THREE.Object3D} model - Нормализованная пользовательская модель.
 * @param {THREE.Camera} camera - Активная камера Canvas.
 * @returns {{ position: [number, number, number], scale: [number, number, number], rotation: [number, number, number] }} Трансформ принта.
 */
const calculateCameraFacingPrintPosition = (model, camera) => {
  const box = new THREE.Box3().setFromObject(model);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();
  box.getCenter(center);
  box.getSize(size);

  const cameraPosition = new THREE.Vector3();
  camera.getWorldPosition(cameraPosition);
  const normal = cameraPosition.sub(center).normalize();
  const { right, up } = createPrintBasis(normal);
  const projectedSize = getProjectedBoxSize(box, right, up);
  const printWidth = Math.min(projectedSize.width, projectedSize.height) * 0.32;
  const maxSize = Math.max(size.x, size.y, size.z);
  const offset = Math.max(printWidth * 0.025, 0.004);
  const raycaster = new THREE.Raycaster(
    center.clone().add(normal.clone().multiplyScalar(maxSize * 1.25)),
    normal.clone().negate(),
    0,
    maxSize * 2.5,
  );
  const [hit] = raycaster.intersectObjects(getCustomModelMeshes(model), true);
  const point = hit?.point ?? center.clone().add(normal.clone().multiplyScalar(maxSize * 0.5));
  const rotation = new THREE.Euler().setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(right, up, normal),
  );
  const position = point.add(normal.clone().multiplyScalar(offset));

  return {
    position: [position.x, position.y, position.z],
    scale: [printWidth, printWidth, 1],
    rotation: [rotation.x, rotation.y, rotation.z],
  };
};

/**
 * Рендерит уже загруженный Object3D: нормализует размер, красит материалы и размещает принт.
 * @param {object} props - Параметры пользовательской модели.
 * @param {THREE.Object3D} props.source - Загруженная GLTF/OBJ сцена.
 * @param {string} props.productColor - CSS hex-цвет изделия.
 * @param {string} props.animalId - Идентификатор выбранного встроенного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @param {number} props.printRotationDeg - Угол поворота текстуры принта в градусах.
 * @param {number} props.customPrintFrontVersion - Версия выбранной пользователем лицевой стороны.
 * @returns {JSX.Element} Группа с пользовательской моделью и принтом.
 */
const PreparedCustomModel = ({
  source,
  productColor,
  animalId,
  customPrintUrl,
  printRotationDeg = 0,
  customPrintFrontVersion,
}) => {
  const { camera } = useThree();
  const clone = useMemo(() => createBoxFittedCustomModel(source), [source]);
  const layout = PRODUCT_LAYOUT[CUSTOM_PRODUCT_TYPE];
  const [printTransform, setPrintTransform] = useState({
    position: [0, 0, 0],
    scale: [1, 1, 1],
    rotation: [0, 0, 0],
    geometry: null,
  });

  useLayoutEffect(() => {
    const transform = customPrintFrontVersion > 0
      ? calculateCameraFacingPrintPosition(clone, camera)
      : calculatePrintPosition(clone, CUSTOM_PRODUCT_TYPE);
    const geometry = createConformedPrintGeometry(clone, CUSTOM_PRODUCT_TYPE, transform);
    setPrintTransform({ ...transform, geometry });

    return () => {
      geometry.dispose();
    };
  }, [camera, clone, customPrintFrontVersion]);

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
        printRotationDeg={printRotationDeg}
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
 * @param {number} props.printRotationDeg - Угол поворота текстуры принта в градусах.
 * @param {number} props.customPrintFrontVersion - Версия выбранной пользователем лицевой стороны.
 * @returns {JSX.Element} Подготовленная пользовательская модель.
 */
const CustomGltfModel = ({ url, productColor, animalId, customPrintUrl, printRotationDeg, customPrintFrontVersion }) => {
  const { scene } = useGLTF(url);

  return (
    <PreparedCustomModel
      source={scene}
      productColor={productColor}
      animalId={animalId}
      customPrintUrl={customPrintUrl}
      printRotationDeg={printRotationDeg}
      customPrintFrontVersion={customPrintFrontVersion}
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
 * @param {number} props.printRotationDeg - Угол поворота текстуры принта в градусах.
 * @param {number} props.customPrintFrontVersion - Версия выбранной пользователем лицевой стороны.
 * @returns {JSX.Element} Подготовленная пользовательская модель.
 */
const CustomObjModel = ({ url, productColor, animalId, customPrintUrl, printRotationDeg, customPrintFrontVersion }) => {
  const object = useLoader(OBJLoader, url);

  return (
    <PreparedCustomModel
      source={object}
      productColor={productColor}
      animalId={animalId}
      customPrintUrl={customPrintUrl}
      printRotationDeg={printRotationDeg}
      customPrintFrontVersion={customPrintFrontVersion}
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
 * @param {number} props.printRotationDeg - Угол поворота текстуры принта в градусах.
 * @param {number} props.customPrintFrontVersion - Версия выбранной пользователем лицевой стороны.
 * @returns {JSX.Element} Подготовленная пользовательская модель.
 */
const CustomStlModel = ({ url, productColor, animalId, customPrintUrl, printRotationDeg, customPrintFrontVersion }) => {
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
      printRotationDeg={printRotationDeg}
      customPrintFrontVersion={customPrintFrontVersion}
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
 * @param {number} props.printRotationDeg - Угол поворота текстуры принта в градусах.
 * @param {number} props.customPrintFrontVersion - Версия выбранной пользователем лицевой стороны.
 * @returns {JSX.Element | null} Пользовательская модель или null для неподдержанного формата.
 */
const CustomProductModel = ({
  url,
  format,
  productColor,
  animalId,
  customPrintUrl,
  printRotationDeg = 0,
  customPrintFrontVersion,
}) => {
  if (format === 'stl') {
    return (
      <CustomStlModel
        url={url}
        productColor={productColor}
        animalId={animalId}
        customPrintUrl={customPrintUrl}
        printRotationDeg={printRotationDeg}
        customPrintFrontVersion={customPrintFrontVersion}
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
        printRotationDeg={printRotationDeg}
        customPrintFrontVersion={customPrintFrontVersion}
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
        printRotationDeg={printRotationDeg}
        customPrintFrontVersion={customPrintFrontVersion}
      />
    );
  }

  return null;
};

export default CustomProductModel;
