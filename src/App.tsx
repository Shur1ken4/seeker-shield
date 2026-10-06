import { useState } from 'react'
import { BottomTabBar, type Tab } from './components/BottomTabBar'
import { ProSheet } from './components/ProSheet'
import { ToastProvider } from './components/Toast'
import { TopBar } from './components/TopBar'
import { ScanPage } from './pages/ScanPage'
import { WatchPage } from './pages/WatchPage'
import { ProfilePage } from './pages/ProfilePage'

export function App() {
  const [tab, setTab] = useState<Tab>('scan')
  const [proOpen, setProOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const bump = () => setRefreshKey((k) => k + 1)
  const goScan = () => setTab('scan')
  const upgrade = () => setProOpen(true)

  return (
    <ToastProvider>
      <div className="mx-auto min-h-screen max-w-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <TopBar />
        <main className="px-4 pb-[calc(88px+env(safe-area-inset-bottom))]">
          {/* Scan stays mounted so switching tabs doesn't throw away a scan. */}
          <div hidden={tab !== 'scan'}>
            <ScanPage onFixed={bump} onGoToWatch={() => setTab('watch')} />
          </div>
          {tab === 'watch' && <WatchPage onGoToScan={goScan} onUpgrade={upgrade} key={refreshKey} />}
          {tab === 'profile' && <ProfilePage onGoToScan={goScan} onUpgrade={upgrade} refreshKey={refreshKey} />}
        </main>
      </div>
      <BottomTabBar active={tab} onChange={setTab} />
      <ProSheet open={proOpen} onClose={() => setProOpen(false)} onChanged={bump} />
    </ToastProvider>
  )
}
