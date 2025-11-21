// Compatibility wrapper so clients using `queries/games/canPlayGame` keep working.
// We re-export both the named and default export so paths with or without the
// explicit export segment resolve correctly.
export { canPlayGame } from "../canPlayGame";
export { canPlayGame as default } from "../canPlayGame";
