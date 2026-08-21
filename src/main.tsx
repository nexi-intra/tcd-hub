import { createRoot } from 'react-dom/client'
import { ErrorBoundary } from "react-error-boundary";
import "@github/spark/spark"
import { sessionKv } from './lib/sessionKvStore'

import App from './App.tsx'
import { ErrorFallback } from './ErrorFallback.tsx'

import "./main.css"

// Replace the Spark KV service (requires a live Spark runtime) with an in-memory
// store, so data can be tested locally — it resets on every reload/close of the tab.
window.spark.kv = sessionKv as typeof window.spark.kv

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary FallbackComponent={ErrorFallback}>
    <App />
   </ErrorBoundary>
)
