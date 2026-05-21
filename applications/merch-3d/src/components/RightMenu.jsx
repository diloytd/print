/**
 * Правая панель: животное (принт), цвет изделия, фон сцены, загрузка своего принта.
 * @param {object} props
 * @param {Array<{ id: string, label: string, src: string }>} props.animals
 * @param {string} props.selectedAnimalId
 * @param {boolean} props.hasCustomPrint - Есть ли пользовательский принт (скрывает акцент на животных визуально опционально).
 * @param {(id: string) => void} props.onAnimalSelect
 * @param {Array<{ id: string, label: string, hex: string }>} props.swatches
 * @param {string} props.productColorHex
 * @param {(hex: string) => void} props.onProductColor
 * @param {string} props.sceneBackgroundHex
 * @param {(hex: string) => void} props.onSceneBackground
 * @param {React.RefObject<HTMLInputElement | null>} props.fileInputRef
 * @param {() => void} props.onUploadClick
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onCustomPrintChange
 * @param {React.RefObject<HTMLInputElement | null>} props.modelFileInputRef
 * @param {boolean} props.hasCustomModel
 * @param {string} props.customModelError
 * @param {() => void} props.onCustomModelUploadClick
 * @param {(e: React.ChangeEvent<HTMLInputElement>) => void} props.onCustomModelChange
 * @param {() => void} props.onCustomModelReset
 */
const RightMenu = ({
  animals,
  selectedAnimalId,
  hasCustomPrint,
  onAnimalSelect,
  swatches,
  productColorHex,
  onProductColor,
  sceneBackgroundHex,
  onSceneBackground,
  fileInputRef,
  onUploadClick,
  onCustomPrintChange,
  modelFileInputRef,
  hasCustomModel,
  customModelError,
  onCustomModelUploadClick,
  onCustomModelChange,
  onCustomModelReset,
}) => (
  <aside className="right-menu" aria-label="Принт и цвета">
    <section className="right-menu__section">
      <h2 className="panel-title">Принт</h2>
      <p className="right-menu__hint">
        {hasCustomPrint ? 'Активен ваш файл (животное скрыто на модели).' : 'Контур из src/img'}
      </p>
      <div className="right-menu__animals" role="list">
        {animals.map((a) => {
          const active = !hasCustomPrint && a.id === selectedAnimalId;
          return (
            <button
              key={a.id}
              type="button"
              role="listitem"
              className={`animal-chip${active ? ' animal-chip--active' : ''}`}
              aria-pressed={active}
              onClick={() => onAnimalSelect(a.id)}
            >
              <img src={a.src} alt="" width={48} height={48} className="animal-chip__img" />
              <span className="animal-chip__label">{a.label}</span>
            </button>
          );
        })}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/svg+xml,image/jpeg,image/webp"
        aria-label="Загрузить свой принт"
        onChange={onCustomPrintChange}
      />
      <button type="button" className="upload-btn" onClick={onUploadClick}>
        Загрузить свой принт
      </button>
      <input
        ref={modelFileInputRef}
        type="file"
        accept=".glb,.gltf,.obj,.stl,model/gltf-binary,model/gltf+json,model/stl"
        aria-label="Загрузить 3D модель"
        disabled={hasCustomModel}
        onChange={onCustomModelChange}
      />
      <div className="model-upload-actions">
        <button
          type="button"
          className="upload-btn"
          disabled={hasCustomModel}
          onClick={onCustomModelUploadClick}
        >
          Загрузить 3D модель
        </button>
        <button
          type="button"
          className="upload-btn upload-btn--secondary"
          disabled={!hasCustomModel}
          onClick={onCustomModelReset}
        >
          Сбросить
        </button>
      </div>
      {customModelError ? (
        <p className="right-menu__error" role="alert">
          {customModelError}
        </p>
      ) : null}
    </section>

    <section className="right-menu__section">
      <h2 className="panel-title">Цвет изделия</h2>
      <div className="swatches" role="group" aria-label="Цвет изделия">
        {swatches.map((s) => {
          const active = s.hex === productColorHex;
          return (
            <button
              key={s.id}
              type="button"
              title={s.label}
              className={`swatch${active ? ' swatch--active' : ''}`}
              aria-pressed={active}
              style={{ ['--swatch']: s.hex }}
              onClick={() => onProductColor(s.hex)}
            >
              <span className="sr-only">{s.label}</span>
            </button>
          );
        })}
      </div>
    </section>

    <section className="right-menu__section">
      <h2 className="panel-title">Фон сцены</h2>
      <label className="color-field">
        <span className="color-field__label">RGB / HEX</span>
        <input
          type="color"
          value={sceneBackgroundHex}
          onChange={(e) => onSceneBackground(e.target.value)}
        />
      </label>
    </section>
  </aside>
);

export default RightMenu;
