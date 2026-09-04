# План исправления H6: копирование вложений при любой связи фича↔гипотеза

## Обзор

`copyAttachmentLinks` уже есть и идемпотентен (`upsert`, `ignoreDuplicates`). Расходятся **моменты вызова**:

| Путь | Сейчас |
|------|--------|
| Create Feature from Hypothesis / `createFeature` с `hypothesis_id` | копирует hypothesis → feature (H2) |
| Discover this feature | копирует feature → hypothesis в mutation на Board |
| Выбор существующей гипотезы в редакторе фичи (update) | **не копирует** |
| Сброс Linked Hypothesis в None | не копирует и не отвязывает файлы |

Старый план вложений (`[IMPLEMENTED] implementation-plan-attachment-links.md`, допущение 3) и `docs/general/board-page.md` сознательно **не** копировали при ручной смене Linked Hypothesis. Аудит H6 считает это дырой: два из трёх способов связать сущности делят файлы, третий — нет. Этот план **перекрывает** старое допущение: связь = обмен ссылками.

Миграции БД не нужны.

## Проблема

Пользователь не может предсказать, появятся ли файлы у пары фича↔гипотеза: зависит от того, связал он их «создать фичу из гипотезы», «Discover this feature» или combobox на Board.

`copyAttachmentLinks` трогать не нужно — это уже общее правило копирования ссылок. H6 — **когда** вызывать и в какую сторону.

## Цель

1. Одно правило: при **установке или смене** связи feature↔hypothesis скопировать ссылки **в обе стороны** (объединение, без удаления чужих ссылок).
2. Все три пути вызывают один хелпер, не локальный односторонний `copyAttachmentLinks`.
3. Сброс в None и повторный save с тем же `hypothesis_id` ссылки не трогают.
4. Документы, которые говорят «смена Linked Hypothesis не копирует», обновить.

## Канон

**Файл:** `src/lib/attachmentLinks.ts`

```ts
export async function syncAttachmentLinksForFeatureHypothesis(
  featureId: string,
  hypothesisId: string,
): Promise<void> {
  await copyAttachmentLinks("hypothesis", hypothesisId, "feature", featureId);
  await copyAttachmentLinks("feature", featureId, "hypothesis", hypothesisId);
}
```

Порядок: сначала hypothesis → feature, затем feature → hypothesis (во втором проходе на гипотезу попадут и бывшие «только у фичи», и только что скопированные с гипотезы — upsert это переживёт).

Аддитивно: смена гипотезы A → B **не** снимает с фичи файлы, которые пришли от A. Как `copyAttachmentLinks` сейчас. Отвязывать при None тоже не надо.

Не вызывать, если `hypothesisId` пустой/null.

## Где вызывать

### 1. `createFeature` (`src/lib/features.ts`)

Сейчас: `copyAttachmentLinks("hypothesis", …, "feature", created.id)`.

Заменить на `syncAttachmentLinksForFeatureHypothesis(created.id, hypothesis_id)`, если `hypothesis_id` задан.

Покрывает Create Feature from Hypothesis и создание фичи на Board с выбранной гипотезой до первого Save.

### 2. Discover this feature (`BoardPage.saveHypothesisFromFeatureMutation`)

После insert гипотезы и update фичи (`hypothesis_id`, колонка discovery): вместо одностороннего copy — тот же `sync…(featureId, newHypothesis.id)`.

Мутацию в lib не выносить (как в H3).

### 3. Update фичи на Board (`saveFeatureMutation`, ветка `feature.id`)

После успешного `update`:

- взять прежний `hypothesis_id` из кэша `features` (`features.find(f => f.id === feature.id)?.hypothesis_id`);
- если новый `hypothesis_id` не null/не пустой **и** отличается от прежнего — `syncAttachmentLinksForFeatureHypothesis(feature.id, новыйId)`.

Не вызывать: None; тот же id, что уже в БД; черновик без `id` (это ветка createFeature).

`onSuccess` save фичи: инвалидировать ещё `["hypothesis_attachments"]` (сейчас только `feature_attachments` / `attachment_link_flags`).

## Вне скоупа

- Клон гипотезы (уже hypothesis → hypothesis).
- Снимать ссылки при None или при смене A → B.
- Переписывать upsert внутри `copyAttachmentLinks`.
- H7 `product_id` на update.
- Попап вложений, загрузка файлов (M9).

## Документация

Обновить в одном духе:

- `docs/general/board-page.md` — сейчас: смена Linked Hypothesis не копирует. Станет: при выборе гипотезы ссылки копируются в обе стороны (как Create Feature / Discover); None и повторный save с той же гипотезой ссылки не меняют.
- `docs/implementation-plans/[IMPLEMENTED] implementation-plan-attachment-links.md` — допущение 3 снять или пометить перекрытым H6.
- `docs/testing-checklists/testing-checklist-attachment-links.md` сценарий 6.4: смена Linked Hypothesis **добавляет** на фичу ссылки выбранной гипотезы (и наоборот); уже бывшие ссылки фичи не удаляются.

## Шаги

1. Хелпер `syncAttachmentLinksForFeatureHypothesis` в `attachmentLinks.ts`.
2. `createFeature` перевести на него.
3. Discover this feature — тот же вызов.
4. Board update — сравнение со старым `hypothesis_id`, вызов, invalidate `hypothesis_attachments`.
5. Три абзаца в доках выше.

## Проверка вручную

1. Гипотеза с файлом A → Create Feature: у фичи есть A; у гипотезы по-прежнему A.
2. Фича с файлом B → Discover this feature: у новой гипотезы есть B; у фичи B на месте.
3. Фича без гипотезы, файл C; выбрать существующую гипотезу с файлом D → Save: у фичи C и D, у гипотезы C и D.
4. Сменить гипотезу A → B: файлы B появляются у фичи; файлы, пришедшие от A, **остаются**.
5. None → Save: связи с файлами не снимаются, копирования нет.
6. Save фичи без смены гипотезы: лишних запросов копирования нет (поведение файлов то же).
7. Клон гипотезы по-прежнему копирует hypothesis → hypothesis.

## Критерий готовности H6

- Grep `copyAttachmentLinks` в `src/pages`: только клон гипотезы (и не Board Discover / не create на странице).
- `createFeature` и Discover и Board-update при смене `hypothesis_id` зовут `syncAttachmentLinksForFeatureHypothesis`.
- `docs/general/board-page.md` больше не утверждает, что смена Linked Hypothesis не копирует.

## Оценка

Небольшой объём, без SQL. Риск — копировать на каждый Save (лечить сравнением id) и забыть invalidate `hypothesis_attachments` на Board. Старый чеклист 6.4 после H6 должен быть зелёным уже по новым ожиданиям.

## Сводка по итогам

Сделано. `syncAttachmentLinksForFeatureHypothesis` копирует ссылки в обе стороны. Вызовы: `createFeature`, Discover this feature, Board update при смене `hypothesis_id`. None и тот же id — без копирования. Клон гипотезы остался на `copyAttachmentLinks`. Доки board-page / attachment-links / чеклист 6.4 обновлены.
