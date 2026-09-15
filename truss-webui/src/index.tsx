/* @refresh reload */
/**
 * Development harness entry.
 *
 * This module is **not** the shipped artefact — it exists only so the Vite dev
 * server has something to serve. It does the one thing a host page does: include
 * the element, which registers itself. `index.html` then mounts the tag exactly
 * as a parent site would, so the harness exercises the zero-config contract
 * rather than a private shortcut.
 */
import './element/truss-calibrator'
