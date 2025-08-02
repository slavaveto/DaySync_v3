import {useEffect} from 'react';

export const useCellSizeCalculation = (
        containerRef: React.RefObject<HTMLDivElement | null>,
        listHeight: number,
        weekDayRowHeight: number,
        WEEKS: number,
        setCellHeight: (height: number) => void,
        setHeightDifference: (diff: number) => void
    ) => {
        useEffect(() => {
            const compute = () => {
                if (!containerRef.current) return;

                const exactHeight = (listHeight - weekDayRowHeight) / WEEKS;
                const roundedHeight = Math.round(exactHeight);

                // добавляем к посл неделе разницу
                const totalExactHeight = listHeight - weekDayRowHeight;
                const totalRoundedHeight = roundedHeight * WEEKS;
                const heightDiff = totalExactHeight - totalRoundedHeight;

                // console.log(heightDiff)

                setCellHeight(roundedHeight);
                setHeightDifference(heightDiff);
            };

            compute();

            window.addEventListener('resize', compute);
            return () => {
                window.removeEventListener('resize', compute);
            };

        }, [listHeight, weekDayRowHeight, WEEKS, containerRef, setCellHeight, setHeightDifference]);
    }
;