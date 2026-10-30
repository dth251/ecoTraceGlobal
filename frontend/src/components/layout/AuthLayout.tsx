import { Link, Outlet } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { Logo } from "@/components/layout/Logo";
import { PageTransition } from "@/components/motion/PageTransition";
import { Photo, PHOTOS } from "@/components/media/Photo";

/** Bố cục chia đôi cho đăng nhập/đăng ký: panel tối bên trái, biểu mẫu bên phải */
export function AuthLayout() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;

  return (
    <div className="flex min-h-screen bg-ink">
      <aside className="hidden w-[44%] max-w-[620px] flex-col justify-between p-10 text-white lg:flex">
        <Logo dark />
        <div>
          <Photo photo={PHOTOS.workshop} lang={lang} dark aspect="aspect-[16/10]" />
          <h2 className="mt-8 max-w-md text-3xl font-extrabold leading-tight tracking-[-0.02em]">
            {t("authLayout.panelTitle")}
          </h2>
          <p className="mt-3 max-w-md text-base leading-relaxed text-ink-muted">{t("authLayout.panelSubtitle")}</p>
        </div>
        <p className="text-sm text-ink-muted">© {new Date().getFullYear()} EcoTrace Global</p>
      </aside>

      <div className="flex flex-1 flex-col bg-surface lg:my-3 lg:mr-3 lg:rounded-[32px]">
        <header className="flex items-center justify-between gap-3 px-5 py-5 sm:px-8">
          <Link to="/" className="rounded-xl px-2 py-1.5 text-sm font-semibold text-slate-600 hover:text-ink">
            {t("authLayout.backHome")}
          </Link>
          <LanguageSwitch />
        </header>
        <main className="perspective flex flex-1 items-center justify-center px-4 pb-10">
          <PageTransition variant="flip" className="w-full max-w-md">
            <Outlet />
          </PageTransition>
        </main>
      </div>
    </div>
  );
}
