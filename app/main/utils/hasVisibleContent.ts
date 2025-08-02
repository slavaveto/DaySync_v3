// utils/hasVisibleContent.ts
export function hasVisibleContent(html: string | undefined): boolean {
    if (!html) return false;
    return (
        html
            .replace(/<[^>]*>/g, '')   // тэги
            .replace(/&nbsp;|\s+/g, '') // пробелы + &nbsp;
            .length > 0
    );
}