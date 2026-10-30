import { lazy, Suspense, type CSSProperties, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { LanguageSwitch } from "@/components/layout/LanguageSwitch";
import { Logo } from "@/components/layout/Logo";
import { Photo, PHOTOS } from "@/components/media/Photo";
import { useReveal } from "@/hooks/useReveal";
import { useAuthStore } from "@/stores/authStore";

function Reveal({ children, delay = 0, className }: { children: ReactNode; delay?: number; className?: string }) {
  const ref = useReveal<HTMLDivElement>();
  return (
    <div ref={ref} className={`reveal ${className ?? ""}`} style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}>
      {children}
    </div>
  );
}

// three.js và mô hình 3D tách chunk riêng, chỉ tải khi mở trang giới thiệu
const FactoryYard = lazy(() => import("@/components/three/FactoryYard"));

const DOC_ROWS = ["electricity", "fuel", "material", "bol"] as const;
const PERIOD_POINTS = ["p1", "p2", "p3"] as const;

const primaryBtn =
  "inline-flex items-center rounded-2xl bg-brand-500 px-6 py-3.5 text-base font-bold text-ink transition-[transform,background-color] duration-hover ease-smooth hover:-translate-y-0.5 hover:bg-brand-400 active:translate-y-0 active:duration-press";

