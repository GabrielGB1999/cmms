#!/usr/bin/env python3
"""PostToolUse hook (Edit | Write | MultiEdit).

Advisory only -- never blocks. Reads the hook payload on stdin, looks at the file
that was just edited, and feeds Claude context reminders for the footguns in
CLAUDE.md that a diff alone won't surface:

  - JPA entity changed   -> Liquibase changeset + master.xml include + Envers _aud column
  - enum changed          -> ordinals in SMALLINT, append only
  - patch mapper changed  -> MapStruct null-wipe unless NullValuePropertyMappingStrategy.IGNORE
  - new Redux slice       -> must be registered in store/rootReducer.ts
  - model type changed    -> hand-synced mirror in the other client
  - work-order-report     -> #{...} keys resolve against mailMessages*.properties
  - load-bearing infra    -> .npmrc / master.xml

Output contract: print a JSON object on stdout with
hookSpecificOutput.additionalContext (injected for Claude) and the same text on
stderr (visible in the transcript). Always exit 0.

stdlib only -- runs under any Python 3.
"""

import json
import os
import re
import sys


def main() -> int:
    try:
        raw = sys.stdin.read()
    except Exception:
        return 0
    try:
        payload = json.loads(raw or "{}")
    except Exception:
        return 0

    tool_input = payload.get("tool_input") or {}
    file_path = (
        tool_input.get("file_path")
        or tool_input.get("path")
        or tool_input.get("notebook_path")
        or ""
    )
    if not file_path:
        return 0

    project_dir = os.environ.get("CLAUDE_PROJECT_DIR") or payload.get("cwd") or os.getcwd()

    fp = file_path.replace("\\", "/")
    pd = project_dir.replace("\\", "/").rstrip("/")

    if fp.startswith(pd + "/"):
        rel = fp[len(pd) + 1 :]
    else:
        marker = "/claudecmmsmod/"
        idx = fp.find(marker)
        if idx == -1:
            return 0
        rel = fp[idx + len(marker) :]

    abs_path = os.path.join(project_dir, rel.replace("/", os.sep))

    def read_safe(p: str):
        try:
            with open(p, "r", encoding="utf-8", errors="replace") as fh:
                return fh.read()
        except Exception:
            return None

    def exists(relpath: str) -> bool:
        return os.path.exists(os.path.join(project_dir, relpath.replace("/", os.sep)))

    notes = []

    # 1. JPA entities and mapped superclasses -------------------------------
    if re.match(r"^api/src/main/java/com/grash/model/.+\.java$", rel) and "/model/enums/" not in rel:
        notes.append(
            f"Entity changed: {rel}\n"
            "  - ddl-auto is `validate` -- a schema mismatch stops Hibernate from starting. "
            'Add a changeset: `cd api && node scripts/generate-liquibase.js --author="Name" --name="what_it_does"` '
            "(it also registers the <include> in db/master.xml).\n"
            "  - New table? It needs an explicit <createSequence> `<table>_seq` incrementBy 50.\n"
            "  - If a field's TYPE changed and the entity is @Audited, the matching `*_aud` Envers "
            "table column must change too."
        )

    # 2. Enums (ordinals in SMALLINT) -------------------------------------
    if re.match(r"^api/src/main/java/com/grash/model/enums/.+\.java$", rel):
        notes.append(
            f"Enum changed: {rel}\n"
            "  - Enums persist as ORDINALS in SMALLINT columns. Inserting a value mid-list renumbers "
            "every value after it and silently corrupts existing rows -- always APPEND. "
            "See db/changelog/2026_01_10_1768015926_enums_type.xml."
        )

    # 3. MapStruct patch mappers -- the null-wipe latent bug --------------
    if re.match(r"^api/src/main/java/com/grash/mapper/.+Mapper\.java$", rel):
        src = read_safe(abs_path) or ""
        touches_patch = "@MappingTarget" in src and "Patch" in src
        guarded = "NullValuePropertyMappingStrategy.IGNORE" in src
        if touches_patch and not guarded:
            notes.append(
                f"Mapper changed: {rel}\n"
                "  - This has an @MappingTarget update method taking a Patch DTO but no "
                "`@BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)`. "
                "MapStruct's default update mapping writes `null` for every DTO field not sent, wiping the "
                "rest of the row and tripping @NotNull. See WorkOrderDiscrepancyMapper for the guarded pattern."
            )

    # 4. New Redux slice must be registered in rootReducer.ts ------------
    if re.match(r"^frontend/src/slices/.+\.ts$", rel) and not rel.endswith(".test.ts"):
        stem = os.path.splitext(os.path.basename(rel))[0]
        root_reducer = read_safe(os.path.join(project_dir, "frontend", "src", "store", "rootReducer.ts"))
        if root_reducer and f"slices/{stem}" not in root_reducer:
            notes.append(
                f"Slice touched: {rel}\n"
                f"  - `{stem}` is not imported in frontend/src/store/rootReducer.ts. "
                "Every slice must be registered there or the `useSelector` destructure throws at runtime."
            )

    # 5. Hand-synced model types (frontend/src/models/owns <-> mobile/models)
    m1 = re.match(r"^frontend/src/models/owns/(.+)$", rel)
    m2 = re.match(r"^mobile/models/(.+)$", rel)
    if m1:
        twin = f"mobile/models/{m1.group(1)}"
        if exists(twin):
            notes.append(
                f"Model type changed: {rel}\n"
                f"  - Its hand-synced mirror `{twin}` exists and must be kept in sync "
                "(there is no shared package)."
            )
        else:
            notes.append(
                f"Model type changed: {rel}\n"
                f"  - No mirror at `{twin}` yet -- if mobile needs this type, add it there too."
            )
    elif m2:
        twin = f"frontend/src/models/owns/{m2.group(1)}"
        if exists(twin):
            notes.append(
                f"Model type changed: {rel}\n"
                f"  - Its hand-synced mirror `{twin}` exists and must be kept in sync."
            )

    # 6. Work order PDF report template -- different message bundle ------
    if rel.endswith("work-order-report.html"):
        notes.append(
            f"PDF report template changed: {rel}\n"
            "  - Its `#{...}` keys resolve against `mailMessages*.properties`, NOT `messages*.properties` "
            "(see configuration/EmailConfiguration). 14 locale files, ISO-8859-1, non-ASCII as \\uXXXX."
        )

    # 7. Load-bearing infra files ---------------------------------------
    if rel in ("frontend/.npmrc", "mobile/.npmrc"):
        notes.append(
            f"{rel} changed -- `legacy-peer-deps=true` is load-bearing (i18next 25 wants TS 5, the "
            "project pins 4.7). Removing it breaks `npm ci` in Docker with ERESOLVE."
        )
    if rel == "api/src/main/resources/db/master.xml":
        notes.append(
            "master.xml changed -- it is an append-only <include> list. Merge conflicts here are "
            'always "keep both sides".'
        )

    if not notes:
        return 0

    text = "CLAUDE.md reminders for this edit:\n\n" + "\n\n".join(notes)
    sys.stderr.write(text + "\n")
    sys.stdout.write(
        json.dumps(
            {
                "hookSpecificOutput": {
                    "hookEventName": "PostToolUse",
                    "additionalContext": text,
                }
            }
        )
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
