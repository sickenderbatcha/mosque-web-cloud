import { type SVGProps } from "react";

const MuslimGraveIcon = ({ className, ...props }: SVGProps<SVGSVGElement> & { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    width={24}
    height={24}
    {...props}
  >
    {/* Gravestone body */}
    <path d="M7 22V10a5 5 0 0 1 10 0v12" />
    {/* Ground line */}
    <line x1="4" y1="22" x2="20" y2="22" />
    {/* Crescent moon on top */}
    <path d="M12 4a2.5 2.5 0 0 1 0 5 2 2 0 0 0 0-5z" />
  </svg>
);

export default MuslimGraveIcon;
