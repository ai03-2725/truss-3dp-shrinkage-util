/**
 * Vitest setup file.
 *
 * Registers the jest-dom matchers on Vitest's `expect`, so component tests can
 * assert on accessibility-relevant DOM state (`toBeInTheDocument`,
 * `toBeDisabled`, `toHaveAccessibleDescription`, …).
 */
import '@testing-library/jest-dom/vitest'

import { cleanup } from '@solidjs/testing-library'
import { afterEach } from 'vitest'

/**
 * Unmount and clear the DOM between tests.
 *
 * The testing library only registers its own auto-cleanup when the test
 * framework's globals are enabled; with explicit imports it has to be wired up
 * here. Without this, each test's `render` accumulates on top of the last one
 * and queries start matching a previous test's elements — which reads as a
 * bizarre component bug rather than as a missing teardown.
 */
afterEach(() => {
  cleanup()
})
