// webstudio-utils.js
window.Webstudio ||= []

window.Webstudio.onReady = (callback) => {
  const execute = () => {
    requestAnimationFrame(() => {
      try {
        callback()
      } catch (error) {
        console.error('Webstudio callback error:', error)
      }
    })
  }

  if (document.readyState !== 'loading') {
    setTimeout(execute, 100)
  } else {
    document.addEventListener('DOMContentLoaded', () =>
      setTimeout(execute, 100)
    )
  }
}
