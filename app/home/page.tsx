import Link from 'next/link';

export default function HomePage() {
  return (
    <>
      <h1>besonders coole homepage</h1>
      <nav>
        <Link href="/">Back to Home</Link> | <Link href="/player">Player</Link>
      </nav>
    </>
  );
}
