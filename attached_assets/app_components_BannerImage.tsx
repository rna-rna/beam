import Image from 'next/image'

export default function BannerImage() {
  return (
    <div className="w-full max-w-4xl mx-auto my-8 rounded-lg overflow-hidden shadow-lg">
      <Image
        src="/placeholder.svg?height=300&width=1200"
        alt="App banner"
        width={1200}
        height={300}
        className="w-full h-auto object-cover"
      />
    </div>
  )
}

