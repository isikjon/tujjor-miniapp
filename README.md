# TUJJOR — Telegram Mini App

Маркетплейс товаров из Китая (1688, Alibaba, POIZON/Dewu) внутри Telegram Mini Apps.

**Текущий этап: Фаза A — Design Lab.** Четыре интерактивных варианта дизайна мини-приложения на общих компонентах
и демонстрационных данных. Разработка архитектуры (микросервисы: User, Catalog, Supplier Integration, Order, Payment,
Notification) начнётся после выбора варианта.

## Быстрый старт

```bash
cd apps/miniapp
npm install
npm run demo:media      # один раз: скачать и подготовить демо-изображения (AVIF/WebP/JPEG)
npm run dev             # http://localhost:5173/design-lab
```

Production-сборка (так её и стоит оценивать — dev-режим React медленнее):

```bash
npm run lab             # build + preview → http://localhost:4173/design-lab
```

Открыть лабораторию с телефона в той же Wi-Fi сети: `npx vite preview --host` и адрес `http://<IP-компьютера>:4173/design-lab`.

## Что внутри

```
apps/miniapp/
  src/
    shared/        общее ядро: навигация (стек + Telegram BackButton), данные (TanStack Query),
                   корзина/избранное (Zustand), Telegram-адаптер, i18n RU/UZ, UI-примитивы, демо-API
    variants/      4 варианта дизайна: a-minimal, b-market, c-neo, d-telegram (только визуальный слой)
    lab/           Design Lab: эмуляция Telegram (шапка Back/Закрыть, MainButton, haptics, тема), сравнение
  scripts/         подготовка демо-данных и изображений, скриншоты, замеры производительности
```

| URL | Что это |
|---|---|
| `/design-lab` | Лаборатория: один вариант + описание или сравнение всех четырёх, синхронная навигация по 8 экранам |
| `/app/a` … `/app/d` | Вариант как отдельное мини-приложение (так он будет открываться в Telegram) |

## Демо-данные

Все товары, цены, заказы и оплата — **демонстрационные**. Каталог собран из публичного тестового набора DummyJSON
(изображения товаров и исходные описания), локализован на русский и узбекский, цены пересчитаны в UZS по демо-курсу.
Реальные интеграции с 1688 / Alibaba / POIZON, оплата и авторизация Telegram — в следующих фазах.
