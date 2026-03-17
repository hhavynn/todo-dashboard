# Claude Instructions

## Session Start

At the start of every session, read the following memory files to restore context:

- `memory/decisions.md` — architectural and design decisions
- `memory/people.md` — people involved in the project
- `memory/preferences.md` — coding style and workflow preferences
- `memory/user.md` — information about the user

## Session End

At the end of every session (or when significant new information has been learned), update the relevant memory files:

- Add new decisions with date, rationale, and alternatives considered
- Update people entries if new collaborators or context emerged
- Revise preferences if the user corrected or guided your approach
- Update user info if you learned something new about their background or goals

## General Guidelines

- Keep memory files concise and factual — no ephemeral task state
- Prefer updating existing entries over adding duplicates
- Note the date when adding new entries
