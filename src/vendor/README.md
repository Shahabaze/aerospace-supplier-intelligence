# Vendored Libraries

Pinned local copies of third-party libraries (DEC-016). They are served from this repository, so the application does not depend on any external CDN at run time.

| Library | Version | File | Licence | Source |
|---|---|---|---|---|
| Papa Parse | 5.7.1 | `papaparse-5.7.1.min.js` | MIT – `papaparse-LICENSE.txt` | npm package `papaparse@5.7.1`, file `papaparse.min.js` |
| Chart.js | 4.6.1 | `chart-4.6.1.umd.min.js` | MIT – `chartjs-LICENSE.md` | npm package `chart.js@4.6.1`, file `dist/chart.umd.min.js` |

## Integrity (SHA-256)

```text
e032656b2c709e9a756d5be817da9885d58b2313c43d432c414eb8534a752685  papaparse-5.7.1.min.js
87364cc2b2a76a6684929e7d6b80b18a897794db38400caff1fcf1791c6925d2  chart-4.6.1.umd.min.js
```

Files are copied unmodified from the official npm packages. To upgrade, add the new versioned file, update the references in `index.html` and the test pages, record the change in `docs/decision-log.md`, and re-run all tests.
