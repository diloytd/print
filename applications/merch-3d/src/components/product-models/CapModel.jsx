import BaseProductModel from './BaseProductModel.jsx';

/**
 * 3D-компонент кепки. Изолирует тип изделия, чтобы параметры кепки можно было развивать отдельно.
 *
 * @param {object} props - Параметры отображения кепки.
 * @param {string} props.productColor - CSS hex-цвет кепки.
 * @param {string} props.animalId - Идентификатор выбранного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @param {number} props.printRotationDeg - Угол поворота текстуры принта в градусах.
 * @returns {JSX.Element} Модель кепки с принтом.
 */
const CapModel = ({ productColor, animalId, customPrintUrl, printRotationDeg = 0 }) => (
  <BaseProductModel
    productType="cap"
    productColor={productColor}
    animalId={animalId}
    customPrintUrl={customPrintUrl}
    printRotationDeg={printRotationDeg}
  />
);

export default CapModel;
