# NNN-53: Удалить опцию шаринга

## Бизнес-требование
Полностью удалить функциональность шеринга проектов из приложения. Все проекты должны быть приватными и доступными только их владельцам.

## Техническое описание реализации

### Текущее состояние

Режим шеринга реализован через:
1. **База данных:**
   - Поля `is_public` и `share_token` в таблице `project_settings`
   - Функции `get_shared_user_id(token text)` и `is_project_public(check_user_id uuid)`
   - RLS политики "Public can view shared *" для всех таблиц

2. **Frontend:**
   - `ProductContext` обрабатывает параметр `?share=` из URL
   - Режим `isReadOnly` активируется при просмотре чужого проекта
   - `SettingsDialog` содержит UI для управления шерингом
   - Все страницы проверяют `isReadOnly` для блокировки редактирования

### План реализации

#### 1. Frontend (React/TypeScript)

##### 1.1. Контекст (`src/contexts/ProductContext.tsx`)
- Удалить состояние `sharedUserId` и связанную логику
- Удалить состояние `isReadOnly` и связанную логику
- Удалить обработку параметра `share` из URL (`useSearchParams`)
- Удалить вызов `supabase.rpc('get_shared_user_id')`
- Удалить `sharedUserId` и `isReadOnly` из интерфейса `ProductContextType`
- Упростить `effectiveUserId` — использовать только `user?.id`

##### 1.2. Компонент настроек (`src/components/SettingsDialog.tsx`)
- Удалить UI для управления шерингом:
  - Переключатель `is_public`
  - Поле с share link
  - Кнопку копирования ссылки
  - Логику работы с `share_token`
- Оставить только настройки, не связанные с шерингом (если есть)

##### 1.3. Страницы приложения
- `src/pages/Index.tsx`: убрать проверки `!isReadOnly` (всегда показывать кнопки настроек)
- `src/pages/StrategyPage.tsx`: убрать все проверки `isReadOnly` и использование `sharedUserId`
- `src/pages/RoadmapPage.tsx`: убрать все проверки `isReadOnly` и использование `sharedUserId`
- `src/pages/BoardPage.tsx`: убрать все проверки `isReadOnly` и использование `sharedUserId`
- `src/pages/HypothesesPage.tsx`: убрать все проверки `isReadOnly` и использование `sharedUserId`

##### 1.4. Типы TypeScript (`src/integrations/supabase/types.ts`)
- Удалить `share_token` из типа `project_settings`
- Удалить функции `get_shared_user_id` и `is_project_public` из типа `Functions`

#### 2. База данных (Supabase)

##### 2.1. Создать новую миграцию для удаления:
- Удалить колонку `is_public` из таблицы `project_settings`
- Удалить колонку `share_token` из таблицы `project_settings`
- Удалить функцию `get_shared_user_id(token text)`
- Удалить функцию `is_project_public(check_user_id uuid)`
- Удалить все RLS политики вида "Public can view shared *":
  - `"Public can view shared product formulas"`
  - `"Public can view shared values"`
  - `"Public can view shared metrics"`
  - `"Public can view shared initiatives"`
  - `"Public can view shared goals"`
  - `"Public can view shared hypotheses"`
  - `"Public can view shared features"`

#### 3. Документация

##### 3.1. Обновить/удалить упоминания шеринга:
- `docs/settings.md` — удалить разделы про шеринг
- `docs/main-application.md` — убрать упоминания read-only режима и share links
- `docs/board-page.md` — убрать упоминания про sharing (если есть)
- `tech_reqs/BIG-56 Перенос отображения архивных артефактов в меню настроек.md` — убрать упоминание read-only режима

#### 4. Дополнительные проверки

##### 4.1. Поиск остаточных упоминаний:
- Проверить все файлы на наличие строк "share", "sharing", "shared", "read-only", "readOnly"
- Проверить использование `effectiveUserId` — заменить на `user?.id` везде, где это уместно

##### 4.2. Тестирование:
- Убедиться, что приложение работает без параметра `?share=` в URL
- Проверить, что все страницы доступны для редактирования
- Проверить, что настройки проекта работают корректно

### Детали реализации

#### 1. Миграция БД:
```sql
-- Удалить RLS политики для shared данных
DROP POLICY IF EXISTS "Public can view shared product formulas" ON public.product_formulas;
DROP POLICY IF EXISTS "Public can view shared values" ON public.values;
DROP POLICY IF EXISTS "Public can view shared metrics" ON public.metrics;
DROP POLICY IF EXISTS "Public can view shared initiatives" ON public.initiatives;
DROP POLICY IF EXISTS "Public can view shared goals" ON public.goals;
DROP POLICY IF EXISTS "Public can view shared hypotheses" ON public.hypotheses;
DROP POLICY IF EXISTS "Public can view shared features" ON public.features;

-- Удалить функции
DROP FUNCTION IF EXISTS public.get_shared_user_id(text);
DROP FUNCTION IF EXISTS public.is_project_public(uuid);

-- Удалить колонки из project_settings
ALTER TABLE public.project_settings 
  DROP COLUMN IF EXISTS is_public,
  DROP COLUMN IF EXISTS share_token;
```

#### 2. Обновление ProductContext:
- Удалить импорт `useSearchParams` (если больше не используется)
- Удалить `useEffect` с логикой получения `sharedUserId`
- Упростить `effectiveUserId` до `user?.id`
- Удалить `isReadOnly` и `sharedUserId` из провайдера

#### 3. Обновление SettingsDialog:
- Удалить состояние `isPublic` и `shareToken`
- Удалить функцию `handleToggle` и `copyShareLink`
- Удалить UI элементы для шеринга
- Оставить только настройки, не связанные с шерингом

#### 4. Обновление страниц:
- Заменить все проверки `!isReadOnly` на `true` или удалить условие
- Заменить `sharedUserId || user?.id` на `user?.id`
- Удалить импорты `isReadOnly` и `sharedUserId` из `useProduct()`

### Порядок выполнения (рекомендуемый)

1. Сначала удалить frontend-логику (контекст, компоненты, страницы)
2. Затем создать и применить миграцию базы данных
3. Обновить типы TypeScript (можно регенерировать через Supabase CLI)
4. Обновить документацию
5. Финальная проверка и тестирование

### Ожидаемый результат

- Полное удаление функциональности шеринга
- Все проекты доступны только их владельцам
- Упрощение кода (удаление проверок `isReadOnly`)
- Удаление неиспользуемых функций и политик из БД
- Обновленная документация без упоминаний шеринга

### Важные замечания

- После удаления колонок из `project_settings` существующие данные с `is_public` и `share_token` будут потеряны (если это критично, можно сделать миграцию с сохранением данных)
- Все существующие share links перестанут работать
- Режим read-only полностью исчезнет — все пользователи всегда смогут редактировать только свои проекты
- После удаления функций из БД необходимо обновить типы TypeScript (регенерировать через `supabase gen types`)