export function LandingPage() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language;
  const isAuthed = useAuthStore((s) => !!s.accessToken);
  const primary = isAuthed
    ? { to: "/dashboard", label: t("landing.nav.dashboard") }
    : { to: "/register", label: t("landing.hero.primary") };

  return (
    <div className="min-h-screen overflow-x-hidden bg-surface text-ink">
      {/* Phần mở đầu trên nền tối */}
      <section className="bg-ink text-white">
        <header className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-4 py-6 sm:px-8">
          <Logo dark />
          <nav aria-label="Landing" className="hidden items-center gap-8 text-sm font-medium text-ink-muted md:flex">
            <a href="#how" className="transition-colors duration-hover hover:text-white">
              {t("landing.nav.how")}
            </a>
            <a href="#passport" className="transition-colors duration-hover hover:text-white">
              {t("landing.nav.passport")}
            </a>
            <a href="#periods" className="transition-colors duration-hover hover:text-white">
              {t("landing.nav.periods")}
            </a>
          </nav>
          <div className="flex items-center gap-4">
            <LanguageSwitch dark />
            {!isAuthed && (
              <Link to="/login" className="hidden text-sm font-semibold text-white hover:text-brand-300 sm:inline">
                {t("landing.nav.login")}
              </Link>
            )}
            <Link
              to={primary.to}
              className="whitespace-nowrap rounded-2xl bg-white px-4 py-2.5 text-sm font-bold text-ink transition-transform duration-hover ease-smooth hover:-translate-y-0.5"
            >
              {isAuthed ? primary.label : t("landing.nav.start")}
            </Link>
          </div>
        </header>

        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 pb-28 pt-12 sm:px-8 lg:grid-cols-[1.05fr_1fr] lg:pb-40 lg:pt-20">
          <div>
            <h1 className="max-w-[14ch] animate-fade-up text-5xl font-extrabold leading-[0.98] tracking-[-0.035em] [text-wrap:balance] sm:text-6xl lg:text-7xl">
              {t("landing.hero.title")}
            </h1>
            <p className="mt-8 max-w-xl animate-fade-up text-lg leading-relaxed text-ink-muted [animation-delay:90ms]">
              {t("landing.hero.subtitle")}
            </p>
            <div className="mt-10 flex animate-fade-up flex-wrap items-center gap-6 [animation-delay:180ms]">
              <Link to={primary.to} className={primaryBtn}>
                {primary.label}
              </Link>
              {!isAuthed && (
                <Link to="/login" className="text-base font-semibold text-white underline-offset-4 hover:underline">
                  {t("landing.hero.secondary")}
                </Link>
              )}
            </div>
          </div>
          <figure className="animate-fade-up [animation-delay:240ms]">
            <div className="aspect-[4/3] overflow-hidden rounded-[28px] bg-ink-700">
              <Suspense fallback={null}>
                <FactoryYard className="h-full w-full" label={t("landing.art.factory")} loadingLabel={t("landing.art.loading")} />
              </Suspense>
            </div>
            <figcaption className="mt-3 text-xs text-ink-muted">
              {t("landing.art.credit")}{" "}
              <a href="https://polyhaven.com" target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
                Poly Haven (CC0)
              </a>
            </figcaption>
          </figure>
        </div>
      </section>

      {/* Chứng từ → scope */}
      <section id="how" className="scroll-mt-6 bg-white py-28 lg:py-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <Reveal className="grid gap-x-16 gap-y-10 lg:grid-cols-2">
            <div>
            <h2 className="max-w-[16ch] text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] [text-wrap:balance] sm:text-5xl">
              {t("landing.docs.title")}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">{t("landing.docs.body")}</p>
            </div>
            <dl className="self-center">
              {DOC_ROWS.map((row, i) => (
                <div
                  key={row}
                  className={`flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 rounded-2xl px-5 py-4 ${i % 2 === 0 ? "bg-surface" : ""}`}
                >
                  <dt className="text-base font-bold">{t(`landing.docs.${row}`)}</dt>
                  <dd className="text-base text-slate-600">{t(`landing.docs.${row}Scope`)}</dd>
                </div>
              ))}
            </dl>
          </Reveal>

        </div>
      </section>

      {/* Trường màu: hộ chiếu xanh */}
      <section id="passport" className="scroll-mt-6 bg-brand-900 py-28 text-white lg:py-40">
        <div className="mx-auto grid max-w-7xl items-center gap-16 px-4 sm:px-8 lg:grid-cols-[1fr_1.1fr]">
          <Reveal className="order-last lg:order-first">
            <Photo photo={PHOTOS.solarRoof} lang={lang} dark aspect="aspect-[3/2]" className="[&_figcaption]:text-brand-100" />
          </Reveal>
          <Reveal delay={120}>
            <h2 className="max-w-[14ch] text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] [text-wrap:balance] sm:text-5xl">
              {t("landing.passport.title")}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-brand-100">{t("landing.passport.body")}</p>
          </Reveal>
        </div>
      </section>

      {/* Quản lý theo kỳ */}
      <section id="periods" className="scroll-mt-6 py-28 lg:py-40">
        <div className="mx-auto max-w-7xl px-4 sm:px-8">
          <Reveal>
            <h2 className="max-w-[18ch] text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] [text-wrap:balance] sm:text-5xl">
              {t("landing.periods.title")}
            </h2>
          </Reveal>
          <div className="mt-16 grid gap-x-12 gap-y-10 md:grid-cols-3">
            {PERIOD_POINTS.map((p, i) => (
              <Reveal key={p} delay={i * 80}>
                <h3 className="text-2xl font-bold">{t(`landing.periods.${p}t`)}</h3>
                <p className="mt-3 text-base leading-relaxed text-slate-600">{t(`landing.periods.${p}d`)}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Kêu gọi hành động */}
      <section className="bg-ink py-28 text-white lg:py-36">
        <Reveal className="mx-auto max-w-4xl px-4 text-center sm:px-8">
          <h2 className="mx-auto max-w-[20ch] text-4xl font-extrabold leading-[1.05] tracking-[-0.03em] [text-wrap:balance] sm:text-5xl">
            {t("landing.cta.title")}
          </h2>
          <p className="mx-auto mt-6 max-w-xl text-lg text-ink-muted">{t("landing.cta.subtitle")}</p>
          <div className="mt-10">
            <Link to={primary.to} className={primaryBtn}>
              {isAuthed ? primary.label : t("landing.cta.primary")}
            </Link>
          </div>
        </Reveal>
      </section>

      <footer className="bg-ink pb-10 text-ink-muted">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-4 px-4 sm:flex-row sm:items-center sm:px-8">
          <Logo dark />
          <p className="text-sm">
            © {new Date().getFullYear()} EcoTrace Global. {t("landing.footer.rights")}
          </p>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
