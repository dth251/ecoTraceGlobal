import clsx from "clsx";

export interface PhotoSource {
  src: string;
  alt: { vi: string; en: string };
  author: string;
  license: string;
  page: string;
}

/** Ảnh thật từ Wikimedia Commons, giấy phép mở; mỗi ảnh ghi công tác giả ngay dưới ảnh */
export const PHOTOS = {
  workshop: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/To%C3%A0n_c%E1%BA%A3nh_x%C6%B0%E1%BB%9Fng_s%E1%BA%A3n_xu%E1%BA%A5t_T%E1%BA%A5m_Ch%E1%BB%8Bu_M%C3%B2n_D-Plate.jpg/1280px-To%C3%A0n_c%E1%BA%A3nh_x%C6%B0%E1%BB%9Fng_s%E1%BA%A3n_xu%E1%BA%A5t_T%E1%BA%A5m_Ch%E1%BB%8Bu_M%C3%B2n_D-Plate.jpg",
    alt: {
      vi: "Bên trong một xưởng sản xuất thép tấm ở Việt Nam, có cuộn thép và cầu trục",
      en: "Inside a steel plate workshop in Vietnam, with steel coils and an overhead crane",
    },
    author: "Ngovn",
    license: "CC BY-SA 4.0",
    page: "https://commons.wikimedia.org/wiki/File:To%C3%A0n_c%E1%BA%A3nh_x%C6%B0%E1%BB%9Fng_s%E1%BA%A3n_xu%E1%BA%A5t_T%E1%BA%A5m_Ch%E1%BB%8Bu_M%C3%B2n_D-Plate.jpg",
  },
  solarRoof: {
    src: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f4/USAID_Facilitates_Private_Sector_Investment_in_Solar_Energy_%2823877190788%29.jpg/1280px-USAID_Facilitates_Private_Sector_Investment_in_Solar_Energy_%2823877190788%29.jpg",
    alt: {
      vi: "Pin mặt trời lắp trên mái nhà xưởng ở Đồng Tháp",
      en: "Solar panels on a factory roof in Dong Thap, Vietnam",
    },
    author: "USAID Vietnam",
    license: "Public domain",
    page: "https://commons.wikimedia.org/wiki/File:USAID_Facilitates_Private_Sector_Investment_in_Solar_Energy_(23877190788).jpg",
  },
} satisfies Record<string, PhotoSource>;

export interface PhotoProps {
  photo: PhotoSource;
  lang: string;
  className?: string;
  /** Tỷ lệ khung ảnh, ví dụ "aspect-[4/3]" */
  aspect?: string;
  dark?: boolean;
  priority?: boolean;
}

export function Photo({ photo, lang, className, aspect = "aspect-[4/3]", dark = false, priority = false }: PhotoProps) {
  const alt = lang.startsWith("en") ? photo.alt.en : photo.alt.vi;
  return (
    <figure className={className}>
      <div className={clsx("overflow-hidden rounded-[28px]", aspect, dark ? "bg-ink-700" : "bg-slate-200")}>
        <img
          src={photo.src}
          alt={alt}
          loading={priority ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-[1200ms] ease-smooth hover:scale-[1.03]"
        />
      </div>
      <figcaption className={clsx("mt-3 text-xs", dark ? "text-ink-muted" : "text-slate-600")}>
        {lang.startsWith("en") ? "Photo" : "Ảnh"}:{" "}
        <a href={photo.page} target="_blank" rel="noreferrer" className="underline-offset-2 hover:underline">
          {photo.author}, {photo.license}, Wikimedia Commons
        </a>
      </figcaption>
    </figure>
  );
}
