---
name: Scaffold RPGJS Starter (Updated)
overview: Scaffold the RPGJS starter project while preserving all .gitkeep files and the agent system structure. The .gitkeep files ensure empty directories are tracked by git, which is important for the agent system scaffolding.
todos:
  - id: remove_modules
    content: Remove empty src/modules/ directory structure (will be replaced by starter)
    status: completed
  - id: scaffold_starter
    content: Run npx degit rpgjs/starter . to scaffold RPGJS starter project
    status: completed
    dependencies:
      - remove_modules
  - id: verify_preservation
    content: Verify AGENTS.md, .cursor/, .ai/, docs/, src/agents/ (with .gitkeep files), and src/config/ are preserved
    status: completed
    dependencies:
      - scaffold_starter
  - id: install_deps
    content: Run npm install to install RPGJS dependencies
    status: completed
    dependencies:
      - verify_preservation
  - id: verify_structure
    content: Confirm final project structure has both RPGJS game files and agent system scaffolding with .gitkeep files
    status: completed
    dependencies:
      - install_deps
---

# Scaffold RPGJS Starter Project (Updated)

## Overview

Scaffold the RPGJS starter using `degit`, preserving all `.gitkeep` files and the agent system directories. The `.gitkeep` files ensure empty directories are tracked by git, which is important for maintaining the agent system structure.

## Steps

### 1. Preserve All .gitkeep Files

- **Keep all `.gitkeep` files** - they serve to track empty directories in git
- Important directories to preserve:
- `src/agents/core/.gitkeep`
- `src/agents/memory/.gitkeep`
- `src/agents/bridge/.gitkeep`
- `src/agents/skills/.gitkeep`
- `src/agents/perception/.gitkeep`
- `src/config/.gitkeep`
- `maps/.gitkeep` (starter may populate, but keep as fallback)
- `assets/sprites/.gitkeep` (starter may populate, but keep as fallback)
- `assets/tilesets/.gitkeep` (starter may populate, but keep as fallback)

### 2. Remove Only Empty src/modules/ Structure

- Remove the empty `src/modules/` directory structure
- This will be completely replaced by the RPGJS starter
- The starter will create `src/modules/main/` with proper game code

### 3. Scaffold RPGJS Starter

- Run `npx degit rpgjs/starter .` to scaffold into current directory
- The `degit` command will:
- Preserve existing files (AGENTS.md, .cursor/, .ai/, docs/, src/agents/, src/config/)
- Create `src/modules/main/` with server/client structure
- Add `package.json`, `rpg.toml`, `tsconfig.json`, etc.
- Add game assets, maps, and configuration files
- May populate `maps/` and `assets/` directories (which is fine - real files take precedence over .gitkeep)

### 4. Verify Preservation

- Check that critical files are intact:
- `AGENTS.md` (root)
- `.cursor/` directory
- `.ai/` directory
- `docs/` directory
- `src/agents/` directory structure with all .gitkeep files
- `src/config/.gitkeep`
- If anything was overwritten, restore from git

### 5. Install Dependencies

- Run `npm install` to install RPGJS dependencies
- Verify `package.json` includes RPGJS packages

### 6. Verify Final Structure

- Confirm the final structure has:
- RPGJS game files in `src/modules/main/`
- Agent system scaffolding in `src/agents/` (with .gitkeep files)
- Project docs in root and `docs/`
- Configuration files (package.json, rpg.toml, tsconfig.json)
- Empty directories still tracked via .gitkeep where needed

## Files to Remove

- `src/modules/` directory (entire empty structure - will be replaced by starter)

## Files to Preserve

- **All `.gitkeep` files** (they track empty directories)
- All files in `src/agents/` (including .gitkeep files)
- `src/config/.gitkeep`
- `AGENTS.md`
- `.cursor/` directory
- `.ai/` directory
- `docs/` directory
- `.gitignore`

## Expected Outcome

After scaffolding, the project will have:

- Complete RPGJS starter structure with working game code
- Preserved agent system directory scaffolding with .gitkeep files
- All project documentation intact