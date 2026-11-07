<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->
- App state (books, events, purchases) lives in an in-memory store in src/lib/store.ts; it is mock data with no backend, so it resets on reload.

- Keep demo personas, entitlements, learning weights, catalogue metadata and transactions in the reactive in-memory store; simulated session state must not be represented as real authentication or persistent billing.
- Retrieve public Gutendex metadata and Gutenberg text through bounded TanStack server functions; browser CORS prevents direct text access, and callers may never supply arbitrary upstream URLs.
- Bundle a verified six-genre Gutenberg catalogue with authentic excerpts; retrieve/cache full text only when opened, and reserve bounded Gutendex requests for optional imports so upstream outages cannot empty the shelf.
- Render free Gutenberg editions as paginated plain text with no purchase gate; retain the canvas preview only for simulated independent-book protection so long classics stay readable and accessible.
- Render protected reading through the canvas Unscrambler as a demonstration only; never claim it prevents screenshots, scraping or piracy.
