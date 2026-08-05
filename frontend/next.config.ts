import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Empacota apenas o servidor e as dependências realmente usadas, o que deixa
  // a imagem Docker pequena. Não afeta `npm run dev` nem `npm run start`.
  output: "standalone",
};

export default nextConfig;
