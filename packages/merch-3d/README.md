# @diloytd/merch-3d

React-компоненты 3D-калькулятора мерча для публикации в GitHub Packages.

## Установка

В проекте-потребителе добавьте `.npmrc`:

```ini
@diloytd:registry=https://npm.pkg.github.com
```

Затем установите пакет:

```bash
npm install @diloytd/merch-3d
```

## Использование

```jsx
import { Merch3DApp } from '@diloytd/merch-3d';
import '@diloytd/merch-3d/style.css';

const App = () => <Merch3DApp />;
```

Можно импортировать отдельные части:

```jsx
import { ModelViewer, PRODUCT_TYPES } from '@diloytd/merch-3d';
import '@diloytd/merch-3d/style.css';
```

## Публикация в GitHub Packages через GitHub Actions

1. Запушьте изменения в GitHub.
2. Откройте репозиторий `diloytd/print`.
3. Перейдите в `Actions`.
4. Выберите workflow `Publish Merch 3D Package`.
5. Нажмите `Run workflow`.

Локально перед публикацией можно проверить сборку:

```bash
npm run build -w @diloytd/merch-3d
npm run pack:check -w @diloytd/merch-3d
```

После первой публикации откройте пакет на GitHub и проверьте видимость:

```text
Package page -> Package settings -> Change visibility -> Public
```

## Важно про 3D-модели

Модель кружки `mug.gltf` уже попадает в сборку пакета.

Остальные модели из `PRODUCT_GLTF_URL` пока остаются внешними путями:

```text
/models/umbrella.glb
/models/cap.glb
/models/tshirt.glb
/models/bag.glb
```

Если используете эти типы изделий, положите соответствующие файлы в `public/models` приложения-потребителя.
