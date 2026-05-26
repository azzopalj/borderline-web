import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

// Global styles
const style = document.createElement('style')
style.textContent = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080f1a; color: #fff; overflow-x: hidden; }
  button { font-family: inherit; }
  a { color: inherit; }
`
document.head.appendChild(style)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
