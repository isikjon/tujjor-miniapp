import { createRoot } from 'react-dom/client'
import { LabApp } from './LabApp'
import './lab.css'

export function bootLab() {
  document.title = 'TUJJOR · Design Lab'
  document.documentElement.setAttribute('data-lab', '')
  createRoot(document.getElementById('root')!).render(<LabApp />)
}
