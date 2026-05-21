import BaseProductModel from './BaseProductModel.jsx';

/**
 * 3D-компонент футболки. Изолирует тип изделия, чтобы посадка и принт футболки жили отдельно.
 *
 * @param {object} props - Параметры отображения футболки.
 * @param {string} props.productColor - CSS hex-цвет футболки.
 * @param {string} props.animalId - Идентификатор выбранного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @param {number} props.printRotationDeg - Угол поворота текстуры принта в градусах.
 * @returns {JSX.Element} Модель футболки с принтом.
 */
const TshirtModel = ({ productColor, animalId, customPrintUrl, printRotationDeg = 0 }) => (
  <BaseProductModel
    productType="tshirt"
    productColor={productColor}
    animalId={animalId}
    customPrintUrl={customPrintUrl}
    printRotationDeg={printRotationDeg}
  />
);

export default TshirtModel;
