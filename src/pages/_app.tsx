import '../styles/globals.css'
import { useRouter } from 'next/router'
import AuthGate from '../components/AuthGate'

function MyApp({ Component, pageProps }) {
  const router = useRouter()
  if (router.pathname === '/privacy') {
    return <Component {...pageProps} />
  }
  return (
    <AuthGate>
      <Component {...pageProps} />
    </AuthGate>
  )
}

export default MyApp
