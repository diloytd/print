/**
 * Левая панель: выбор типа изделия.
 * @param {object} props
 * @param {Array<{ id: string, label: string }>} props.items - Список типов.
 * @param {string} props.activeId - Текущий тип изделия.
 * @param {(id: string) => void} props.onSelect - Колбэк при выборе типа.
 */
const LeftMenu = ({ items, activeId, onSelect }) => (
  <aside className="left-menu" aria-label="Тип изделия">
    <h2 className="panel-title">Изделие</h2>
    <nav className="left-menu__nav">
      {items.map((item) => {
        const isActive = item.id === activeId;
        return (
          <button
            key={item.id}
            type="button"
            className={`left-menu__btn${isActive ? ' left-menu__btn--active' : ''}`}
            aria-pressed={isActive}
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
