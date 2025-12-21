// components/PlayerStatsBento.tsx
import { ReactNode } from 'react';

interface PlayerStat {
  label: string;
  value: string | number;
  icon?: ReactNode;
}

interface PlayerStatsBentoProps {
  title: string;
  stats: PlayerStat[];
  description?: string;
  additionalInfo?: string;
  children?: ReactNode;
}

export default function PlayerStatsBento({
  title,
  stats,
  description,
  additionalInfo,
  children
}: PlayerStatsBentoProps) {
  return (
    <div className="magic-bento-card magic-bento-card--border-glow group">
      <div className="magic-bento-card__header">
        <div className="magic-bento-card__label">
          Player Stats
        </div>
      </div>
      <div className="magic-bento-card__content">
        <h2 className="magic-bento-card__title text-xl font-semibold">{title}</h2>
        {description && (
          <p className="magic-bento-card__description">{description}</p>
        )}
        <div className="mt-4 space-y-3">
          {stats.map((stat, index) => (
            <div key={index} className="flex justify-between items-center border-b border-border/30 pb-2">
              <span className="text-foreground/80">{stat.label}</span>
              <span className="font-semibold text-primary">{stat.value}</span>
            </div>
          ))}
        </div>
        {additionalInfo && (
          <p className="magic-bento-card__description text-sm mt-2">{additionalInfo}</p>
        )}
        {children}
      </div>
    </div>
  );
}