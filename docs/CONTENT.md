# Editing content

Everything on the site that changes from term to term is in **`content/`** (text) and **`public/`** (photos).
You don't need to touch code. Every change is checked automatically: if something is wrong, the check fails with a
message like

```
content/committees.json: 2027/2028: "lina-omar" is not in people.json
```

and the live site stays as it was until you fix it.

## How to make a change

**Easiest (in the browser):** open the file on GitHub → the pencil icon → edit → *Commit changes* → choose
*Create a new branch and start a pull request*. CI checks it (green tick = safe). Merge the pull request and the site
updates in about a minute, on both hosts.

**On your computer:** open the folder in VS Code. The content files have autocomplete and explanations on hover
(from `content/schemas/`), and mistakes are underlined in red. Run `npm run content:check` before you push.

## Start a new term (once a year)

1. Add the new officers to **`content/people.json`** — only people who aren't there yet. Someone who served before
   already has an entry: **reuse it, never create a second one** (their NFC card points to it).

   ```json
   {
     "slug": "lina-omar",
     "memberId": "IES-011",
     "nameEn": "Lina Omar",
     "nameAr": "لينا عمر",
     "specialtyEn": "Electrical Engineering",
     "photo": "/members/lina-omar.jpg",
     "bio": "As the member wrote it. A blank line starts a new paragraph.",
     "highlights": ["One achievement per line."],
     "links": { "linkedin": "https://www.linkedin.com/in/…" }
   }
   ```

   - `slug`: lowercase, `firstname-lastname`. **Permanent** — it becomes `/m/lina-omar` on the NFC card.
   - `memberId`: the next free number. Never reuse an old one.
   - Publish only what the member agreed to (consent form). Never their IEEE number, phone or home area.

2. Add a new entry **at the top** of **`content/committees.json`**. Don't change the old terms; they are the chapter's
   history and still appear on the team page.

   ```json
   {
     "term": "2027/2028",
     "validThru": "08/2028",
     "members": [
       { "person": "qusai-amer", "role": "chair", "year": "5th year" },
       { "person": "lina-omar", "role": "vice", "year": "3rd year" }
     ]
   }
   ```

   `role` is a key from `content/roles.json`. A new position (e.g. Treasurer)? Add it to `roles.json` first:
   `{ "key": "treasurer", "label": "Treasurer", "core": false, "accent": "#0B7A75" }`. The order of `roles.json`
   is the order on the team page; `core: true` puts the role in the Core Team.

3. Set `"currentTerm": "2027/2028"` in **`content/site.json`**.

4. Write the new members' NFC cards: `https://<site>/m/<slug>`. Test on iPhone and Android, then lock the tag.

## Member photos

- Portrait **4:5**, about **640×800 px**, JPEG, under ~150 KB. Save as `public/members/<slug>.jpg`.
- Face in the upper third. Resize and compress with https://squoosh.app (free, in the browser).
- No photo yet? Use `"photo": null`; the site shows the member's initials.

## Add an event

In **`content/events.json`** (the order doesn't matter; the site sorts by date):

```json
{
  "slug": "plc-workshop-2027",
  "titleEn": "PLC Workshop",
  "categoryEn": "Workshop",
  "date": "2027-03-10",
  "locationEn": "Faculty of Engineering",
  "summaryEn": "One sentence for the card.",
  "bodyEn": ["Paragraph one.", "Paragraph two."],
  "image": "/events/plc-workshop-2027/cover.jpg",
  "imageSize": [1600, 1200],
  "thumb": "/events/plc-workshop-2027/cover-card.jpg",
  "imageAlt": "What the photo shows, for blind visitors.",
  "gallery": [{ "src": "/events/plc-workshop-2027/hall.jpg", "alt": "…" }]
}
```

- Events move from *Coming up* to *Past* the day after `date` (Amman time). Announce early with just a title, date and
  place; add the write-up and photos afterwards.
- Photos: put them in `public/events/<slug>/`, max ~1600 px wide. `imageSize` is the cover's real `[width, height]`
  (the check tells you if it's wrong). `thumb` is an ~800 px copy for the cards (optional).
- Every photo needs an `alt` text describing it.

## Other content

| File | What's in it |
|---|---|
| `content/site.json` | Chapter name, slogan, public email, address, social links, current term |
| `content/chapter.json` | Fields of interest (also the join form's interest options, max 7), member benefits, IES publications, timeline, FAQ |
| `content/partners.json` | Branch partners (logo in `public/images/partners/`, with its pixel width and height) |
| `public/games/` | Self-contained HTML projects (see ARCHITECTURE → Extending) |

## Never

- Never delete or rename a person or change a `slug` (NFC cards break). A test blocks it.
- Never edit an old term in `committees.json` except to fix a typo.
- Never put private data (phone numbers, IEEE numbers, addresses) in content files — this repository is public.

---

## دليل سريع بالعربي

**كل المحتوى بمجلد `content/` والصور بمجلد `public/`.** ما في داعي تلمس الكود، وأي غلط بيوقف التحديث برسالة واضحة شو لازم تصلّح.

### بداية سنة جديدة (لجنة جديدة)
1. **الأعضاء الجدد:** ضيفهم على `content/people.json`. العضو القديم ما بتضيفه مرة ثانية، لأنه موجود ورابطه مطبوع على بطاقته.
2. **اللجنة الجديدة:** ضيف بأول ملف `content/committees.json` مدخل جديد فيه السنة، مثل `"2027/2028"`، وقائمة الأعضاء ومناصبهم. **لا تعدّل اللجان القديمة**، لأنها تاريخ الشعبة وبتضل تظهر بصفحة الفريق.
3. **منصب جديد:** إذا في منصب جديد (مثل أمين صندوق)، ضيفه أول على `content/roles.json`.
4. **السنة الحالية:** غيّر `currentTerm` بملف `content/site.json`.
5. **البطاقات:** اكتب بطاقات NFC للأعضاء الجدد بالرابط `/m/<slug>`.

### صورة عضو
- طولية بنسبة 4:5، حوالي 640×800، بصيغة JPG وحجمها أقل من 150KB.
- بتنحط باسم `public/members/<slug>.jpg`.
- بتقدر تصغّرها مجانًا على https://squoosh.app

### فعالية جديدة
- ضيف مدخل جديد على `content/events.json`، وحط صورها بمجلد `public/events/<slug>/`.
- بتنتقل لحالها من "القادمة" لـ "السابقة" بعد تاريخها.

### ممنوع
- **لا تحذف أي عضو ولا تغيّر الـ slug تبعه.** بطاقته بتخرب، والفحص بيمنعك أصلًا.
- **لا تحط بيانات خاصة.** لا أرقام هواتف ولا أرقام IEEE، لأن المستودع عام.

### كيف تعدّل من المتصفح
1. افتح الملف على GitHub، واضغط القلم.
2. عدّل اللي بدك ياه، واضغط **Commit changes**.
3. اختار **Create a new branch and start a pull request**.
4. بس تطلع العلامة الخضرا (الفحوصات نجحت) اعمل **Merge**، والموقع بيتحدث خلال دقيقة.
