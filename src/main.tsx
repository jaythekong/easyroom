import { createRoot } from 'react-dom/client'
import { QueryProvider } from './components/QueryProvider'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById("root")!).render(
  <QueryProvider>
    <App />
  </QueryProvider>
);
