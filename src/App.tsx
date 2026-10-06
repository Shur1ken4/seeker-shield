import { useState } from 'react'
import { BottomTabBar, type Tab } from './components/BottomTabBar'
import { ToastProvider } from './components/Toast'
import { TopBar } from './components/TopBar'
import { ScanPage } from './pages/ScanPage'
import { WatchPage } from './pages/WatchPage'
import { ProfilePage } from './pages/ProfilePage'

export function App() {
  const [tab, setTab] = useState<Tab>('scan')
  return (
    <ToastProvider>
      <div className="mx-auto min-h-screen max-w-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <TopBar />
        <main className="px-4 pb-[calc(88px+env(safe-area-inset-bottom))]">
          {tab === 'scan' && <ScanPage />}
          {tab === 'watch' && <WatchPage />}
          {tab === 'profile' && <ProfilePage />}
        </main>
      </div>
      <BottomTabBar active={tab} onChange={setTab} />
    </ToastProvider>
  )
}
