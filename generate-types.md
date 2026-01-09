# Генерация типов Supabase для удаленного проекта

## Шаг 1: Применить миграцию

### Вариант A: Через Supabase Dashboard (рекомендуется)

1. Откройте https://supabase.com/dashboard/project/hdrkyvztkbwbzigfjdbg
2. Перейдите в **SQL Editor**
3. Скопируйте и выполните следующий SQL:

```sql
-- Add target_metric_id and priority fields to initiatives table
-- ESS-63: Указание целевой метрики для инициативы
-- NEW: Возможность указать порядок инициатив

-- Add target_metric_id field (nullable, FK to metrics.id)
ALTER TABLE public.initiatives 
  ADD COLUMN target_metric_id uuid REFERENCES public.metrics(id) ON DELETE SET NULL;

-- Add priority field (integer, NOT NULL, DEFAULT 3)
ALTER TABLE public.initiatives 
  ADD COLUMN priority integer NOT NULL DEFAULT 3;

-- Update existing records to set priority = 3 (for records that might have NULL)
UPDATE public.initiatives 
SET priority = 3 
WHERE priority IS NULL;
```

### Вариант B: Через CLI (если настроен)

```bash
npx supabase db push --project-id hdrkyvztkbwbzigfjdbg
```

## Шаг 2: Получить Access Token

1. Откройте https://supabase.com/dashboard/account/tokens
2. Создайте новый Access Token (если его нет)
3. Скопируйте токен

## Шаг 3: Сгенерировать типы

### Вариант 1: С использованием Access Token (рекомендуется)

```bash
# Установите токен в переменную окружения (Windows PowerShell)
$env:SUPABASE_ACCESS_TOKEN = "ваш_токен_здесь"

# Сгенерировать типы
npx supabase gen types typescript --project-id hdrkyvztkbwbzigfjdbg > src/integrations/supabase/types.ts
```

### Вариант 2: Через Supabase Dashboard

1. Откройте https://supabase.com/dashboard/project/hdrkyvztkbwbzigfjdbg/settings/api
2. В разделе "Project API keys" найдите секцию "TypeScript types"
3. Скопируйте сгенерированные типы
4. Вставьте в файл `src/integrations/supabase/types.ts`

### Вариант 3: Ручное обновление (если автоматическая генерация недоступна)

Откройте `src/integrations/supabase/types.ts` и найдите секцию `initiatives`. Добавьте поля:

В `initiatives.Row`:
```typescript
target_metric_id: string | null
priority: number
```

В `initiatives.Insert`:
```typescript
target_metric_id?: string | null
priority?: number
```

В `initiatives.Update`:
```typescript
target_metric_id?: string | null
priority?: number
```

В `initiatives.Relationships` добавьте:
```typescript
{
  foreignKeyName: "initiatives_target_metric_id_fkey"
  columns: ["target_metric_id"]
  isOneToOne: false
  referencedRelation: "metrics"
  referencedColumns: ["id"]
}
```

## Проверка

После генерации откройте `src/integrations/supabase/types.ts` и проверьте, что в секции `initiatives` есть новые поля `target_metric_id` и `priority`.

