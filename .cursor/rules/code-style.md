# Стиль кода и общие принципы

## Общие принципы

- Проект использует React 18 + TypeScript + Vite
- UI компоненты: shadcn-ui (Radix UI)
- Стилизация: Tailwind CSS
- Backend: Supabase (PostgreSQL)
- State Management: TanStack React Query
- Всегда используй TypeScript с строгой типизацией
- Следуй существующим паттернам кода в проекте

## TypeScript

- Всегда используй строгую типизацию
- Избегай `any`, используй `unknown` если тип неизвестен
- Используй типы из `src/integrations/supabase/types.ts` для работы с БД

## React компоненты

- Используй функциональные компоненты с хуками
- Компоненты должны быть в `src/components/`
- UI компоненты из shadcn-ui в `src/components/ui/`
- Используй существующие паттерны из проекта

## Стилизация

- Используй Tailwind CSS классы
- Следуй существующему дизайн-системе проекта
- Компоненты должны быть responsive (mobile-first подход)

## Работа с Supabase

- Используй клиент из `src/integrations/supabase/client.ts`
- Все запросы через React Query (TanStack Query)
- Используй хуки из `src/hooks/useCrudMutations.ts` для CRUD операций
- Всегда учитывай RLS (Row Level Security) политики
