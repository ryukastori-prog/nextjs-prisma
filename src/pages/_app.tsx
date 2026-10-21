import '../styles/globals.css'
import AuthGate from '../components/AuthGate'

function MyApp({ Component, pageProps }) {
  return (
    <AuthGate>
      <Component {...pageProps} />
    </AuthGate>
  )
}

export default MyApp
