type BrandMarkProps = {
  className?: string;
  inverted?: boolean;
};

const BrandMark = ({ className, inverted = false }: BrandMarkProps) => (
  <svg
    aria-hidden="true"
    className={className}
    focusable="false"
    viewBox="0 0 256 256"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      width="256"
      height="256"
      rx="56"
      fill={inverted ? "#F7F2E8" : "#123C34"}
    />
    <path
      d="M168 83C154 68 135 60 114 60C76 60 46 90 46 128C46 166 76 196 114 196C137 196 157 186 170 170"
      fill="none"
      stroke={inverted ? "#123C34" : "#F7F2E8"}
      strokeLinecap="round"
      strokeWidth="28"
    />
    <path
      d="M127 128H190V170"
      fill="none"
      stroke="#C75A32"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="28"
    />
  </svg>
);

export default BrandMark;
