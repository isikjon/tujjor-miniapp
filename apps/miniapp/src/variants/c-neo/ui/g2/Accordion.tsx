import { ChevronDown } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { Tap } from '../../../../shared/ui/Tap'

/** Editorial accordion: display-face title, mono meta, rotating chevron; body mounts lazily. */
export function Accordion({ title, meta, defaultOpen, children, id }: { title: string; meta?: ReactNode; defaultOpen?: boolean; children: ReactNode; id?: string }) {
  const [open, setOpen] = useState(!!defaultOpen)
  return (
    <div className="g2-acc" data-open={open} id={id}>
      <Tap flat className="c-acc-head g2-acc-head" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span className="g2-acc-title">{title}</span>
        {meta ? <span className="g2-acc-meta">{meta}</span> : null}
        <ChevronDown className="c-acc-chev" size={20} strokeWidth={2.2} />
      </Tap>
      {open ? <div className="g2-acc-body c-reveal">{children}</div> : null}
    </div>
  )
}
