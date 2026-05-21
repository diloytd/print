import { Component, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import ProductModel from './product-models/ProductModel.jsx';
import CustomProductModel from './product-models/CustomProductModel.jsx';

/**
 * Граница ошибок для `useGLTF`: сброс при смене `resetKey` (тип изделия / URL).
 */
export class ModelErrorBoundary extends Component {
  /** @param {object} props */
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  /**
   * Передаёт ошибку загрузки наверх, чтобы UI мог показать сообщение и вернуть встроенную модель.
   * @param {Error} error - Ошибка загрузчика Three.js.
   * @returns {void}
   */
  componentDidCatch(error) {
    this.props.onError?.(error);
  }

  /** @param {Readonly<{ resetKey: string }>} prevProps */
  componentDidUpdate(prevProps) {
    if (prevProps.resetKey !== this.props.resetKey) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

/**
 * Показывает лоадер поверх Canvas, пока Suspense ждёт загрузку модели.
 * @returns {JSX.Element} HTML-оверлей со спиннером.
 */
const ModelLoader = () => (
  <Html center>
    <div className="model-viewer__hint model-viewer__hint--loading" role="status" aria-live="polite">
      <span className="model-viewer__spinner" aria-hidden="true" />
      Загрузка модели…
    </div>
  </Html>
);

/**
 * Центральный canvas: освещение, фон, orbit controls, модель и принт.
 * @param {object} props
 * @param {string} props.productType
 * @param {string} props.productColor
 * @param {string} props.sceneBg
 * @param {string} props.animalId
 * @param {string | null} props.customPrintUrl
 * @param {number} props.printRotationDeg
 * @param {string | null} props.customModelUrl
 * @param {'glb' | 'gltf' | 'obj' | 'stl' | null} props.customModelFormat
 * @param {number} props.customPrintFrontVersion
 * @param {(error: Error) => void} props.onCustomModelError
 */
const ModelViewer = ({
  productType,
  productColor,
  sceneBg,
  animalId,
  customPrintUrl,
  printRotationDeg,
  customModelUrl,
  customModelFormat,
  customPrintFrontVersion,
  onCustomModelError,
}) => {
  const isCustomModel = Boolean(customModelUrl && customModelFormat);
  const resetKey = isCustomModel ? `custom:${customModelUrl}` : `built-in:${productType}`;
  const errorFallback = isCustomModel ? (
    <>
      <ProductModel
        productType={productType}
        productColor={productColor}
        animalId={animalId}
        customPrintUrl={customPrintUrl}
      />
      <Html center>
        <div className="model-viewer__hint model-viewer__hint--error">
          Некорректный файл 3D-модели. Текущая встроенная модель сохранена.
        </div>
      </Html>
    </>
  ) : (
    <Html center>
      <div className="model-viewer__hint model-viewer__hint--error">
        Не удалось загрузить модель. Проверьте сеть или выберите другой тип изделия.
      </div>
    </Html>
  );

  return (
    <div className="model-viewer">
      <Canvas camera={{ position: [0.15, 0.4, 2.35], fov: 42 }} dpr={[1, 2]} gl={{ alpha: false }}>
        <color attach="background" args={[sceneBg]} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[5.5, 8, 4.5]} intensity={1.28} />
        <pointLight position={[-4.2, 3.2, 3.2]} intensity={0.95} />
        <Suspense fallback={<ModelLoader />}>
          <ModelErrorBoundary
            resetKey={resetKey}
            fallback={errorFallback}
            onError={isCustomModel ? onCustomModelError : undefined}
          >
            {isCustomModel ? (
              <CustomProductModel
                key={customModelUrl}
                url={customModelUrl}
                format={customModelFormat}
                productColor={productColor}
                animalId={animalId}
                customPrintUrl={customPrintUrl}
                printRotationDeg={printRotationDeg}
                customPrintFrontVersion={customPrintFrontVersion}
              />
            ) : (
              <ProductModel
                productType={productType}
                productColor={productColor}
                animalId={animalId}
                customPrintUrl={customPrintUrl}
                printRotationDeg={printRotationDeg}
              />
            )}
          </ModelErrorBoundary>
        </Suspense>
        <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[0, 0.12, 0]} minDistance={0.7} maxDistance={7} />
      </Canvas>
    </div>
  );
};

export default ModelViewer;
