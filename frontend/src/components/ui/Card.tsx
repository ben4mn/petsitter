import type { HTMLAttributes } from 'react';

export function Card({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={`bg-bg border border-rule rounded-[14px] overflow-hidden ${className}`}
      {...rest}
    />
  );
}

export function CardSection({ className = '', ...rest }: HTMLAttributes<HTMLDivElement>) {
  return <div className={`px-5 py-4 ${className}`} {...rest} />;
}
