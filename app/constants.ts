// constants.ts
import {useDndContext} from "@/app/context_dnd";
import {useMemo} from "react";

export const useConstants = () => {
    const {weeks} = useDndContext();

    return useMemo(() => {
        const DAY_START =
            weeks === 1 ? 7
            : weeks === 2 ? 8
                : weeks === 3 ? 8
                    : weeks === 5 ? 8
                        : 6












        const TIME_COL_WIDTH = 20
        return {
            DAY_START,






            TIME_COL_WIDTH
            // другие константы...
        };
    }, [weeks]);
};