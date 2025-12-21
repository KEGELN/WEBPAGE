// components/ResultBentoCard.tsx
import { ReactNode } from 'react';

interface ResultBentoCardProps {
  title: string;
  description: string;
  type: string;
  additionalInfo?: string;
  children?: ReactNode;
}

export default function ResultBentoCard({ 
  title, 
  description, 
  type, 
  additionalInfo,
  children 
}: ResultBentoCardProps) {
  return (
    <div className="magic-bento-card magic-bento-card--border-glow group">
      <div className="magic-bento-card__header">
        <div className="magic-bento-card__label bg-primary/20 text-primary px-3 py-1 rounded-full text-sm">
          {type}
        </div>
      </div>
      <div className="magic-bento-card__content">
        <h2 className="magic-bento-card__title text-xl font-semibold">{title}</h2>
        <p className="magic-bento-card__description text-muted-foreground">{description}</p>
        {additionalInfo && (
          <p className="magic-bento-card__description text-sm mt-2 text-muted-foreground">{additionalInfo}</p>
        )}
        {children}
      </div>
    </div>
  );
}