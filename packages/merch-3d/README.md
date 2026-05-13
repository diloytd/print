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

## Публикация в GitHub Packages

1. Создайте GitHub token с правами `write:packages` и `read:packages`.
2. Выполните логин:

```bash
npm login --scope=@diloytd --registry=https://npm.pkg.github.com
```

Вместо пароля вставьте GitHub token.

3. Соберите пакет:

```bash
npm run build -w @diloytd/merch-3d
```

4. Проверьте содержимое архива:

```bash
npm run pack:check -w @diloytd/merch-3d
```

5. Опубликуйте:

```bash
npm run publish:github -w @diloytd/merch-3d
```

## Важно про 3D-модели

Компоненты ожидают модели по путям из `PRODUCT_GLTF_URL`, например `/models/mug.gltf`.
В приложении-потребителе эти файлы должны быть доступны из `public/models`.
