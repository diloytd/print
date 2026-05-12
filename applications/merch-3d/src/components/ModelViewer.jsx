import { Component, Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import ProductModel from './product-models/ProductModel.jsx';

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
 * Центральный canvas: освещение, фон, orbit controls, модель и принт.
 * @param {object} props
 * @param {string} props.productType
 * @param {string} props.productColor
 * @param {string} props.sceneBg
 * @param {string} props.animalId
 * @param {string | null} props.customPrintUrl
 */
const ModelViewer = ({ productType, productColor, sceneBg, animalId, customPrintUrl }) => (
  <div className="model-viewer">
    <Canvas camera={{ position: [0.15, 0.4, 2.35], fov: 42 }} dpr={[1, 2]} gl={{ alpha: false }}>
      <color attach="background" args={[sceneBg]} />
      <ambientLight intensity={0.58} />
      <directionalLight position={[5.5, 8, 4.5]} intensity={1.28} />
      <pointLight position={[-4.2, 3.2, 3.2]} intensity={0.95} />
      <Suspense
        fallback={
          <Html center>
            <div className="model-viewer__hint">Загрузка модели…</div>
          </Html>
        }
      >
        <ModelErrorBoundary
          resetKey={productType}
          fallback={
            <Html center>
              <div className="model-viewer__hint model-viewer__hint--error">
                Не удалось загрузить модель. Проверьте сеть или выберите другой тип изделия.
              </div>
            </Html>
          }
        >
          <ProductModel
            productType={productType}
            productColor={productColor}
            animalId={animalId}
            customPrintUrl={customPrintUrl}
          />
        </ModelErrorBoundary>
      </Suspense>
      <OrbitControls makeDefault enableDamping dampingFactor={0.08} target={[0, 0.12, 0]} minDistance={0.7} maxDistance={7} />
    </Canvas>
  </div>
);

export default ModelViewer;
