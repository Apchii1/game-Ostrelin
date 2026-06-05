# Skyline Sprint

Готовый учебный проект: **2D платформер для браузера** на **HTML + CSS + JavaScript + Canvas** без сторонних библиотек.

## Что внутри

- 4 уровня с ростом сложности
- core-loop: движение → прыжки → сбор монет → выход в портал
- HUD со временем, жизнями и прогрессом по монетам
- экран победы и поражения
- анимации:
  - бег / прыжок игрока
  - покачивание монет
  - пульсация цели
- аккуратная структура проекта без огромного монолитного `index.html`

## Структура проекта

```text
platformer-game/
├─ index.html
├─ README.md
├─ css/
│  └─ styles.css
├─ js/
│  ├─ assets.js
│  ├─ config.js
│  ├─ entities.js
│  ├─ game.js
│  ├─ input.js
│  ├─ levels.js
│  └─ main.js
└─ assets/
   ├─ background.png
   ├─ coin.png
   ├─ goal.png
   └─ player.png
```

## MVP-план по логике пары

1. **Setup** — создать папку проекта и разложить код по каталогам.
2. **Plan** — определить core-loop и состав MVP.
3. **Build 1** — запустить Canvas и игровой цикл.
4. **Build 2** — добавить игрока, физику, прыжок и коллизии.
5. **Build 3** — добавить монеты, цель и смену уровней.
6. **Build 4** — оформить HUD, экраны состояний и ассеты.
7. **Verify** — проверить запуск, логику уровней и синтаксис.
8. **Commit** — фиксировать каждую логическую часть отдельно.

## Как запустить

### Вариант 1: просто открыть локально
Открой `index.html` в браузере.

### Вариант 2: через локальный сервер
Если браузер блокирует модули при прямом открытии файла, подними простой сервер:

```bash
python3 -m http.server 8000
```

Потом открой `http://localhost:8000`

## Управление

- `A / D` или `← / →` — движение
- `W / ↑ / Space` — прыжок
- `Enter` — старт / пауза
- `R` — перезапуск
- `M` — звук вкл/выкл

## Git / GitHub pipeline

```bash
mkdir my-game
cd my-game
git init
```

Дальше типовой цикл:

```bash
git add .
git commit -m "feat: setup canvas platformer"
git branch -M main
git remote add origin <repo-url>
git push -u origin main
```

## Пример коммитов

```bash
git commit -m "chore: create project structure"
git commit -m "feat: add player movement and collisions"
git commit -m "feat: add coins goal and level progression"
git commit -m "style: add game ui and polish"
```

## Публикация на GitHub Pages

1. Залить проект в `main`
2. В GitHub открыть **Settings → Pages**
3. Выбрать публикацию из ветки `main`
4. Указать корень `/root`
5. Сохранить и проверить ссылку

## Критерий готовности

Проект считается готовым, если:

- игра запускается в браузере без библиотек
- игрок может пройти все уровни
- монеты собираются, ловушки работают
- цель открывается только после сбора всех монет
- есть экран победы и рестарт
- структура проекта читаемая и удобная для коммитов
