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
- Load catalogue metadata on hydration and fetch/cache text only for opened titles; bounded topic pagination and ID deduplication keep memory and upstream requests controlled.
- Render protected reading through the canvas Unscrambler as a demonstration only; never claim it prevents screenshots, scraping or piracy.
