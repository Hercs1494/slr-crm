export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50 text-gray-900">
        <main className="mx-auto max-w-6xl p-4">
        {/* Offline replay starter */}
        <div suppressHydrationWarning>
          {/* @ts-expect-error Server Component includes client part */}
          {require('../../../components/OfflineReplayBoot').default()}
        </div>{children}
        {/* Offline queue UI */}
        <div suppressHydrationWarning>
          {/* @ts-expect-error Server Component includes client part */}
          {require('../../../components/OfflineQueuePanel').default()}
        </div></main>
        <script dangerouslySetInnerHTML={{__html:`if('serviceWorker' in navigator){window.addEventListener('load',()=>{navigator.serviceWorker.register('/sw.js').catch(()=>{});});}`}} />
      </body>
    </html>
  );
}
