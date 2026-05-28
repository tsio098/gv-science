/**
 * Icon — 24px viewBox, stroke 1.7、round caps。線が太すぎないように。
 * `currentColor` で色を継承するので、利用側で CSS の `color` を当てて色を決める。
 */
import type { SVGProps } from 'react';

type IconBaseProps = SVGProps<SVGSVGElement> & { size?: number };

function svgProps(size: number): SVGProps<SVGSVGElement> {
  return {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };
}

export const FlaskIcon = ({ size = 22, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <path d="M9 3h6" />
    <path d="M10 3v5l-4.5 9a2 2 0 0 0 1.8 3h9.4a2 2 0 0 0 1.8-3L14 8V3" />
    <path d="M7.5 14h9" />
    <circle cx="10" cy="17" r="0.6" fill="currentColor" stroke="none" />
    <circle cx="13.5" cy="16" r="0.6" fill="currentColor" stroke="none" />
  </svg>
);

export const LeafIcon = ({ size = 22, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <path d="M5 19c0-9 6-15 15-15 0 9-6 15-15 15Z" />
    <path d="M5 19 13 11" />
  </svg>
);

export const EarthIcon = ({ size = 22, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M3.5 12h17M12 3.5c2.5 3 2.5 14 0 17M12 3.5c-2.5 3-2.5 14 0 17" />
  </svg>
);

export const CalendarIcon = ({ size = 22, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
);

export const PencilIcon = ({ size = 22, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <path d="m4 20 1-4 11-11a2.121 2.121 0 0 1 3 3l-11 11-4 1Z" />
    <path d="m14 7 3 3" />
  </svg>
);

export const BookIcon = ({ size = 22, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5v-15Z" />
    <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5A2.5 2.5 0 0 1 4 20.5Z" />
  </svg>
);

export const ShareIcon = ({ size = 22, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <path d="m4 20 17-8L4 4l4 8-4 8Z" />
    <path d="m8 12 13 0" />
  </svg>
);

export const ChartIcon = ({ size = 22, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <path d="M4 20V8M10 20V4M16 20v-7M22 20H2" />
  </svg>
);

export const ChevRightIcon = ({ size = 14, ...rest }: IconBaseProps) => (
  <svg
    width={size * (8 / 14)}
    height={size}
    viewBox="0 0 8 14"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <path d="m1 1 6 6-6 6" />
  </svg>
);

export const ChevLeftIcon = ({ size = 14, ...rest }: IconBaseProps) => (
  <svg
    width={size * (8 / 14)}
    height={size}
    viewBox="0 0 8 14"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.7}
    strokeLinecap="round"
    strokeLinejoin="round"
    {...rest}
  >
    <path d="M7 1 1 7l6 6" />
  </svg>
);

export const DownloadIcon = ({ size = 18, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <path d="M12 4v12M6 11l6 6 6-6M4 20h16" />
  </svg>
);

export const PlayIcon = ({ size = 18, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="m10 8.5 6 3.5-6 3.5v-7Z" fill="currentColor" stroke="none" />
  </svg>
);

export const ExtIcon = ({ size = 14, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <path d="M14 4h6v6M20 4 10 14M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
  </svg>
);

export const SearchIcon = ({ size = 16, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m20 20-4.3-4.3" />
  </svg>
);

export const AlertIcon = ({ size = 22, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <path d="M12 4 2.5 20h19L12 4Z" />
    <path d="M12 10v4M12 17v0.5" />
  </svg>
);

export const CheckIcon = ({ size = 16, ...rest }: IconBaseProps) => (
  <svg {...svgProps(size)} {...rest}>
    <path d="m4 12 5 5 11-11" />
  </svg>
);

/** リスト行で使う右向きシェブロン（薄め）。`.chev` クラスを当てる用 */
export const ChevRow = (props: SVGProps<SVGSVGElement>) => (
  <svg className="chev" viewBox="0 0 8 14" fill="none" {...props}>
    <path
      d="m1 1 6 6-6 6"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);
