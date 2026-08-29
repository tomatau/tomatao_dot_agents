# health

Reporting on whether the rest of the repo's wiring is intact.

- It reads and never repairs. Every check here has a counterpart command that
  does the fixing; if a check cannot be explained by one, it is in the wrong
  place.
- It is the one domain that legitimately reaches across the others, because
  reporting on them is its whole purpose.
- It receives what it inspects rather than resolving it, so a command stays the
  place where sources are composed.
