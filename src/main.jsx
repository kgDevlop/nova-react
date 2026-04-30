import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './nova-base.jsx'

// On the prod host, the app only lives at the base URL — any subpath, query,
// or hash is rewritten to "/" before render so deep links can't surface
// stale or unrouted UI states.
if (window.location.hostname === 'nova-offline.com') {
  const { pathname, search, hash } = window.location
  if (pathname !== '/' || search || hash) {
    window.history.replaceState(null, '', '/')
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />)