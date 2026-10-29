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

- Visitor favorites store site IDs in browser localStorage through a shared external-store hook; no visitor account is required, and storage is read after hydration to preserve SSR consistency.
- The Guide view is reused by the dedicated favorites route so saved sites retain the same descriptions, photos, weather, and map details as the public guide.
