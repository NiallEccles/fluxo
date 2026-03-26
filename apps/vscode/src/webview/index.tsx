import React from 'react'
import { createRoot } from 'react-dom/client'
import { DiagramView } from './DiagramView'

const container = document.getElementById('root')
if (container) {
  createRoot(container).render(<DiagramView />)
}
