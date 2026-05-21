import BaseProductModel from './BaseProductModel.jsx';

/**
 * 3D-компонент зонта. Изолирует тип изделия, чтобы настройки зонта не смешивались с одеждой и кружкой.
 *
 * @param {object} props - Параметры отображения зонта.
 * @param {string} props.productColor - CSS hex-цвет зонта.
 * @param {string} props.animalId - Идентификатор выбранного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @param {number} props.printRotationDeg - Угол поворота текстуры принта в градусах.
 * @returns {JSX.Element} Модель зонта с принтом.
 */
const UmbrellaModel = ({ productColor, animalId, customPrintUrl, printRotationDeg = 0 }) => (
  <BaseProductModel
    productType="umbrella"
    productColor={productColor}
    animalId={animalId}
    customPrintUrl={customPrintUrl}
    printRotationDeg={printRotationDeg}
  />
);

export default UmbrellaModel;
