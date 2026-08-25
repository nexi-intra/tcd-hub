import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import { localKv } from './lib/localKvStore'

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"

// Global KV handle used throughout the app; persists locally via localStorage.
window.kv = localKv

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
