set export := true

default:
    @just --list

[group('sync')]
render-personalisation:
    bun src/entries/personalisation.ts render

[group('sync')]
link-personalisation:
    bun src/entries/personalisation.ts link

[group('sync')]
sync-personalisation: render-personalisation link-personalisation

[group('sync')]
link-skills:
    bun src/entries/skills.ts

[group('health')]
doctor:
    bun src/entries/doctor.ts

[group('sync')]
sync: sync-personalisation link-skills

[group('sync')]
sync-profile *args:
    bun src/entries/sync-profile.ts {{args}}

[group('sync')]
mcp *args:
    bun src/entries/mcp.ts {{args}}

[group('services')]
hindsight *args:
    bun src/entries/hindsight.ts {{args}}
