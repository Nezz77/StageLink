import AccountEmailAction from './components/AccountEmailAction'
import { emailActionFromHash } from './lib/emailAction'
import { BackendAccountProvider } from './lib/BackendAccountContext'
import React from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import SmsPreferences from './components/SmsPreferences'
import { configuredSmsApiOrigin, smsPreferencesPath } from './lib/smsPreferences'
import './index.css'
import './auth-connection.css'

const emailAction = window.location.pathname === '/' ? emailActionFromHash(window.location.hash) : null
if (emailAction) {
  window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  document.title = 'Account confirmation | StageLink'
}
const smsPage = window.location.pathname.replace(/\/$/, '') === smsPreferencesPath
if (smsPage) document.title = 'SMS preferences | StageLink'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {emailAction ? <BackendAccountProvider><AccountEmailAction action={emailAction} /></BackendAccountProvider> : smsPage ? <SmsPreferences apiOrigin={configuredSmsApiOrigin} /> : <BackendAccountProvider><App /><Analytics /></BackendAccountProvider>}
  </React.StrictMode>,
)
