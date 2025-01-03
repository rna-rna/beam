
import { Layout } from "@/components/Layout";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";

export default function About() {
  return (
    <Layout>
      <div className="max-w-2xl mx-auto px-4 py-12">
        <h1 className="font-geist-sans text-4xl font-bold mb-8">Beam for all</h1>
        
        <h2 className="font-geist-sans text-l font-semibold mb-4 mt-8">Our Mission</h2>
        <p className="font-geist-mono text-sm leading-relaxed mb-6">
          To provide a seamless platform for organizing, sharing, and collaborating on image collections. We believe in making image management intuitive and enjoyable.
        </p>

        <h2 className="font-geist-sans text-l font-semibold mb-4 mt-8">Features</h2>
        <p className="font-geist-mono text-sm leading-relaxed mb-6">
          • Drag and drop image uploads
          • Smart organization with galleries
          • Real-time collaboration
          • Annotations and comments
          • Responsive design for all devices
        </p>

        <h2 className="font-geist-sans text-l font-semibold mb-4 mt-8">Technology</h2>
        <p className="font-geist-mono text-sm leading-relaxed mb-6">
          Built with modern web technologies including React, TypeScript, and Tailwind CSS. Our platform emphasizes performance, security, and user experience.
        </p>

        <h2 className="font-geist-sans text-l font-semibold mb-4 mt-8">Contact</h2>
        <p className="font-geist-mono text-sm leading-relaxed">
          Have questions or feedback? We'd love to hear from you. Reach out through our support channels or social media.
        </p>
      </div>
    </Layout>
  );
}
