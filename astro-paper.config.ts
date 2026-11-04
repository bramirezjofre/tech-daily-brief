import { defineAstroPaperConfig } from "./src/types/config";

export default defineAstroPaperConfig({
  site: {
    url: "https://blog.bramirezj.dev",
    title: "Bitácora Tech",
    description: "Un resumen diario de lo más relevante en tecnología, Kubernetes, Nube y Seguridad.",
    author: "Bramirezj",
    profile: "https://github.com/bramirezjofre",
    ogImage: "default-og.jpg",
    lang: "es",
    timezone: "America/Santiago",
    dir: "ltr",
  },
  posts: {
    perPage: 10,
    perIndex: 10,
    scheduledPostMargin: 15 * 60 * 1000,
  },
  features: {
    lightAndDarkMode: true,
    dynamicOgImage: true,
    showArchives: true,
    showBackButton: true,
    editPost: {
      enabled: false,
    },
    search: "pagefind",
  },
  socials: [
    { name: "github",   url: "https://github.com/bramirezjofre" },
    { name: "x",        url: "https://x.com/brjofre" },
    { name: "linkedin", url: "https://www.linkedin.com/in/bernardino-ramirez" },
    { name: "mail",     url: "mailto:bramirezj@gmail.com" },
  ],
  shareLinks: [
    { name: "whatsapp", url: "https://wa.me/?text=" },
    { name: "x",        url: "https://x.com/intent/post?url=" },
    { name: "linkedin", url: "https://www.linkedin.com/shareArticle?mini=true&url=" },
    { name: "mail",     url: "mailto:?subject=Mira%20este%20post&body=" },
  ],
});
