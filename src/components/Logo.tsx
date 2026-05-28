/**
 * Logo — README の B 案（クリームのスクワークルにオレンジカニ）。
 *
 * ルール：
 *  - バッジは正方形・角丸 sizeの 27% 程度（28→8, 56→16, 88→22）
 *  - カニ画像はバッジの中央。サイズはバッジの約 82%
 *  - 画像は public/assets/crab-cutout-orange.svg（PNG 差し替え可）
 */

type Variant = 'badge' | 'plain' | 'app-icon';

interface LogoMarkProps {
  size?: number;
  variant?: Variant;
}

const CRAB_SRC = `${import.meta.env.BASE_URL}assets/crab-cutout-orange.svg`;
const CRAB_APP_ICON_SRC = `${import.meta.env.BASE_URL}assets/crab-orange.svg`;

export function LogoMark({ size = 28, variant = 'badge' }: LogoMarkProps) {
  if (variant === 'plain') {
    return (
      <img
        src={CRAB_SRC}
        width={size}
        height={size}
        style={{ display: 'block', objectFit: 'contain' }}
        alt="GV Science"
      />
    );
  }
  if (variant === 'app-icon') {
    return (
      <img
        src={CRAB_APP_ICON_SRC}
        width={size}
        height={size}
        style={{ display: 'block', borderRadius: size * 0.22 }}
        alt="GV Science"
      />
    );
  }
  // badge
  const inner = Math.round(size * 0.82);
  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        background: 'linear-gradient(135deg, #FFFFFF 0%, #F4EFE6 100%)',
        boxShadow:
          '0 1px 0 rgba(255,255,255,0.7) inset, 0 1px 2px rgba(45,58,42,0.10)',
        border: '0.5px solid rgba(45,58,42,0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      <img
        src={CRAB_SRC}
        width={inner}
        height={inner}
        style={{ display: 'block', objectFit: 'contain' }}
        alt=""
      />
    </div>
  );
}

interface LogoProps {
  size?: number;
  variant?: Variant;
}

export function Logo({ size = 28, variant }: LogoProps) {
  return (
    <div className="logo">
      <LogoMark size={size} variant={variant} />
      <div className="logo-word">
        GV <span className="sci">Science</span>
      </div>
    </div>
  );
}
