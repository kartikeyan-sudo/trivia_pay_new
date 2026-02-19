import React, { useEffect } from 'react'
import { AppProvider, useApp } from './context/AppContext'
import Layout from './layout/Layout'

function ThemedRoot() {
  const { state } = useApp()
  useEffect(() => {
    const root = document.documentElement
    if (state.theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [state.theme])
  return <Layout />
}

export default function App() {
  return (
    <AppProvider>
      <ThemedRoot />
    </AppProvider>
  )
}
