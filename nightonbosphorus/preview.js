const lightbox = document.querySelector(".lightbox");
const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const turkish = document.documentElement.lang === "tr";
const enlargeLabel = turkish ? "Fotoğrafı büyüt: " : "Enlarge photo: ";
let stepPhoto;

lightbox.querySelectorAll("[data-step]").forEach((button) => {
  button.addEventListener("click", () => stepPhoto?.(Number(button.dataset.step)));
});
lightbox.addEventListener("keydown", (event) => {
  if (event.key === "ArrowLeft") stepPhoto?.(-1);
  if (event.key === "ArrowRight") stepPhoto?.(1);
});

document.querySelectorAll("[data-carousel]").forEach((carousel, carouselIndex) => {
  const gallery = photoGroups[carousel.dataset.carousel].map(([file, en, tr]) => [file, turkish ? tr : en]);
  const interval = 3800 + carouselIndex * 420;
  const track = carousel.querySelector(".gallery-track");
  const galleryCaption = carousel.querySelector(".gallery-caption");
  const galleryPosition = carousel.querySelector(".gallery-position");
  const photo = lightbox.querySelector("img");
  const photoCaption = lightbox.querySelector("figcaption");
  const position = lightbox.querySelector(".photo-position");

  let activeSlide = 0;
  let currentPhoto = 0;
  let hovered = false;
  let visible = false;
  let timer;
  let scrollFrame;

  const slides = gallery.map(([file, caption], index) => {
    const slide = index === 0 ? track.querySelector(".gallery-slide") : document.createElement("button");
    slide.className = "gallery-slide";
    slide.type = "button";
    slide.setAttribute("aria-label", enlargeLabel + caption);
    slide.tabIndex = index === 0 ? 0 : -1;

    if (index > 0) {
      const image = new Image();
      image.src = "media/" + file;
      image.alt = caption;
      image.loading = "lazy";
      image.decoding = "async";
      slide.append(image);
    }
    slide.addEventListener("click", () => {
      showPhoto(index);
      lightbox.showModal();
      stepPhoto = (step) => showPhoto(currentPhoto + step);
      scheduleAdvance();
    });
    return slide;
  });
  track.replaceChildren(...slides);

  function wrapIndex(index) {
    return (index + gallery.length) % gallery.length;
  }

  function formatPosition(index) {
    return String(index + 1).padStart(2, "0") + " / " + gallery.length;
  }

  function showPhoto(index) {
    currentPhoto = wrapIndex(index);
    const [file, caption] = gallery[currentPhoto];
    photo.src = "media/" + file;
    photo.alt = caption;
    photoCaption.textContent = caption;
    position.textContent = formatPosition(currentPhoto);
  }

  function updateCaption(index) {
    slides[activeSlide].tabIndex = -1;
    activeSlide = index;
    slides[activeSlide].tabIndex = 0;
    galleryPosition.textContent = formatPosition(index);
    galleryCaption.textContent = gallery[index][1];
  }

  function moveTo(index) {
    const target = wrapIndex(index);
    const wraps = Math.abs(target - activeSlide) > 1;
    track.scrollTo({
      left: slides[target].offsetLeft,
      behavior: reducedMotion.matches || wraps ? "instant" : "smooth",
    });
  }

  function scheduleAdvance() {
    clearTimeout(timer);
    if (!reducedMotion.matches && visible && !hovered && !carousel.querySelector(":focus-visible") && !document.hidden && !lightbox.open) {
      timer = setTimeout(() => {
        moveTo(activeSlide + 1);
        scheduleAdvance();
      }, interval);
    }
  }

  function navigateBy(step) {
    moveTo(activeSlide + step);
    scheduleAdvance();
  }

  track.addEventListener("scroll", () => {
    cancelAnimationFrame(scrollFrame);
    scrollFrame = requestAnimationFrame(() => {
      const index = Math.max(0, Math.min(gallery.length - 1, Math.round(track.scrollLeft / track.clientWidth)));
      if (index !== activeSlide) updateCaption(index);
    });
  }, { passive: true });

  carousel.addEventListener("pointerenter", (event) => {
    if (event.pointerType !== "mouse") return;
    hovered = true;
    scheduleAdvance();
  });
  carousel.addEventListener("pointerleave", () => {
    hovered = false;
    scheduleAdvance();
  });
  carousel.addEventListener("focusin", scheduleAdvance);
  carousel.addEventListener("focusout", () => queueMicrotask(scheduleAdvance));
  track.addEventListener("keydown", (event) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    navigateBy(event.key === "ArrowLeft" ? -1 : 1);
  });
  carousel.querySelectorAll("[data-gallery-step]").forEach((button) => {
    button.addEventListener("click", () => navigateBy(Number(button.dataset.galleryStep)));
  });

  lightbox.addEventListener("close", scheduleAdvance);

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    scheduleAdvance();
  }, { threshold: 0.25 }).observe(track);

  document.addEventListener("visibilitychange", scheduleAdvance);
  reducedMotion.addEventListener("change", scheduleAdvance);
  carousel.querySelector(".gallery-controls").hidden = false;
});
