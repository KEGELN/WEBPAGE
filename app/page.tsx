import Link from 'next/link';
import Menubar from "./components/menubar";

export default function Home() {
  return (
    <>
      <h1>Menubar</h1>
      <Menubar />
      <nav>
        <Link href="/home">Home</Link> | <Link href="/player">Player</Link>
      </nav>
    </>
  );
}
