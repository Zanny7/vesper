# Working on Vesper

## Version control

The user wants consistent version control and proactive Git/GitHub reminders.

- Inspect `git status` before changing files; preserve unrelated user changes.
- Do ongoing development on `dev`. Keep `main` as the stable, tested milestone branch; do not make routine development commits directly on `main`.
- Keep changes focused. Optional feature branches for larger or risky work should start from `dev` and merge back into `dev`.
- At a coherent, tested milestone, recommend a pull request from `dev` to `main`. Explain what is ready and the validation performed; merge when authorized. Keep `dev` in sync with `main` afterward and return the workspace to `dev` for continued work.
- Run the relevant checks before committing. Combat changes should pass `npm test`; gameplay or visual changes should also be checked in the browser when available.
- Recommend a commit at a meaningful, tested milestone and before a risky refactor or experiment. Mention the concrete reason briefly in the progress update or handoff, rather than reminding on every small edit.
- When the user authorizes committing or publishing work, complete the commit and push and report the result. Otherwise, recommend the checkpoint without assuming permission to publish.
- Recommend pushing local commits when they need a remote backup, and a pull request when a feature branch is ready for review. Never force-push, rewrite shared history, or discard user changes without explicit authorization.
- Keep credentials, local dependencies, logs, and temporary artifacts out of Git. Keep repository visibility private unless the user requests otherwise.

## Project checks

- Start locally with `npm start` (or `npm.cmd start` on Windows).
- Run combat tests with `npm test` (or `npm.cmd test`).
- Keep combat rules independent of UI/rendering, and tuning values in `src/data.js`.
