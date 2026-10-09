import { useState } from 'react'
import { BottomTabBar, type Tab } from './components/BottomTabBar'
import { ToastProvider } from './components/Toast'
import { TopBar } from './components/TopBar'
import { ScanPage } from './pages/ScanPage'
import { WatchPage } from './pages/WatchPage'
import { ProfilePage } from './pages/ProfilePage'
import { Playground } from './pages/Playground'
import { Onboarding, shouldShowOnboarding } from './components/Onboarding'

const PLAYGROUND = import.meta.env.DEV && new URLSearchParams(window.location.search).has('playground')

export function App() {
  const [tab, setTab] = useState<Tab>('scan')
  const [intro, setIntro] = useState(() => !PLAYGROUND && shouldShowOnboarding())
  const [refreshKey, setRefreshKey] = useState(0)
  const bump = () => setRefreshKey((k) => k + 1)
  const goScan = () => setTab('scan')

  return (
    <ToastProvider>
      <div className="mx-auto min-h-screen max-w-md" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <TopBar />
        <main className="px-4 pb-[calc(88px+env(safe-area-inset-bottom))]">
          {/* Scan stays mounted so switching tabs doesn't throw away a scan. */}
          {PLAYGROUND && <Playground />}
          <div hidden={tab !== 'scan' || PLAYGROUND}>
            <ScanPage onFixed={bump} onGoToWatch={() => setTab('watch')} onShowIntro={() => setIntro(true)} />
          </div>
          {tab === 'watch' && <WatchPage onGoToScan={goScan} key={refreshKey} />}
          {tab === 'profile' && <ProfilePage onGoToScan={goScan} refreshKey={refreshKey} onShowIntro={() => setIntro(true)} />}
        </main>
      </div>
      <BottomTabBar active={tab} onChange={setTab} />
      {intro && (
        <Onboarding
          onDone={() => {
            setIntro(false)
            setTab('scan')
          }}
        />
      )}
    </ToastProvider>
  )
}
