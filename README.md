# Swipepage

SwipePage is a proof of concept for discovering books by their first page. Readers see the opening of a book, and the feed learns from what they do: how long they read, what they open, save or skip. It uses that to choose the next card, and it shows why each book was picked.

The shelf holds 72 public-domain classics from Project Gutenberg across six genres. Writers can publish their own work through the Author Studio. All accounts, payments and ads are simulated and labelled as demos. Reading progress is saved in the visitor's browser (localStorage), so it survives a reload but not a change of device.

### How the recommendations work

The model lives in `src/lib/reco.ts` and is covered by `src/lib/reco.test.ts`.

- **Engagement per book:** reading time on the opening (with diminishing returns), plus opening the full book, saving it or buying it. Swiping away within 3 seconds counts as a quick skip and lowers the score.
- **Genre taste:** a Bayesian average that starts from the genres picked at sign-up and moves towards the reader's real behaviour within a few cards.
- **Author and theme taste:** each book is tagged with themes (Gothic, sea voyage, detective…). Authors and themes the reader engaged with boost other books that share them, even across genres.
- **Next card:** the unseen book with the highest predicted interest, with a small penalty for repeating a genre. Every fifth card explores the least-seen genre, and no book repeats until the whole shelf has been seen.
- **Comparison mode:** Analytics can switch the feed to random picks and compares time per card, to check that personalisation actually helps.

The in-app **How it works** page explains all of this in plain English.

### How the card passages are chosen

`src/lib/excerpt.ts` (tested in `src/lib/excerpt.test.ts`) picks the most gripping 150 words from the first 10% of each book: it skips front matter, never crosses a chapter break or starts mid-quote, and scores passages on tension, dialogue, pace, drama, unfamiliar names, clarity and whether they stand alone.

To run it over the full text of every bundled book, run `bun run build:passages` with internet access to gutenberg.org. It saves the results into `src/lib/gutenberg-catalogue.json`. Until then, the app searches each book's bundled 500-word opening instead.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://swipepage.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/974f30fe-63b9-44cc-987f-e836fdd8b05c).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
