import { useCallback, useEffect, useRef, useState } from 'react';
import LeftMenu from './components/LeftMenu.jsx';
import RightMenu from './components/RightMenu.jsx';
import ModelViewer from './components/ModelViewer.jsx';
import { ANIMALS, DEFAULT_PRINT_ID, PRODUCT_SWATCHES, PRODUCT_TYPES } from './constants/merch.js';
import './App.css';

/**
 * Корневой layout: состояние калькулятора и две панели вокруг 3D-сцены.
 */
const App = () => {
  const [productType, setProductType] = useState('cap');
  const [animalId, setAnimalId] = useState(DEFAULT_PRINT_ID);
  const [productColor, setProductColor] = useState('#c62828');
  const [sceneBg, setSceneBg] = useState('#d7dbe4');
  const [customPrintUrl, setCustomPrintUrl] = useState(null);
  const fileRef = useRef(null);

  useEffect(() => {
    return () => {
      if (customPrintUrl) URL.revokeObjectURL(customPrintUrl);
    };
  }, [customPrintUrl]);

  /**
   * Сбрасывает пользовательский принт и выбирает животное.
   * @param {string} id
   */
  const handleAnimalSelect = (id) => {
    setCustomPrintUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setAnimalId(id);
  };

  /**
   * Открывает системный выбор файла для принта.
   */
  const handleUploadClick = () => fileRef.current?.click();

  /**
   * Читает локальный файл и подменяет текстуру принта (прозрачность PNG/SVG сохраняется).
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   */
  const handleCustomPrintChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setCustomPrintUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    event.target.value = '';
  }, []);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">3D калькулятор мерча</h1>
      </header>
      <main className="app__main">
        <LeftMenu items={PRODUCT_TYPES} activeId={productType} onSelect={setProductType} />
        <ModelViewer
          productType={productType}
          productColor={productColor}
          sceneBg={sceneBg}
          animalId={animalId}
          customPrintUrl={customPrintUrl}
        />
        <RightMenu
          animals={ANIMALS}
          selectedAnimalId={animalId}
          hasCustomPrint={Boolean(customPrintUrl)}
          onAnimalSelect={handleAnimalSelect}
          swatches={PRODUCT_SWATCHES}
          productColorHex={productColor}
          onProductColor={setProductColor}
          sceneBackgroundHex={sceneBg}
          onSceneBackground={setSceneBg}
          fileInputRef={fileRef}
          onUploadClick={handleUploadClick}
          onCustomPrintChange={handleCustomPrintChange}
        />
      </main>
    </div>
  );
};

export default App;
