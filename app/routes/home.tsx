import type { Route } from "./+types/home";
import { CyberpunkScene } from "../scenes/cyberpunk/cyberpunkScene";

export function meta({}: Route.MetaArgs) {
  return [
    { title: "Cyberpunk Three" },
    { name: "description", content: "A cyberpunk ThreeJs demo" },
  ];
}

export default function Home() {
  return <CyberpunkScene />;
}
