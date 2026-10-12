import { ImageResponse } from 'next/og';
import { SITE } from '@/lib/site';

export const alt = `${SITE.shortName}: ${SITE.slogan}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', background: '#0B1530', position: 'relative', fontFamily: 'sans-serif' }}>
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: 'absolute', left: 0, top: 0 }}>
          <polygon points="820,0 1200,0 1200,630 620,630" fill="#FF6B1A" />
          <polygon points="740,0 790,0 590,630 540,630" fill="#FFC21A" />
        </svg>
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '0 80px', width: 760, color: '#fff' }}>
          <div style={{ fontSize: 26, letterSpacing: 4, color: '#FFC21A', fontWeight: 700 }}>IEEE IES · THE HASHEMITE UNIVERSITY</div>
          <div style={{ fontSize: 96, fontWeight: 800, lineHeight: 1, marginTop: 24, display: 'flex', flexDirection: 'column' }}>
            <span>We Make</span><span>Industry</span><span style={{ color: '#FFC21A' }}>Move</span>
          </div>
          <div style={{ fontSize: 28, marginTop: 28, color: '#C3CEDF' }}>Student chapter · Est. 2026 · IES turns 75</div>
        </div>
      </div>
    ),
    size,
  );
}
