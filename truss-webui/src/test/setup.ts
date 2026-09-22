import '@testing-library/jest-dom/vitest'

// jsdom does not implement the native dialog methods; provide minimal stubs so
// Modal/Lightbox can be tested (PRD §17).
if (typeof HTMLDialogElement !== 'undefined') {
  const proto = HTMLDialogElement.prototype
  if (!proto.showModal) {
    proto.showModal = function showModal(this: HTMLDialogElement) {
      this.open = true
    }
  }
  if (!proto.close) {
    proto.close = function close(this: HTMLDialogElement) {
      this.open = false
      this.dispatchEvent(new Event('close'))
    }
  }
}

if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock'
  URL.revokeObjectURL = () => {
    /* no-op */
  }
}
