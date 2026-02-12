/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',  // Statik HTML çıktısı (out klasörü) oluşturur
  images: {
    unoptimized: true, // Statik export'ta Next.js Image optimizasyonu çalışmaz, bunu kapatmalıyız
  },
};

export default nextConfig;