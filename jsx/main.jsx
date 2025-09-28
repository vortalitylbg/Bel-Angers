import React from 'react'
import { createRoot } from 'react-dom/client'
import LiquidNavbar from './liquidNavbar.jsx'

const rootElement = document.getElementById('liquid-navbar')
if (rootElement) {
  const root = createRoot(rootElement)
  root.render(<LiquidNavbar />)
}
