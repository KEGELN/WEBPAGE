import Image from 'next/image';

export default function HomePage() {
  return (
    <>
      <Image src="/app/images/test1.png" alt="Test image" width={1200} height={800} className="max-w-full h-auto" />
    </>
  );
}
