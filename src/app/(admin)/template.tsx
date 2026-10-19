import { FadeIn } from "@/components/motion/fade-in";

// A template (unlike the layout) remounts on every navigation, so each page fades in.
export default function AdminTemplate({ children }: { children: React.ReactNode }) {
  return <FadeIn>{children}</FadeIn>;
}
