import Link from 'next/link';
import MagicBento from '@/components/MagicBento'


export default function Player() {
  return (
      <>
          <h1>Player</h1>
          <nav>
              <Link href="/">Home</Link> | <Link href="/home">Homepage</Link>
          </nav>
          <body>
              <p> Here comes text data and some cool animatons for the data and overview </p>
          </body>
      </>
  );
}
