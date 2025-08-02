function parseMinutes(time: string | undefined): number {
    if (!time) return 0;
    const [h, m] = time.split(":").map(Number);
    return h * 60 + m;
}

export const calculateMeetingPositions = (meetings: any[]) => {
    const meetingsWithPositions = meetings.map(meeting => ({
        ...meeting,
        startMin: parseMinutes(meeting.meeting_time_start),
        endMin: parseMinutes(meeting.meeting_time_end || meeting.meeting_time_start),
        column: 0,
        totalColumns: 1
    }));

    // Сортируем по времени начала
    meetingsWithPositions.sort((a, b) => a.startMin - b.startMin);

    // Находим перекрывающиеся встречи и назначаем колонки
    for (let i = 0; i < meetingsWithPositions.length; i++) {
        const current = meetingsWithPositions[i];
        const overlapping = [current];

        // Находим все встречи, которые перекрываются с текущей
        for (let j = 0; j < meetingsWithPositions.length; j++) {
            if (i !== j) {
                const other = meetingsWithPositions[j];
                // Проверяем РЕАЛЬНОЕ перекрытие (исключаем касания по краям)
                const hasOverlap = (
                    current.startMin < other.endMin && current.endMin > other.startMin
                );

                // Проверяем близость (в пределах 30 минут, но НЕ точное касание)
                const isClose = (
                    Math.abs(current.endMin - other.startMin) <= 30 ||
                    Math.abs(other.endMin - current.startMin) <= 30
                ) && (
                    current.endMin !== other.startMin && other.endMin !== current.startMin
                );

                // if (hasOverlap || isClose) {
                //     overlapping.push(other);
                // }

                // Только реальное перекрытие, без "близости"
                if (hasOverlap) {
                    overlapping.push(other);
                }
            }
        }

        // Если есть перекрытия, назначаем колонки
        if (overlapping.length > 1) {
            overlapping.forEach((meeting, index) => {
                meeting.column = index;
                meeting.totalColumns = overlapping.length;
            });
        }
    }

    return meetingsWithPositions;
};