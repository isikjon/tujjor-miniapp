import { useLayoutEffect, useRef, type CSSProperties } from 'react'
import type { ImageRef } from '../types'
import { cx } from '../lib/cx'
import { withBase } from '../lib/base'

const WIDTHS = [240, 400, 640, 1000] as const
const JPEG_WIDTHS = [400, 1000] as const
const BASE = withBase('demo-media')

const srcset = (id: string, ext: string, widths: readonly number[]) => widths.map((w) => `${BASE}/${id}-${w}.${ext} ${w}w`).join(', ')

export interface ImgProps {
  image: ImageRef
  alt: string
  /** CSS `sizes` — the rendered width, e.g. "(max-width: 480px) 46vw, 220px". Drives srcset selection. */
  sizes: string
  className?: string
  imgClassName?: string
  style?: CSSProperties
  /** Above-the-fold hero: eager + high fetch priority. */
  priority?: boolean
  fit?: 'contain' | 'cover'
}

/**
 * Responsive product image: AVIF → WebP → JPEG fallback, width-based srcset, lazy decoding,
 * fixed aspect box (no layout shift) and a tinted placeholder that fades out on load.
 * The fade is driven by a data attribute (no React state → no re-render per image).
 */
export function Img({ image, alt, sizes, className, imgClassName, style, priority, fit = 'contain' }: ImgProps) {
  const ref = useRef<HTMLImageElement>(null)
  useLayoutEffect(() => {
    const img = ref.current
    if (img?.complete && img.naturalWidth) img.dataset.loaded = 'true'
  }, [image.id])
  return (
    <span className={cx('img-box', className)} style={{ aspectRatio: '1 / 1', ...style }}>
      <picture>
        <source type="image/avif" srcSet={srcset(image.id, 'avif', WIDTHS)} sizes={sizes} />
        <source type="image/webp" srcSet={srcset(image.id, 'webp', WIDTHS)} sizes={sizes} />
        <img
          ref={ref}
          key={image.id}
          src={`${BASE}/${image.id}-400.jpg`}
          srcSet={srcset(image.id, 'jpg', JPEG_WIDTHS)}
          sizes={sizes}
          alt={alt}
          width={1000}
          height={1000}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
          fetchPriority={priority ? 'high' : 'auto'}
          draggable={false}
          className={imgClassName}
          style={fit === 'cover' ? { objectFit: 'cover' } : undefined}
          onLoad={(e) => (e.currentTarget.dataset.loaded = 'true')}
          onError={(e) => (e.currentTarget.dataset.loaded = 'true')}
        />
      </picture>
    </span>
  )
}

/** Preload an image (e.g. the hero of a product the user is about to open). */
export function preloadImage(image: ImageRef, width: 400 | 640 | 1000 = 640) {
  const img = new Image()
  img.decoding = 'async'
  img.src = `${BASE}/${image.id}-${width}.webp`
}
