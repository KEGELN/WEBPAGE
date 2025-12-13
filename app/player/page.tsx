import Link from 'next/link';

export default function Player() {
  return (
    <>
      <h1>Player</h1>
      <nav>
        <Link href="/">Home</Link> | <Link href="/home">Homepage</Link>
      </nav>
    </>
  );
}