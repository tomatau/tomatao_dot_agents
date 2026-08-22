set export := true

default:
    @just --list

[group('sync')]
render-personalisation:
    bun src/sync/personalisation.ts render

[group('sync')]
link-personalisation:
    bun src/sync/personalisation.ts link

[group('sync')]
sync-personalisation: render-personalisation link-personalisation

[group('health')]
doctor:
    bun src/doctor.ts

[group('sync')]
sync: sync-personalisation
