import { render } from 'solid-js/web'
import './styles/global.css'
import './local.css'
import App from './App.tsx'

const root = document.getElementById('root')

render(() => <App />, root!)
