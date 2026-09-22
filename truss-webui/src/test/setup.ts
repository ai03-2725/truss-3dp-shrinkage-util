import '@testing-library/jest-dom/vitest'

// jsdom does not implement <dialog>.showModal()/close(); provide the minimal
// behavior the app relies on (visibility toggle). Modal keyboard/focus
// behavior is provided by the real browser at runtime.
if (typeof window !== 'undefined' && window.HTMLDialogElement) {
  const proto = window.HTMLDialogElement.prototype
  if (!proto.showModal) {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    }
  }
  if (!proto.close) {
    proto.close = function close(this: HTMLDialogElement) {
      this.removeAttribute('open')
    }
  }
}
