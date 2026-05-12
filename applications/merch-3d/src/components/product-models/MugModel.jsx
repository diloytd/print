import BaseProductModel from './BaseProductModel.jsx';

/**
 * 3D-компонент кружки. Изолирует тип изделия, чтобы настройки кружки не смешивались с одеждой.
 *
 * @param {object} props - Параметры отображения кружки.
 * @param {string} props.productColor - CSS hex-цвет кружки.
 * @param {string} props.animalId - Идентификатор выбранного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @returns {JSX.Element} Модель кружки с принтом.
 */
const MugModel = ({ productColor, animalId, customPrintUrl }) => (
  <BaseProductModel
    productType="mug"
    productColor={productColor}
    animalId={animalId}
    customPrintUrl={customPrintUrl}
  />
);

export default MugModel;
