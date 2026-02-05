/** Hash routing owns the URL fragment, so in-page links scroll with buttons instead of #anchors. */
export function scrollToSection(id: string): void {
    const section = document.getElementById(id);
    section?.scrollIntoView({ block: 'start', behavior: 'smooth' });
    section?.focus({ preventScroll: true });
}
