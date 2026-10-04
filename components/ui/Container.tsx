import type { ReactNode } from "react";

interface ContainerProps {
  children: ReactNode;
  className?: string;
}

export default function Container({
  children,
  className = "",
}: ContainerProps) {
  return (
    <div
      className={`
        mx-auto
        w-full
        max-w-[1500px]
        px-5
        sm:px-8
        lg:px-12
        xl:px-16
        2xl:px-20
        ${className}
      `}
    >
      {children}
    </div>
  );
}