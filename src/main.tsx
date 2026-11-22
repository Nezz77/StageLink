import React, { useLayoutEffect, useState } from 'react'
import ReactDOM from 'react-dom/client'
import { Analytics } from '@vercel/analytics/react'
import App from './App'
import SmsPreferences from './components/SmsPreferences'
import AccountEmailAction from './components/AccountEmailAction'
import { BackendAccountProvider } from './lib/BackendAccountContext'
import { emailActionFromHash } from './lib/emailAction'
import { configuredSmsApiOrigin, smsPreferencesPath } from './lib/smsPreferences'
import './index.css'
import './auth-connection.css'

function consumeEmailAction() {
  const action = emailActionFromHash(window.location.hash)
  if (action) window.history.replaceState(window.history.state, '', window.location.pathname + window.location.search)
  return action
}
const initialEmailAction = consumeEmailAction()
const smsPage = window.location.pathname.replace(/\/$/, '') === smsPreferencesPath

function Root() {
  const [emailRoute, setEmailRoute] = useState(initialEmailAction ? { action: initialEmailAction, version: 0 } : null)
  const emailAction = emailRoute?.action ?? null
  useLayoutEffect(() => {
    const read = () => { const action = consumeEmailAction(); if (action) setEmailRoute(previous => ({ action, version: (previous?.version ?? 0) + 1 })) }
    window.addEventListener('hashchange', read, true)
    return () => window.removeEventListener('hashchange', read, true)
  }, [])
  document.title = emailAction ? 'Account confirmation | StageLink' : smsPage ? 'SMS preferences | StageLink' : 'StageLink'
  return emailAction ? <BackendAccountProvider><AccountEmailAction key={emailRoute?.version} action={emailAction} /></BackendAccountProvider> :
    smsPage ? <SmsPreferences apiOrigin={configuredSmsApiOrigin} /> :
    <BackendAccountProvider><App /><Analytics /></BackendAccountProvider>
}
ReactDOM.createRoot(document.getElementById('root')!).render(<React.StrictMode><Root /></React.StrictMode>)
