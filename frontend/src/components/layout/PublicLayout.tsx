import { Outlet } from "react-router-dom";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { Logo } from "@/components/layout/Logo";
import { PageTransition } from "@/components/motion/PageTransition";

export function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="bg-ink">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <Logo dark />
          <LanguageSwitch dark />
        </div>
      </header>
      <main className="perspective flex flex-1 items-center justify-center px-4 py-10">
        <PageTransition className="w-full max-w-3xl">
          <Outlet />
        </PageTransition>
      </main>
    </div>
  );
}
