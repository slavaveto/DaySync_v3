import clsx from "clsx";
import {VerticalResizer} from "@/app/main/right_panel/VerticalResizer";
import {QuickNotes} from "@/app/main/QuickNotes";
import {ItemEditor} from "@/app/main/ItemEditor";
import {MonthInfo} from "@/app/main/MonthInfo";
import {ItemEditorMeeting} from "@/app/main/ItemEditorMeeting";
import {useMainContext} from "@/app/context";
import {useMiscTabContext} from "@/app/context_misc";


interface RightPanelProps {
    rightPanelWidth: number;
    topPanelHeight: number;
    isVerticalResizing: boolean;
    handleVerticalMouseDown: (e: React.MouseEvent) => void;
    verticalContainerRef: React.RefObject<HTMLDivElement | null>;
    selectedItem: any;
    setSelectedItem: (item: any) => void;
}

const RightPanel: React.FC<RightPanelProps> = ({
                                                   rightPanelWidth,
                                                   topPanelHeight,
                                                   isVerticalResizing,
                                                   handleVerticalMouseDown,
                                                   verticalContainerRef,
                                                   selectedItem,
                                                   setSelectedItem,
                                               }) => {
    const {
        clients, setClients, items, tabs, subtabs,

    } = useMainContext();
    const {activeMainTab, activeMiscTab, setActiveMainTab,
        setActiveMiscTab, selectedMonth, setSelectedMonth} = useMiscTabContext();

    return (

        <div
            className="flex flex-col h-screen"
            style={{width: `${rightPanelWidth}px`}}
            ref={verticalContainerRef}
        >
            <QuickNotes height={topPanelHeight}/>

            <VerticalResizer
                isResizing={isVerticalResizing}
                onMouseDown={handleVerticalMouseDown}
            />

            {/* Нижняя часть правой панели */}
            <div
                className={clsx("flex-1 overflow-auto",
                    selectedItem && "bg-primary-50/50",
                )}
            >
                {activeMainTab !== "misc" ? (
                    selectedItem ? (
                        selectedItem.type === "meeting" ? (
                            <ItemEditorMeeting
                                item={selectedItem}
                                onClose={() => setSelectedItem(null)}
                            />
                        ) : (
                            <ItemEditor
                                item={selectedItem}
                                onClose={() => setSelectedItem(null)}
                            />
                        )
                    ) : (
                        <div className="text-default-400 text-center mt-8">
                            Тут будет информация по выбранному дню...
                        </div>
                    )
                ) : (


                        <MonthInfo  />


                )}
            </div>
        </div>
    );
};

export default RightPanel;