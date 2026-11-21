import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import SmsPreferences from './components/SmsPreferences'
import { configuredSmsApiOrigin, smsPreferencesPath } from './lib/smsPreferences'
import './index.css'

const smsPage = window.location.pathname.replace(/\/$/, '') === smsPreferencesPath
if (smsPage) document.title = 'SMS preferences | StageLink'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {smsPage ? <SmsPreferences apiOrigin={configuredSmsApiOrigin} /> : <><App /><Analytics /></>}
  </React.StrictMode>,
)
