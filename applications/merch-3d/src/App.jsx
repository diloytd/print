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
  const [customModelUrl, setCustomModelUrl] = useState(null);
  const [customModelFormat, setCustomModelFormat] = useState(null);
  const [customModelError, setCustomModelError] = useState('');
  const [customPrintFrontVersion, setCustomPrintFrontVersion] = useState(0);
  const [printRotationDeg, setPrintRotationDeg] = useState(0);
  const printFileRef = useRef(null);
  const modelFileRef = useRef(null);
  const isCustomModel = Boolean(customModelUrl);

  useEffect(() => {
    return () => {
      if (customPrintUrl) URL.revokeObjectURL(customPrintUrl);
    };
  }, [customPrintUrl]);

  useEffect(() => {
    return () => {
      if (customModelUrl) URL.revokeObjectURL(customModelUrl);
    };
  }, [customModelUrl]);

  /**
   * Возвращает поддерживаемый формат 3D-модели по имени файла.
   * @param {File} file - Файл, выбранный пользователем.
   * @returns {'glb' | 'gltf' | 'obj' | 'stl' | null} Формат модели или null для неподдержанного расширения.
   */
  const getCustomModelFormat = (file) => {
    const extension = file.name.split('.').pop()?.toLowerCase();
    if (extension === 'glb' || extension === 'gltf' || extension === 'obj' || extension === 'stl') return extension;
    return null;
  };

  /**
   * Выбирает встроенный тип изделия, пока пользовательская модель не активна.
   * @param {string} id - Идентификатор изделия из левого меню.
   * @returns {void}
   */
  const handleProductSelect = (id) => {
    if (isCustomModel) return;
    setProductType(id);
  };

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
  const handleUploadClick = () => printFileRef.current?.click();

  /**
   * Поворачивает текущий принт на 90 градусов без изменения его позиции на поверхности.
   * @param {number} direction - Направление поворота: 1 вправо, -1 влево.
   * @returns {void}
   */
  const handlePrintRotate = useCallback((direction) => {
    setPrintRotationDeg((rotation) => (rotation + direction * 90 + 360) % 360);
  }, []);

  /**
   * Открывает системный выбор файла для пользовательской 3D-модели.
   */
  const handleCustomModelUploadClick = () => {
    if (isCustomModel) {
      setCustomModelError('Сначала нажмите «Сбросить», чтобы загрузить другую 3D-модель.');
      return;
    }

    modelFileRef.current?.click();
  };

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

  /**
   * Сохраняет Object URL выбранной 3D-модели и переключает сцену в custom-режим.
   * Формат проверяется до смены текущей модели, чтобы неподдержанный файл не влиял на сцену.
   * @param {import('react').ChangeEvent<HTMLInputElement>} event
   * @returns {void}
   */
  const handleCustomModelChange = useCallback((event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (customModelUrl) {
      setCustomModelError('Можно загрузить только одну 3D-модель за раз. Сначала нажмите «Сбросить».');
      event.target.value = '';
      return;
    }

    const format = getCustomModelFormat(file);
    if (!format) {
      setCustomModelError('Поддерживаются только файлы .glb, .gltf, .obj и .stl.');
      event.target.value = '';
      return;
    }

    const nextUrl = URL.createObjectURL(file);
    setCustomModelError('');
    setCustomPrintFrontVersion(0);
    setCustomModelFormat(format);
    setCustomModelUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return nextUrl;
    });
    event.target.value = '';
  }, [customModelUrl]);

  /**
   * Возвращает встроенную модель последнего выбранного типа изделия.
   * @returns {void}
   */
  const handleCustomModelReset = useCallback(() => {
    setCustomModelError('');
    setCustomPrintFrontVersion(0);
    setCustomModelFormat(null);
    setCustomModelUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  /**
   * Обрабатывает ошибку парсинга GLTF/OBJ и оставляет сцену на встроенной модели.
   * @returns {void}
   */
  const handleCustomModelError = useCallback(() => {
    setCustomModelError('Не удалось прочитать 3D-модель. Файл некорректный или содержит неподдержанные данные.');
    setCustomPrintFrontVersion(0);
    setCustomModelFormat(null);
    setCustomModelUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
  }, []);

  /**
   * Назначает текущую видимую сторону пользовательской модели лицевой стороной для принта.
   * @returns {void}
   */
  const handleCustomModelFrontSide = useCallback(() => {
    if (!isCustomModel) return;
    setCustomModelError('');
    setCustomPrintFrontVersion((version) => version + 1);
  }, [isCustomModel]);

  return (
    <div className="app">
      <header className="app__header">
        <h1 className="app__title">3D калькулятор мерча</h1>
      </header>
      <main className="app__main">
        <LeftMenu
          items={PRODUCT_TYPES}
          activeId={productType}
          isDisabled={isCustomModel}
          onSelect={handleProductSelect}
        />
        <ModelViewer
          productType={productType}
          productColor={productColor}
          sceneBg={sceneBg}
          animalId={animalId}
          customPrintUrl={customPrintUrl}
          printRotationDeg={printRotationDeg}
          customModelUrl={customModelUrl}
          customModelFormat={customModelFormat}
          customPrintFrontVersion={customPrintFrontVersion}
          onCustomModelError={handleCustomModelError}
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
          fileInputRef={printFileRef}
          onUploadClick={handleUploadClick}
          onCustomPrintChange={handleCustomPrintChange}
          onPrintRotate={handlePrintRotate}
          modelFileInputRef={modelFileRef}
          hasCustomModel={isCustomModel}
          customModelError={customModelError}
          onCustomModelUploadClick={handleCustomModelUploadClick}
          onCustomModelChange={handleCustomModelChange}
          onCustomModelReset={handleCustomModelReset}
          onCustomModelFrontSide={handleCustomModelFrontSide}
        />
      </main>
    </div>
  );
};

export default App;
