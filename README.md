# NBA Injury Intelligence

An interactive dashboard that explores NBA injury episodes from 2010-11 to 2019-20: which injuries are most common, how risk differs across player archetypes, what the last play before an injury tends to be, how workload relates to injury, and what prevention approaches the research supports.

It is a static site (plain HTML, CSS and JavaScript plus JSON data files), so it can be hosted for free on GitHub Pages.

## Run it locally

The page loads its data files, so it needs a web server (opening `index.html` directly will not work).

```
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Publish with GitHub Pages

1. Push this folder to a GitHub repository.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**, select the `main` branch and the `/ (root)` folder, and save.
4. After a minute or two the site is live at `https://<your-username>.github.io/<repository-name>/`.

## What is in this folder

| Path | What it is |
| --- | --- |
| `index.html` | The dashboard page and its charts |
| `runtime.js` | Loads the data files and feeds them to the page |
| `styles.css` | Colors, spacing and dark-mode theme |
| `data/*.json` | The 24 datasets behind every number and chart |
| `vendor/d3.min.js` | [D3](https://d3js.org) v7, used for drawing charts (ISC license) |

## Data and method

How the data was built (also described in the dashboard's **Method & limits** tab):

- **Injuries:** Pro Sports Transactions injury log, 2010-11 to 2019-20, via the GitHub mirror `gboogy/nba-injury-data-scraper`. Entries are merged into episodes from first absence to logged return; rest, illness, personal and suspension entries are removed. Result: 6,349 new injury episodes across 953 players.
- **Player archetypes:** k-means (k=8) on player-seasons with 400+ minutes, 2009-10 to 2019-20, using data from `jacobbaruch/NBA_data_scraping_and_analysis`.
- **Game context:** ESPN player box scores (sportsdataverse releases).
- **Play-by-play:** NBA stats v3 play-by-play from the `shufinskiy/nba_data` archive, regular season 2010-20.
- **Mechanisms and prevention:** published NBA video-analysis studies, prevention trials and game reporting for 11 case studies.

Check each source's terms before reusing the underlying data, and keep the attribution above if you publish this.

## Limits

- The injury data ends in 2020.
- The findings are descriptive. They are not medical advice and not a validated predictive model.
- Play-by-play gives the last recorded action before a player left, not the exact moment of injury.
- Public injury logs do not record the mechanism of each injury.
- Clip links point to NBA.com pages; the clips themselves are not hosted here.
- The player-level views list individual players' injuries from public logs.

## License

No license has been chosen yet. Add a `LICENSE` file (for example MIT for the code) before inviting reuse. Note that a code license does not cover the third-party data sources above.
