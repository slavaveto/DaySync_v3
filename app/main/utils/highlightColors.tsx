

export type HighlightMode = "bold" | "red" | "both" | undefined;

/**
 * Возвращает CSS классы для элемента с учетом выделения
 */
export const highlightColors = (item: { is_highlighted?: HighlightMode }): string => {
    const highlightMode = item.is_highlighted;
    if (highlightMode === "bold") return "!font-semibold ";
    if (highlightMode === "red") return "!text-danger-500  dark:!font-medium ";
    if (highlightMode === "both") return "!text-danger-500  !font-semibold";
    return "";
};
