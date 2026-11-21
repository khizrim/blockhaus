# Blockhaus: Google Play listing (draft)

Everything Play Console asks for on "Main store listing", "App content" and
"Store settings", filled in for the first release. Lines marked **GUESS** are
first versions to check before pasting.

Art: `app/store/play-icon-512.png` (hi-res icon) and
`app/store/feature-graphic.png` (feature graphic), both drawn by
`app/scripts/make-store-art.py`. Screenshots still need taking on a phone
(Play needs 2 to 8, 9:16, at least 1080 px on the short side for the
"promotable" badge).

## Store settings

| Field | Value |
| --- | --- |
| App name | Blockhaus |
| Default language | Russian (ru-RU), with an English (en-US) translation |
| App or game | Game |
| Category | Puzzle |
| Free or paid | Free |
| Contact email | **ASK**: Play shows it publicly, so pick the address yourself |
| Website | **GUESS**: https://github.com/khizrim/blockhaus (or the Netlify web version) |
| Privacy policy URL | https://github.com/khizrim/blockhaus/blob/main/docs/privacy.md |
| Tags | **GUESS**: Puzzle, Merge, Casual, Offline, Single player |

## Russian (ru-RU)

**Short description** (80 characters max, this one is 61):

> Головоломка 6×6: 1 + 2 = 3, равные удваиваются. Соберите 384.

**Full description** (4000 max) **GUESS**, written from the rules screen:

> Blockhaus — спокойная головоломка на поле 6×6.
>
> Перетаскивайте фигуры из лотка на поле. Синяя 1 и красная 2 вместе дают 3, а дальше равные удваиваются: 3, 6, 12 и дальше до 384. Слияния идут цепочкой, и одна удачная фигура может собрать полполя.
>
> Когда тесно, смахните поле: всё съедет в одну сторону, и пары по пути сольются. Сдвиг даётся за каждый лоток и за длинный каскад.
>
> Цель — собрать 384. А потом можно играть дальше на очки.
>
> • Короткое обучение на живом поле
> • Светлая и тёмная тема, своя музыка и звуки
> • Работает без интернета
> • Без рекламы, аккаунтов и сбора данных
> • Русский и английский

## English (en-US)

**Short description** (this one is 55):

> A 6×6 merge puzzle: 1 + 2 = 3, equals double. Make 384.

**Full description** **GUESS**:

> Blockhaus is a calm merge puzzle on a 6×6 board.
>
> Drag pieces from the tray onto the board. A blue 1 and a red 2 make 3, and from there equals double: 3, 6, 12 and on up to 384. Merges chain, so one good piece can clear half the board.
>
> When it gets tight, swipe the board: everything slides one way and pairs merge on the way. You earn a sweep with each tray and for a long cascade.
>
> The goal is a 384. After that, keep going for score.
>
> • A short lesson on a live board
> • Light and dark themes, original music and sounds
> • Plays offline
> • No ads, no accounts, no data collection
> • Russian and English

## App content

**Privacy policy:** the URL above.

**Ads:** No, the app contains no ads.

**App access:** All functionality is available without special access.

**Data safety** (matches `docs/privacy.md`):

- Does the app collect or share any of the required user data types? **No.**
- So the form ends after the first page: no data collected, no data shared.
  Progress and settings stay in on-device storage, which Play does not count
  as collection.

**Content rating (IARC questionnaire)**, expected result: Everyone / 3+ / PEGI 3:

- Category: Game, puzzle.
- Violence, fear, sexuality, language, controlled substances: none.
- Users interact or share content: no. Shares location: no.
- Digital purchases: no. Gambling or simulated gambling: no.

**Target audience:** **GUESS**: 13 and older. Picking under-13 ages pulls the
app into the Families policy (extra review, teacher-approved rules) even
though nothing in the game would fail it. Choose it on purpose if kids are a
target.

**News app:** No. **COVID-19 app:** No. **Government app:** No.
**Financial features:** none. **Health:** none.

**Advertising ID:** the app does not use it. If the Console asks, answer No;
none of the app's dependencies declare `com.google.android.gms.permission.AD_ID`.
