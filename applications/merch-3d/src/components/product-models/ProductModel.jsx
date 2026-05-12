import BaseProductModel from './BaseProductModel.jsx';
import CapModel from './CapModel.jsx';
import MugModel from './MugModel.jsx';
import TshirtModel from './TshirtModel.jsx';
import UmbrellaModel from './UmbrellaModel.jsx';

const PRODUCT_COMPONENTS = {
  cap: CapModel,
  mug: MugModel,
  tshirt: TshirtModel,
  umbrella: UmbrellaModel,
};

/**
 * Выбирает конкретный компонент 3D-изделия по productType.
 * Для будущих общих моделей оставляет базовый компонент без отдельной обёртки.
 *
 * @param {object} props - Параметры текущего товара.
 * @param {string} props.productType - Тип изделия из меню.
 * @param {string} props.productColor - CSS hex-цвет изделия.
 * @param {string} props.animalId - Идентификатор выбранного принта.
 * @param {string | null} props.customPrintUrl - URL пользовательского принта, если он загружен.
 * @returns {JSX.Element} Конкретная модель товара.
 */
const ProductModel = ({ productType, productColor, animalId, customPrintUrl }) => {
  const Component = PRODUCT_COMPONENTS[productType];

  if (Component) {
    return (
      <Component
        productColor={productColor}
        animalId={animalId}
        customPrintUrl={customPrintUrl}
      />
    );
  }

  return (
    <BaseProductModel
      productType={productType}
      productColor={productColor}
      animalId={animalId}
      customPrintUrl={customPrintUrl}
    />
  );
};

export default ProductModel;
