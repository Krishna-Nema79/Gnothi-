# Gnōthi: know thyself

A working prototype of Gnōthi, a personal intelligence app for health and habits. Built for wHACKiest 2026 (problem statement 03, Know Thyself).

Gnōthi combines sleep, steps, heart rate, late-night phone use, caffeine, mood and energy. It finds what actually affects *your* sleep, energy and mood, and lets you test a change with a 7-day self-experiment. Everything runs in the browser. There is no server, no account and no upload.

## Run it locally

No build step and no dependencies. Either:

- open `index.html` in a browser, or
- serve the folder (recommended):

```bash
cd gnothi-app
python3 -m http.server 8000
# then open http://localhost:8000
```

## Host it online (free)

- **Netlify Drop:** go to https://app.netlify.com/drop and drag this folder in.
- **GitHub Pages:** push the folder to a repo, then Settings → Pages → deploy from the `main` branch, root folder.
- **Vercel:** `npx vercel` inside the folder, or import the repo on vercel.com.

## Folder structure

```
gnothi-app/
├── index.html        # page structure: Today, Why?, Experiments, Check-in, Vault
├── css/styles.css    # design tokens, layout, light + dark theme, mobile layout
├── js/app.js         # data model, statistics engine, charts, routing, storage
├── sample-data.csv   # 45 days of sample data to test the CSV import
└── README.md
```

## How it works

| Part | What it does |
|---|---|
| Data | Stored in the browser's `localStorage` (key `gnothi.v1`). Starts with 45 days of simulated sample data. |
| Personal baseline | Each metric is compared with your own previous 14 days (mean and standard deviation). |
| "Why?" engine | For each factor and outcome pair, days are split at the factor's median and the outcome means are compared with Welch's t-test. Each link gets a confidence label (strong / likely / possible / no clear link). |
| Experiments | A 7-day trial is compared with the 14 days before it, using the same test. "Simulate the rest of the week" fills the trial instantly for demos. |
| Vault | Shows everything stored. You can export CSV, import CSV or delete everything. |

### CSV format

```
date,sleep,steps,rhr,late,caffeine,mood,energy
2026-11-01,7.12,8204,63,25,0,4,3
```

`sleep` is in hours, `late` is minutes of phone use after 11 pm, `caffeine` is cups after 3 pm, and `mood` / `energy` are on a 1–5 scale. Import needs at least 14 valid days.

## Prototype notes

- Sleep, steps and heart rate are simulated here. The Android app would read them from Health Connect.
- Explanations come from fixed templates. The full design uses an on-device model (Gemma 2B via MediaPipe).
- Fonts load from Google Fonts. No health data is ever sent anywhere.
- Gnōthi is a wellbeing tool, not a medical device. It does not diagnose anything.
