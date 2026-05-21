/**
 * Левая панель: выбор типа изделия.
 * @param {object} props
 * @param {Array<{ id: string, label: string }>} props.items - Список типов.
 * @param {string} props.activeId - Текущий тип изделия.
 * @param {boolean} props.isDisabled - Отключает выбор, когда активна пользовательская модель.
 * @param {(id: string) => void} props.onSelect - Колбэк при выборе типа.
 */
const LeftMenu = ({ items, activeId, isDisabled = false, onSelect }) => (
  <aside className="left-menu" aria-label="Тип изделия" aria-disabled={isDisabled}>
    <h2 className="panel-title">Изделие</h2>
    {isDisabled ? (
      <p className="left-menu__hint">Выбор изделия временно отключён для загруженной 3D-модели.</p>
    ) : null}
    <nav className="left-menu__nav">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            className={`left-menu__btn${isActive ? ' left-menu__btn--active' : ''}`}
            aria-pressed={isActive}
            disabled={isDisabled}
            onClick={() => onSelect(item.id)}
          >
            {item.label}
          </button>
        );
      })}
    </nav>
  </aside>
);

export default LeftMenu;
